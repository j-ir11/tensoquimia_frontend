import React, { useState, useMemo } from 'react';
import useStore from '../../store/useStore';
import { FileStack, Loader2, FileDown, Search, CheckCircle2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const ReporteColectivoViewer = () => {
  // 1. Traemos tcActual del store para que la tabla sea reactiva
  const { productos, fetchReporteVersion, loadVersiones, tcActual } = useStore();
  
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reportes, setReportes] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Resolución del valor real del TC (por si viene como objeto o número)
  const currentTc = typeof tcActual === 'number' ? tcActual : (tcActual?.valor || 18.00);

  const piFiltered = useMemo(() => {
    return productos.filter(p => 
      p.tipo_producto === 'PI' && 
      (p.descripcion_producto.toLowerCase().includes(searchTerm.toLowerCase()) || 
       p.clave_producto.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [productos, searchTerm]);

  const toggleProducto = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const generarReporteColectivo = async () => {
    if (selectedIds.length === 0) return;
    setLoading(true);
    try {
      const dataAcumulada = [];
      for (const id of selectedIds) {
        const versiones = await loadVersiones(id);
        if (versiones && versiones.length > 0) {
          const ultimaVersion = versiones.sort((a, b) => b.numero_version - a.numero_version)[0];
          const detalle = await fetchReporteVersion(ultimaVersion.id_version);
          dataAcumulada.push(detalle);
        }
      }
      setReportes(dataAcumulada);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    const element = document.getElementById('reporte-colectivo-container');
    if (!element) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Resumen_Costos_TC_${currentTc.toFixed(2)}.pdf`);
    } catch (error) {
      console.error("Error PDF:", error);
    } finally {
      setIsExporting(false);
    }
  };

  // Función para obtener la fecha de emisión en formato estricto DD/MM/AAAA
  const getFormattedDate = () => {
    const hoy = new Date();
    const dia = String(hoy.getDate()).padStart(2, '0');
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const anio = hoy.getFullYear();
    return `${dia}/${mes}/${anio}`;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-black text-slate-800 uppercase italic flex items-center gap-3">
            <FileStack className="text-blue-500" /> Selección de Productos
          </h1>
          <div className="flex items-center gap-4">
            <div className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-3 py-1 rounded border border-emerald-100 uppercase italic">
              TC Actual: ${currentTc.toFixed(2)}
            </div>
            <div className="text-[10px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full uppercase">
              {selectedIds.length} Seleccionados
            </div>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="BUSCAR POR CLAVE O DESCRIPCIÓN..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold uppercase outline-none focus:ring-2 ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 sticky top-0 z-10 border-b">
                <tr className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  <th className="p-3 w-12 text-center">Sel.</th>
                  <th className="p-3 w-28">Clave</th>
                  <th className="p-3">Descripción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {piFiltered.map(p => (
                  <tr 
                    key={p.id_producto} 
                    onClick={() => toggleProducto(p.id_producto)}
                    className={`cursor-pointer transition-colors ${selectedIds.includes(p.id_producto) ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
                  >
                    <td className="p-3 text-center">
                      <div className={`w-5 h-5 mx-auto rounded flex items-center justify-center border-2 transition-all ${selectedIds.includes(p.id_producto) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'}`}>
                        {selectedIds.includes(p.id_producto) && <CheckCircle2 size={12} />}
                      </div>
                    </td>
                    <td className="p-3 font-mono text-[10px] font-bold text-slate-600">{p.clave_producto}</td>
                    <td className="p-3 text-[10px] font-black text-slate-700 uppercase">{p.descripcion_producto}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={generarReporteColectivo} 
            disabled={loading || selectedIds.length === 0} 
            className="bg-[#0f172a] text-white px-8 py-3 rounded-lg font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all disabled:opacity-50"
          >
            {loading ? 'Procesando...' : 'Ver Tabla Resumen'}
          </button>
          
          {reportes.length > 0 && (
            <button 
              onClick={downloadPDF} 
              disabled={isExporting} 
              className="bg-[#10b981] text-white px-8 py-3 rounded-lg font-black uppercase text-[10px] tracking-widest hover:bg-[#059669] transition-all"
            >
              {isExporting ? <Loader2 className="animate-spin" size={14}/> : <FileDown size={14} className="mr-2 inline"/>}
              {isExporting ? 'Generando PDF...' : 'Descargar PDF'}
            </button>
          )}
        </div>
      </div>

      {reportes.length > 0 && !loading && (
        <div className="bg-slate-200 p-8 overflow-x-auto">
          <div id="reporte-colectivo-container" className="bg-white p-[15mm] mx-auto w-[210mm] shadow-2xl relative">
            <style>{`
              .resumen-table { border: 2px solid black; width: 100%; border-collapse: collapse; }
              .resumen-table th, .resumen-table td { border: 1px solid black; padding: 12px 10px; font-size: 12px; color: black; }
              .header-gray { background-color: #f2f2f2 !important; font-weight: bold; text-align: center; text-transform: uppercase; }
              .bg-green-excel { background-color: #92d050 !important; font-weight: bold; }
            `}</style>

            <div className="flex justify-between items-start mb-6">
               {/* CONTENEDOR DE FECHA DE EMISIÓN (SUPERIOR IZQUIERDA) */}
               <div className="w-1/4 text-[10px] font-bold text-slate-600 uppercase pt-2">
                 Fecha de Emisión:<br />
                 <span className="font-mono text-xs">{getFormattedDate()}</span>
               </div>
               
               <h2 className="text-center font-bold text-lg uppercase flex-1 px-4">reporte de resumen de costos de productos</h2>
               
               <div className="text-[10px] font-bold border border-black p-2 text-right w-1/4">
                  TIPO DE CAMBIO APLICADO:<br/>
                  <span className="text-sm font-mono">${currentTc.toFixed(2)}</span>
               </div>
            </div>

            <table className="resumen-table">
              <thead>
                <tr>
                  <th className="header-gray w-40">Clave</th>
                  <th className="header-gray">Descripción</th>
                  <th className="header-gray w-44">Costo Final (M.N.)</th>
                  <th className="header-gray w-44">Costo Final (USD)</th>
                </tr>
              </thead>
              <tbody>
                {reportes.map((rep, idx) => {
                  const costoMN = Number(rep.master.costo_final);
                  const costoUSD = costoMN / currentTc;

                  return (
                    <tr key={idx}>
                      <td className="text-center font-bold">{rep.master.clave_producto}</td>
                      <td className="uppercase">{rep.master.descripcion_producto}</td>
                      <td className="text-right bg-green-excel font-bold">
                        $ {costoMN.toFixed(2)}
                      </td>
                      <td className="text-right font-bold">
                        $ {costoUSD.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            <p className="mt-10 text-[9px] font-bold italic text-slate-500 uppercase">
              * Nota: Los valores en USD están calculados dinámicamente con base en el tipo de cambio de simulación activo.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReporteColectivoViewer;