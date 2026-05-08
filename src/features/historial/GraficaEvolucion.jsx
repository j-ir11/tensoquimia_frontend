import React, { useState, useMemo } from 'react';
import useStore from '../../store/useStore';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { TrendingUp, Search, CheckCircle2, Circle, Info } from 'lucide-react';

const GraficaEvolucion = () => {
  const { productos, historialVersiones } = useStore();
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Filtrar lista de productos para el panel lateral
  const piList = useMemo(() => {
    return productos.filter(p => 
      (p.tipo_producto === 'PI' || p.tipo_producto === 'PT') &&
      (p.descripcion_producto.toLowerCase().includes(searchTerm.toLowerCase()) ||
       p.clave_producto.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [productos, searchTerm]);

  // 2. Procesamiento de datos para Recharts
  const chartData = useMemo(() => {
    if (selectedIds.length === 0 || !historialVersiones) return [];

    // Obtenemos todas las versiones de los productos seleccionados
    // Las ordenamos cronológicamente por ID de versión para no perder el orden real
    const versionesFiltradas = (historialVersiones || [])
      .filter(v => selectedIds.includes(v.id_producto))
      .sort((a, b) => a.id_version - b.id_version);

    // Creamos un punto por cada versión individual
    return versionesFiltradas.map(v => {
      const prod = productos.find(p => p.id_producto === v.id_producto);
      const fechaBase = new Date(v.fecha);
      const fechaFormateada = fechaBase.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' });

      return {
        // Label único: Versión + Fecha corta para el eje X
        label: `V${v.numero_version} (${fechaFormateada})`,
        // El valor para la línea específica del producto
        [prod.clave_producto]: Number(v.costo_final),
        // Datos extra para el Tooltip
        fullDate: fechaBase.toLocaleDateString(),
        tc: v.tc_valor,
        name: prod.clave_producto
      };
    });
  }, [selectedIds, historialVersiones, productos]);

  const toggleProducto = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Paleta de colores industriales
  const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <div className="space-y-6 animate-fade">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-xl font-black text-slate-800 uppercase italic flex items-center gap-3">
              <TrendingUp className="text-emerald-500" /> Evolución de Costos
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">
              Visualización cronológica de versiones guardadas
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* PANEL DE SELECCIÓN */}
          <div className="lg:col-span-1 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder="BUSCAR..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold uppercase outline-none focus:ring-2 ring-emerald-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="max-h-[450px] overflow-y-auto border border-slate-100 rounded-xl p-2 space-y-1 custom-scrollbar">
              {piList.map(p => (
                <button
                  key={p.id_producto}
                  onClick={() => toggleProducto(p.id_producto)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all border ${
                    selectedIds.includes(p.id_producto) 
                    ? 'bg-emerald-50 border-emerald-200 shadow-sm' 
                    : 'bg-white border-transparent hover:bg-slate-50'
                  }`}
                >
                  <div className={`shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    selectedIds.includes(p.id_producto) ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'
                  }`}>
                    {selectedIds.includes(p.id_producto) && <CheckCircle2 size={10} className="text-white"/>}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[10px] font-black text-slate-700 truncate">{p.clave_producto}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase truncate">{p.descripcion_producto}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* GRÁFICA */}
          <div className="lg:col-span-3 bg-slate-50 border border-slate-200 rounded-2xl p-6 relative">
            {selectedIds.length > 0 ? (
              <div className="w-full h-[450px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fontSize: 9, fontBold: '900' }} 
                      stroke="#64748b" 
                      dy={10}
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fontWeight: 'bold' }} 
                      stroke="#64748b" 
                      tickFormatter={(val) => `$${val}`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: 'none', 
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', 
                        fontSize: '11px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase'
                      }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      align="right"
                      iconType="circle"
                      wrapperStyle={{ paddingBottom: '30px', fontSize: '10px', fontWeight: '900' }} 
                    />
                    
                    {selectedIds.map((id, index) => {
                      const prod = productos.find(p => p.id_producto === id);
                      if (!prod) return null;
                      return (
                        <Line 
                          key={id}
                          type="monotone"
                          dataKey={prod.clave_producto}
                          name={prod.clave_producto}
                          stroke={colors[index % colors.length]}
                          strokeWidth={4}
                          dot={{ r: 5, strokeWidth: 2, fill: '#fff' }}
                          activeDot={{ r: 8, strokeWidth: 0 }}
                          connectNulls={true} // Muy importante si no todos los productos tienen versiones en las mismas fechas
                          animationDuration={1500}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                <div className="p-6 bg-white rounded-full shadow-inner">
                  <TrendingUp size={64} className="opacity-10" />
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] italic">Panel de Visualización</p>
                  <p className="text-[9px] font-bold text-slate-300">Selecciona uno o más productos del menú lateral</p>
                </div>
              </div>
            )}

            {/* NOTA TÉCNICA */}
            <div className="absolute bottom-4 right-6 flex items-center gap-2 text-[8px] font-black text-slate-400 uppercase italic">
              <Info size={12} /> Cada punto representa una versión guardada en el historial
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GraficaEvolucion;