import { create } from 'zustand';
import axios from 'axios';

const API_URL = 'https://tensoquimia-backend.vercel.app/api';

const useStore = create((set, get) => ({
  // --- ESTADO ---
  productos: [],
  historialVersiones: [],
  formulas: {}, // Cache de versiones por id_producto
  tcActual: 18.00,
  notification: null,
  
  // CONFIGURACIÓN DE API
  api: axios.create({ baseURL: API_URL }),

  // --- ACCIONES INICIALES (LIMPIA) ---
  initialize: async () => {
    try {
      // Ya no pedimos /metodos porque la tabla no existe
      const [prodsRes, tcRes] = await Promise.all([
        get().api.get('/productos'),
        get().api.get('/tipo-cambio/actual')
      ]);

      await get().loadHistorialCompleto(); 

      set({
        productos: prodsRes.data,
        tcActual: Number(tcRes.data?.valor) || 18.00
      });
    } catch (error) {
      get().setNotification({ 
        message: "Error de conexión con el servidor", 
        type: "error" 
      });
    }
  },

  // --- PRODUCTOS (MP / PI) ---
  addProducto: async (data) => {
    const res = await get().api.post('/productos', data);
    await get().initialize(); 
    return res.data;
  },

  updateProducto: async (id, data) => {
    await get().api.put(`/productos/${id}`, data);
    await get().initialize();
    get().setNotification({ message: "Producto actualizado", type: "success" });
  },

  deleteProducto: async (id) => {
    try {
      await get().api.delete(`/productos/${id}`);
      set(state => ({
        productos: state.productos.filter(p => p.id_producto !== id)
      }));
      get().setNotification({ message: "Producto eliminado", type: "success" });
    } catch (error) {
      get().setNotification({ 
        message: "No se puede eliminar: tiene fórmulas asociadas", 
        type: "error" 
      });
    }
  },

  // --- TIPO DE CAMBIO ---
  actualizarTipoCambio: async (valor) => {
    try {
      set({ notification: { message: "Actualizando precios masivamente...", type: "info" } });
      await get().api.post('/tipo-cambio/actualizar-masivo', { valor });
      await get().initialize();
      get().setNotification({ 
        message: `TC actualizado a $${valor}. Precios recalculados.`, 
        type: "success" 
      });
    } catch (error) {
      get().setNotification({ message: "Error en actualización masiva", type: "error" });
    }
  },

  // --- FÓRMULAS Y VERSIONES (ACTUALIZADAS) ---
  loadVersiones: async (id_producto) => {
    try {
      const res = await get().api.get(`/formulas/${id_producto}`);
      set(state => ({
        formulas: { ...state.formulas, [id_producto]: res.data }
      }));
      return res.data;
    } catch (error) {
      console.error("Error al cargar versiones:", error);
    }
  },

  loadHistorialCompleto: async () => {
    try {
      const res = await get().api.get('/formulas/historial/todos');
      set({ historialVersiones: res.data || [] });
    } catch (error) {
      console.error("Error al cargar historial:", error);
      set({ historialVersiones: [] });
    }
  },

  createVersionFormula: async (data) => {
    try {
      // Enviamos el payload tal cual viene del FormulaEditor 
      // (incluyendo nombre_proceso y factor_proceso manuales)
      const res = await get().api.post('/formulas', data);
      
      await get().loadVersiones(data.id_producto);
      await get().initialize(); // Para actualizar los costos de los productos PI
      
      get().setNotification({ 
        message: "Versión v" + res.data.numero_version + " guardada exitosamente", 
        type: "success" 
      });
      return res.data;
    } catch (error) {
      get().setNotification({ message: "Error al guardar la nueva receta", type: "error" });
      throw error;
    }
  },

  getUltimosIngredientes: async (id_producto) => {
    try {
      const resVersion = await get().api.get(`/formulas/${id_producto}/ultima`);
      const ultimaVersion = resVersion.data;
      if (!ultimaVersion) return null;

      const resIngredientes = await get().api.get(`/formulas/version/${ultimaVersion.id_version}/ingredientes`);
      return {
        version: ultimaVersion,
        ingredientes: resIngredientes.data
      };
    } catch (error) {
      console.error("Error al cargar formula previa:", error);
      return null;
    }
  },

  actualizarVersionActual: async (data) => {
    try {
      // Sobrescribe los datos de la última versión incluyendo los campos de proceso
      const res = await get().api.put(`/formulas/${data.id_producto}`, data);
      await get().initialize(); 
      get().setNotification({ 
        message: "Fórmula corregida y costo actualizado", 
        type: "success" 
      });
      return res.data;
    } catch (error) {
      get().setNotification({ message: "Error al actualizar la fórmula", type: "error" });
      throw error;
    }
  },

  fetchReporteVersion: async (id_version) => {
    try {
      const res = await get().api.get(`/formulas/reporte/${id_version}`);
      return res.data;
    } catch (error) {
      console.error("Error al obtener reporte:", error);
      return null;
    }
  },

  // --- MOTOR DE COSTOS (HELPER) ---
  getCostosBatch: async (ids) => {
    try {
      const promesas = ids.map(id => get().api.get(`/productos/costo/${id}`));
      const resultados = await Promise.all(promesas);
      return resultados.reduce((acc, res) => {
        acc[res.data.id_producto] = res.data.costo_calculado;
        return acc;
      }, {});
    } catch (error) {
      console.error("Error en el batch de costos:", error);
      return {};
    }
  },

  // --- NOTIFICACIONES ---
  setNotification: (notification) => set({ notification }),
  clearNotification: () => set({ notification: null }),
}));

export default useStore;