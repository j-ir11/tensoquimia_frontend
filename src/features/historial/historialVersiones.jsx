import React, { useState, useMemo, useEffect } from 'react';
import useStore from '../../store/useStore';
import { History, Search, Loader2, Calendar, TrendingUp, FileSpreadsheet } from 'lucide-react';
// 🔥 Importamos la librería para Excel
import * as XLSX from 'xlsx';

const HistorialVersiones = () => {
  const { productos, historialVersiones, loadHistorialCompleto } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingExcel, setLoadingExcel] = useState(false);

  useEffect(() => {
    loadHistorialCompleto();
  }, [loadHistorialCompleto]);

  const tablaHistorial = useMemo(() => {
    if (!productos || !historialVersiones) return [];
    const productosBase = productos.filter(p => p.tipo_producto === 'PI' || p.tipo_producto === 'PT');

    const data = productosBase.map(prod => {
      const versionesDelProducto = (historialVersiones || [])
        .filter(v => v.id_producto === prod.id_producto)
        .sort((a, b) => a.numero_version - b.numero_version);

      return {
        id: prod.id_producto,
        clave: prod.clave_producto,
        descripcion: prod.descripcion_producto,
        versiones: versionesDelProducto
      };
    });

    return data.filter(item => 
      item.clave.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [productos, historialVersiones, searchTerm]);

  const maxVersiones = useMemo(() => {
    return Math.max(0, ...tablaHistorial.map(item => item.versiones.length));
  }, [tablaHistorial]);

  // 🔥 FUNCIÓN PARA DESCARGAR EXCEL
  const descargarExcel = () => {
    setLoadingExcel(true);
    try {
      // 1. Crear los encabezados dinámicos
      const headers = ["CLAVE", "DESCRIPCIÓN"];
      for (let i = 1; i <= maxVersiones; i++) {
        headers.push(`VERSIÓN ${i}`);
      }

      // 2. Transformar los datos de la tabla al formato de filas de Excel
      const filasExcel = tablaHistorial.map(item => {
        const fila = {
          "CLAVE": item.clave,
          "DESCRIPCIÓN": item.descripcion
        };

        // Añadir cada versión disponible
        item.versiones.forEach((v, index) => {
          const fecha = new Date(v.fecha).toLocaleDateString();
          const costo = Number(v.costo_final).toFixed(2);
          const tc = Number(v.tc_valor).toFixed(2);
          
          // Formato de celda: Fecha | Costo | TC
          fila[`VERSIÓN ${index + 1}`] = `${fecha} - $${costo} (TC: ${tc})`;
        });

        return fila;
      });

      // 3. Generar el libro y la hoja
      const worksheet = XLSX.utils.json_to_sheet(filasExcel, { header: headers });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Historial de Versiones");

      // Ajustar ancho de columnas automáticamente
      const wscols = [{ wch: 15 }, { wch: 40 }];
      for (let i = 0; i < maxVersiones; i++) wscols.push({ wch: 30 });
      worksheet['!cols'] = wscols;

      // 4. Descargar el archivo
      XLSX.writeFile(workbook, `Historial_Versiones_Tensoquimia_${new Date().toLocaleDateString()}.xlsx`);
    } catch (error) {
      console.error("Error al generar Excel:", error);
    } finally {
      setLoadingExcel(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-black text-slate-800 uppercase italic flex items-center gap-3">
              <History className="text-emerald-500" /> Historial de Versiones
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* BOTÓN DE EXCEL */}
            <button
              onClick={descargarExcel}
              disabled={tablaHistorial.length === 0 || loadingExcel}
              className="flex items-center gap-2 bg-[#10b981] text-white px-4 py-2 rounded-lg font-black uppercase text-[10px] tracking-widest hover:bg-[#059669] transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
            >
              {loadingExcel ? <Loader2 className="animate-spin" size={14} /> : <FileSpreadsheet size={14} />}
              Exportar Excel
            </button>

            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="BUSCAR..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold uppercase outline-none focus:ring-2 ring-emerald-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* CONTENEDOR CON SCROLL (Tu tabla actual) */}
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-inner">
          <div className="overflow-x-auto overflow-y-hidden custom-scrollbar">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#0f172a] text-white">
                  <th className="p-4 text-left text-[10px] font-black uppercase sticky left-0 z-30 bg-[#0f172a] min-w-[120px]">Clave</th>
                  <th className="p-4 text-left text-[10px] font-black uppercase sticky left-[120px] z-30 bg-[#0f172a] min-w-[250px] border-r border-slate-700 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">Descripción</th>
                  {Array.from({ length: maxVersiones }).map((_, i) => (
                    <th key={i} className="p-4 text-center text-[10px] font-black uppercase tracking-widest min-w-[180px] border-l border-slate-700 bg-slate-800">V{i + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {tablaHistorial.map((prod) => (
                  <tr key={prod.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-mono text-[11px] font-bold text-slate-600 bg-white sticky left-0 z-20 group-hover:bg-slate-50">{prod.clave}</td>
                    <td className="p-4 text-[10px] font-black text-slate-800 uppercase bg-white sticky left-[120px] z-20 group-hover:bg-slate-50 border-r shadow-[2px_0_5px_rgba(0,0,0,0.05)]">{prod.descripcion}</td>
                    {Array.from({ length: maxVersiones }).map((_, i) => {
                      const v = prod.versiones[i];
                      return (
                        <td key={i} className="p-5 border-l border-slate-100 text-center">
                          {v ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-center gap-1 text-[9px] font-bold text-slate-400">
                                <Calendar size={10} /> {new Date(v.fecha).toLocaleDateString()}
                              </div>
                              <div className="bg-emerald-50 text-emerald-700 py-2 px-3 rounded-lg border border-emerald-100 font-black text-[12px]">
                                ${Number(v.costo_final).toFixed(2)}
                              </div>
                              <div className="text-[9px] font-bold text-blue-500 bg-blue-50 py-1 px-2 rounded-full inline-flex items-center gap-1">
                                <TrendingUp size={10} /> TC: ${Number(v.tc_valor).toFixed(2)}
                              </div>
                            </div>
                          ) : ( <span className="text-slate-200">—</span> )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistorialVersiones;