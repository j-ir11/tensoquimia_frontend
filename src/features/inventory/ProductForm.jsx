import { useState, useEffect } from 'react';
import useStore from '../../store/useStore';
import { Save, ArrowLeft, DollarSign, Activity, AlertCircle, X } from 'lucide-react';

const ProductForm = ({ mode = 'create', initialData = null, onCancel }) => {
  const { addProducto, updateProducto, productos } = useStore();

  const [formData, setFormData] = useState({
    clave_producto: '',
    descripcion_producto: '',
    tipo_producto: 'MP',
    unidad_producto: 'kg',
    familia_producto: '',
    costo: '', // Lo inicializamos vacío para que no estorbe el 0
    moneda: 'MXN',
  });

  const [loading, setLoading] = useState(false);
  const [errorToast, setErrorToast] = useState(null); // Estado para nuestra alerta personalizada

  // Función de redondeo estricto basado en el tercer decimal (>= 0.005 sube, < 0.005 baja)
  const redondearCosto = (valor) => {
    const num = parseFloat(valor);
    if (isNaN(num) || num < 0) return '';
    
    // Multiplicamos por 100 para trabajar con la parte entera de los dos primeros decimales
    const multiplicado = num * 100;
    const parteEntera = Math.floor(multiplicado);
    const residuoDecimal = multiplicado - parteEntera;

    // 0.5 en esta escala equivale exactamente a 0.005 en la escala original
    // Si el residuo es mayor o igual a 0.4999 (tolerancia de punto flotante para 0.5), sumamos 1 para subir
    if (residuoDecimal >= 0.49999) {
      return ((parteEntera + 1) / 100).toFixed(2);
    } else {
      return (parteEntera / 100).toFixed(2);
    }
  };

  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setFormData({
        clave_producto: initialData.clave_producto || '',
        descripcion_producto: initialData.descripcion_producto || '',
        tipo_producto: initialData.tipo_producto || 'MP',
        unidad_producto: initialData.unidad_producto || 'kg',
        familia_producto: initialData.familia_producto || '',
        costo: initialData.costo ? redondearCosto(initialData.costo) : '', // <-- Aplica el nuevo redondeo estricto al cargar
        moneda: initialData.moneda || 'MXN',
      });
    }
  }, [mode, initialData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const upperValue = ['clave_producto', 'descripcion_producto', 'familia_producto'].includes(name) 
      ? value.toUpperCase() 
      : value;
    
    setFormData(prev => ({ ...prev, [name]: upperValue }));
  };

  // Controla el formateo estricto cuando el usuario deja de escribir en el input
  const handleCostoBlur = () => {
    const costoFormateado = redondearCosto(formData.costo);
    setFormData(prev => ({ ...prev, costo: costoFormateado }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const claveAValidar = formData.clave_producto.trim().toUpperCase();

    // VALIDACIÓN CON ALERTA DE INTERFAZ
    if (mode === 'create') {
      const existe = productos.find(p => p.clave_producto.toUpperCase() === claveAValidar);
      if (existe) {
        setErrorToast(`El código "${claveAValidar}" ya está registrado en el sistema.`);
        return;
      }
    }

    setLoading(true);
    try {
      // Aseguramos que el costo enviado numéricamente pase por la misma función estricta de redondeo
      const costoFinalValido = formData.costo !== '' ? parseFloat(redondearCosto(formData.costo)) : 0;
      const dataToSend = { ...formData, costo: costoFinalValido };
      
      if (mode === 'create') {
        await addProducto(dataToSend);
      } else {
        await updateProducto(initialData.id_producto, dataToSend);
      }
      onCancel();
    } catch (error) {
      setErrorToast('Error de conexión con el servidor. Intente más tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6 animate-fade relative">
      
      {/* ALERTA PERSONALIZADA (TOAST) */}
      {errorToast && (
        <div className="fixed top-10 right-10 z-50 animate-in slide-in-from-right duration-300">
          <div className="bg-red-600 text-white px-6 py-4 rounded-lg shadow-2xl border-l-8 border-red-800 flex items-center gap-4">
            <AlertCircle size={24} />
            <div>
              <p className="text-[10px] uppercase font-black opacity-80">Error de Registro</p>
              <p className="text-sm font-bold">{errorToast}</p>
            </div>
            <button onClick={() => setErrorToast(null)} className="ml-4 hover:bg-red-700 p-1 rounded">
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-slate-300 pb-4">
        <h1 className="text-xl font-black text-slate-800 uppercase tracking-widest italic">
          {mode === 'edit' ? 'Actualización de Ficha' : 'Nuevo Registro Técnico'}
        </h1>
        <button onClick={onCancel} className="text-xs font-black text-slate-400 hover:text-slate-800 flex items-center gap-2 transition-colors">
          <ArrowLeft size={16}/> Volver
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 shadow-xl rounded flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-200 overflow-hidden">
        
        <div className="flex-1 p-8 space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-emerald-500"></div>
            <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em]">Identificación Base</h3>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nombre del Insumo / Producto</label>
              <input name="descripcion_producto" required className="w-full bg-slate-50 border border-slate-300 p-3 text-xs font-bold uppercase outline-none focus:border-emerald-500 rounded" value={formData.descripcion_producto} onChange={handleInputChange} />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Código Interno</label>
                <input name="clave_producto" required className="w-full bg-slate-50 border border-slate-300 p-3 text-xs font-mono font-bold uppercase outline-none focus:border-emerald-500 rounded" value={formData.clave_producto} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Familia Química</label>
                <input name="familia_producto" className="w-full bg-slate-50 border border-slate-300 p-3 text-xs font-bold uppercase outline-none focus:border-emerald-500 rounded" value={formData.familia_producto} onChange={handleInputChange} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tipo de Registro</label>
                <select name="tipo_producto" className="w-full bg-white border border-slate-300 p-3 text-xs font-bold uppercase outline-none rounded" value={formData.tipo_producto} onChange={handleInputChange}>
                  <option value="MP">MATERIA PRIMA (MP)</option>
                  <option value="PI">PRODUCTO INTERMEDIO (PI)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Unidad de Medida</label>
                <select name="unidad_producto" className="w-full bg-white border border-slate-300 p-3 text-xs font-bold uppercase outline-none rounded" value={formData.unidad_producto} onChange={handleInputChange}>
                  <option value="kg">kg</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full md:w-80 p-8 bg-slate-50/50 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-indigo-500"></div>
            <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em]">Valores Económicos</h3>
          </div>

          {formData.tipo_producto === 'MP' ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-white p-4 rounded border-2 border-emerald-100 shadow-sm">
                <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Costo Adquisición</label>
                <div className="relative mt-2">
                  <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 text-emerald-300" size={18}/>
                  <input 
                    type="number" 
                    step="0.001" // <-- Permitimos la entrada de tres decimales en el teclado para que evalúe el tercer dígito
                    name="costo" 
                    placeholder="0.00" 
                    className="w-full border-b-2 border-slate-200 p-2 text-xl font-mono font-black text-slate-800 outline-none focus:border-emerald-500 text-right bg-transparent" 
                    value={formData.costo} 
                    onChange={(e) => setFormData({...formData, costo: e.target.value})} 
                    onBlur={handleCostoBlur} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Divisa de Compra</label>
                <select name="moneda" className="w-full bg-white border border-slate-300 p-3 text-xs font-bold outline-none rounded" value={formData.moneda} onChange={handleInputChange}>
                  <option value="MXN">MXN</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="bg-[#0f172a] p-6 rounded-xl border-b-4 border-indigo-500 shadow-xl text-center">
                <Activity size={32} className="mx-auto text-indigo-400 mb-4 animate-pulse" />
                <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest leading-relaxed">
                  El costo de este producto se define en el apartado de:
                </p>
                <p className="text-sm font-black text-white uppercase italic mt-2 underline decoration-indigo-400">
                  Formulación y Síntesis
                </p>
              </div>
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full bg-slate-900 text-emerald-400 py-5 font-black uppercase text-[10px] tracking-[0.4em] hover:bg-black disabled:opacity-50 transition-all flex items-center justify-center gap-3 mt-10 shadow-lg border border-emerald-950 rounded">
            <Save size={18} /> 
            {loading ? 'Procesando...' : mode === 'edit' ? 'Actualizar Ficha' : 'Guardar Registro'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;