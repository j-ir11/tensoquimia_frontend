import React, { useState, useEffect, useMemo } from 'react';
import useStore from '../../store/useStore';
import { FileText, Loader2, FileDown, Search } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const ReporteIndividualViewer = () => {
  const { productos, fetchReporteVersion, loadVersiones } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [versiones, setVersiones] = useState([]);
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Filtrado dinámico de la lista de productos
  const piList = useMemo(() => {
    return productos.filter(p => {
      const cumpleTipo = p.tipo_producto === 'PI';
      if (!searchTerm) return cumpleTipo;

      const term = searchTerm.toLowerCase();
      const cumpleClave = p.clave_producto?.toLowerCase().includes(term);
      const cumpleDescripcion = p.descripcion_producto?.toLowerCase().includes(term);

      return cumpleTipo && (cumpleClave || cumpleDescripcion);
    });
  }, [productos, searchTerm]);

  // Autoselección cuando queda exactamente 1 resultado
  useEffect(() => {
    if (piList.length === 1) {
      setSelectedProductId(piList[0].id_producto);
    } else if (piList.length === 0) {
      setSelectedProductId('');
    }
  }, [piList]);

  useEffect(() => {
    const getVersions = async () => {
      if (selectedProductId) {
        const data = await loadVersiones(selectedProductId);
        setVersiones(data || []);
      } else {
        setVersiones([]);
        setSelectedVersionId('');
        setReportData(null);
      }
    };
    getVersions();
  }, [selectedProductId, loadVersiones]);

  useEffect(() => {
    const getFullReport = async () => {
      if (selectedVersionId) {
        setLoading(true);
        const data = await fetchReporteVersion(selectedVersionId);
        setReportData(data);
        setLoading(false);
      } else {
        setReportData(null);
      }
    };
    getFullReport();
  }, [selectedVersionId, fetchReporteVersion]);

  const downloadPDF = async () => {
    const element = document.getElementById('reporte-tecnico');
    if (!element) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById('reporte-tecnico');
          el.style.fontFamily = 'Arial, sans-serif';
        }
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      const positionY = Math.max(0, (pdfHeight - imgHeight) / 2);

      pdf.addImage(imgData, 'PNG', 0, positionY, pdfWidth, imgHeight);
      pdf.save(`Reporte_Operaciones_${reportData.master.clave_producto}.pdf`);
    } catch (error) {
      console.error("Error al generar PDF:", error);
      alert("Hubo un error al generar el archivo. Verifica la consola.");
    } finally {
      setIsExporting(false);
    }
  };

  // Función interna para asegurar el formato estricto dd/mm/aaaa
  const getFormattedDate = () => {
    const hoy = new Date();
    const dia = String(hoy.getDate()).padStart(2, '0');
    const mes = String(hoy.getMonth() + 1).padStart(2, '0'); // Los meses van de 0 a 11
    const anio = hoy.getFullYear();
    return `${dia}/${mes}/${anio}`;
  };

  return (
    <div className="space-y-6">
      {/* PANEL DE SELECCIÓN */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm print:hidden">
        <h1 className="text-xl font-black text-slate-800 uppercase italic mb-6 flex items-center gap-3">
          <FileText className="text-emerald-500" /> Generador de Documentación Técnica
        </h1>
        
        {/* BARRA DE BÚSQUEDA */}
        <div className="mb-4 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            className="w-full pl-10 p-3 border border-slate-300 rounded-xl font-bold text-xs uppercase outline-none focus:ring-2 ring-emerald-500"
            placeholder="Buscar producto por nombre o clave..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select 
            className="p-3 border border-slate-300 rounded-xl font-bold text-xs uppercase outline-none focus:ring-2 ring-emerald-500"
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
          >
            <option value="">-- SELECCIONAR PRODUCTO ({piList.length} encontrados) --</option>
            {piList.map(p => (
              <option key={p.id_producto} value={p.id_producto}>
                {p.clave_producto} - {p.descripcion_producto}
              </option>
            ))}
          </select>

          <select 
            className="p-3 border border-slate-300 rounded-xl font-bold text-xs disabled:opacity-50 outline-none focus:ring-2 ring-emerald-500"
            value={selectedVersionId}
            onChange={(e) => setSelectedVersionId(e.target.value)}
            disabled={!selectedProductId}
          >
            <option value="">-- SELECCIONAR VERSIÓN --</option>
            {versiones.map(v => <option key={v.id_version} value={v.id_version}>v{v.numero_version} - {new Date(v.fecha).toLocaleDateString()}</option>)}
          </select>
        </div>
        
        {reportData && (
          <div className="mt-6">
            <button 
              onClick={downloadPDF} 
              disabled={isExporting}
              className="flex items-center gap-3 bg-[#10b981] text-white px-8 py-4 rounded-xl font-black uppercase text-xs tracking-[0.2em] hover:bg-[#059669] transition-all shadow-xl shadow-emerald-100 disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="animate-spin" size={18}/> : <FileDown size={18} />}
              {isExporting ? 'Procesando Documento...' : 'Descargar Tabla de Operaciones (PDF)'}
            </button>
          </div>
        )}
      </div>

      {loading && <div className="flex justify-center p-20"><Loader2 className="animate-spin text-slate-400" size={40}/></div>}

      {/* ÁREA DE REPORTE */}
      {reportData && !loading && (
        <div className="bg-slate-200 p-10 overflow-x-auto">
          <div 
            id="reporte-tecnico" 
            className="bg-white p-[15mm] mx-auto w-[297mm] shadow-2xl"
            style={{ color: '#000000', backgroundColor: '#ffffff' }}
          >
            <style>{`
              .excel-table { border: 2px solid #000000; width: 100%; border-collapse: collapse; }
              .excel-table th, .excel-table td { border: 1px solid #000000; padding: 6px 8px; font-size: 11px; color: #000000 !important; }
              .excel-table th { font-weight: bold; background-color: #ffffff; }
              .bg-gray-excel { background-color: #f2f2f2 !important; }
              .bg-green-excel { background-color: #92d050 !important; }
              .text-blue-excel { color: #1e40af !important; }
              .text-red-excel { color: #991b1b !important; }
              .text-emerald-excel { color: #065f46 !important; }
            `}</style>

            <div className="space-y-4 font-sans relative">
              {/* FECHA DEL DÍA EN LA PARTE SUPERIOR IZQUIERDA FORMATEADA DD/MM/AAAA */}
              <div className="absolute top-0 left-0 text-[10px] font-bold text-slate-600 uppercase">
                Fecha de Emisión: {getFormattedDate()}
              </div>

              <h2 className="text-center font-bold text-sm uppercase mb-6" style={{ color: '#000' }}>
                Tabla de Operaciones por Producto
              </h2>

              <div className="flex justify-end items-center gap-4 text-[11px] font-bold">
                <span>TIPO DE CAMBIO</span>
                <div className="border border-black px-4 py-1 w-24 text-center">$ {Number(reportData.master.tc_valor).toFixed(2)}</div>
              </div>

              <div className="flex items-stretch text-[12px] font-bold">
                <div className="border-2 border-black p-2 w-28 text-center">{reportData.master.clave_producto}</div>
                <div className="border-2 border-black border-l-0 p-2 flex-1 uppercase">{reportData.master.descripcion_producto}</div>
                <div className="border-2 border-black border-l-0 bg-green-excel p-2 w-16 text-center">$</div>
                <div className="border-2 border-black border-l-0 bg-green-excel p-2 w-28 text-right">
                  {Number(reportData.master.costo_final).toFixed(2)}
                </div>
                <div className="border-2 border-black border-l-0 bg-gray-excel p-2 w-10 text-center text-[10px]">M.N</div>
                <div className="border-2 border-black border-l-0 bg-gray-excel p-2 w-24 text-right">
                  $ {Number(reportData.master.costo_final / (reportData.master.tc_valor || 1)).toFixed(2)}
                </div>
                <div className="border-2 border-black border-l-0 bg-gray-excel p-2 w-10 text-center text-[10px]">USD</div>
              </div>

              <table className="excel-table">
                <thead>
                  <tr>
                    <th className="w-24">Clave</th>
                    <th className="w-24 text-center">Porcentaje</th>
                    <th>Descripción</th>
                    <th className="w-24">Costo</th>
                    <th className="w-16">Moneda</th>
                    <th className="w-24">Costo Pesos</th>
                    <th className="w-28 bg-gray-excel text-center">Costo Final M.N</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.ingredientes.map((ing, idx) => {
                    const porc = Number(ing.porcentaje) || 0;
                    const cBase = Number(ing.costo_base_unitario) || 0;
                    const tc = Number(reportData.master.tc_valor) || 1;
                    const cPesos = ing.moneda_base === 'USD' ? cBase * tc : cBase;
                    const cFinal = cPesos * (porc / 100);

                    return (
                      <tr key={idx}>
                        <td className="text-center font-mono">{ing.clave_producto}</td>
                        <td className="text-center font-bold">{porc.toFixed(2)}%</td>
                        <td className="uppercase">{ing.descripcion_producto}</td>
                        <td className="text-right">$ {cBase.toFixed(2)}</td>
                        <td className="text-center">{ing.moneda_base}</td>
                        <td className="text-right" style={ing.moneda_base === 'USD' ? { color: '#059669', fontWeight: 'bold' } : {}}>
                          $ {cPesos.toFixed(2)}
                        </td>
                        <td className="text-right font-bold bg-gray-excel">$ {cFinal.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="flex justify-end pt-2">
                <div className="w-[480px]">
                  <table className="excel-table border-t-0">
                    <tbody>
                      <tr>
                        <td className="text-right font-bold uppercase w-48">Total %</td>
                        <td className="text-center font-bold w-24">100.00%</td>
                        <td className="bg-gray-excel font-bold text-center w-24 uppercase">Costo</td>
                        <td className="text-right font-bold w-12 text-[9px]">M.N.</td>
                        <td className="text-right font-bold w-24">
                          $ {Number(reportData.master.costo_final - reportData.master.factor_proceso).toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={2} className="border-0"></td>
                        <td className="bg-gray-excel font-bold text-center italic text-blue-excel font-black">FP</td>
                        <td className="text-right font-bold text-[9px] text-blue-excel">$</td>
                        <td className="text-right font-bold text-blue-excel underline">
                          {Number(reportData.master.factor_proceso || 0).toFixed(2)}
                        </td>
                      </tr>
                      <tr className="border-t-2 border-black">
                        <td colSpan={2} className="border-0"></td>
                        <td className="bg-gray-excel font-bold text-center uppercase font-black">Costo Total</td>
                        <td className="text-right font-bold text-[9px]">M.N.</td>
                        <td className="text-right font-bold text-sm">$ {Number(reportData.master.costo_final).toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-8 text-[9px] font-bold space-y-1">
                <p className="text-emerald-excel uppercase">EN USD - SE MULTIPLICA TC POR COSTO MP</p>
                <p className="text-red-excel uppercase italic">ESTE COSTO (PESOS) SE MULTIPLICA POR EL PORCENTAJE</p>
                <p className="pt-6 text-blue-excel font-black italic text-[11px] uppercase tracking-wider">*FP= FACTOR DE PRODUCCIÓN</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReporteIndividualViewer;