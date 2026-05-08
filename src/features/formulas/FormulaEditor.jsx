import React, { useState, useEffect, useMemo } from 'react';
import useStore from '../../store/useStore';
import { 
  ArrowLeft, Search, PlusCircle, Trash2, 
  Database, AlertTriangle, Zap, RefreshCw, Beaker, Edit3
} from 'lucide-react';

const FormulaEditor = () => {
  const {
    productos,
    createVersionFormula,
    getUltimosIngredientes,
    getCostosBatch,
    tcActual,
    actualizarVersionActual
  } = useStore();

  // --- Estados de Sesión ---
  const [target, setTarget] = useState(null);
  const [recipe, setRecipe] = useState([]);
  const [query, setQuery] = useState('');
  const [labSearch, setLabSearch] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [costosIngredientes, setCostosIngredientes] = useState({});

  // --- NUEVOS ESTADOS DE PROCESO (Cápsula del tiempo) ---
  const [nombreProceso, setNombreProceso] = useState('NINGUNO');
  const [localFP, setLocalFP] = useState(0);
  const [esManual, setEsManual] = useState(false);

  // --- Carga de Datos al Seleccionar Target ---
  useEffect(() => {
    const loadPrev = async () => {
      if (target) {
        const data = await getUltimosIngredientes(target.id_producto);
        
        if (data && data.version) {
          // 1. Cargar Receta
          if (data.ingredientes) {
            setRecipe(data.ingredientes.map(ing => ({
              id_componente: ing.id_componente,
              porcentaje: ing.porcentaje
            })));
          }
          
          // 2. Cargar Proceso y Factor de la versión
          const nProc = data.version.nombre_proceso || 'NINGUNO';
          const fProc = parseFloat(data.version.factor_proceso) || 0;
          
          setNombreProceso(nProc);
          setLocalFP(fProc);
          
          // 3. Detectar si es un valor predefinido o manual
          const predefinidos = { 'CALOR': 0.5, 'FRIO': 0.3, 'NINGUNO': 0 };
          if (!predefinidos[nProc.toUpperCase()] || predefinidos[nProc.toUpperCase()] !== fProc) {
            setEsManual(true);
          } else {
            setEsManual(false);
          }
        } else {
          // Reset total para productos sin fórmulas previas
          setRecipe([]);
          setNombreProceso('NINGUNO');
          setLocalFP(0);
          setEsManual(false);
        }
      }
    };
    loadPrev();
  }, [target, getUltimosIngredientes]);

  // --- Handlers de Proceso ---
  const aplicarPredefinido = (nombre, valor) => {
    setNombreProceso(nombre);
    setLocalFP(valor);
    setEsManual(false);
  };

  // --- Sincronización de Costos Batch ---
  useEffect(() => {
    const fetchCostos = async () => {
      if (recipe.length === 0) return;
      setIsSyncing(true);
      const ids = recipe.map(r => r.id_componente);
      const batch = await getCostosBatch(ids);
      setCostosIngredientes(batch);
      setIsSyncing(false);
    };
    fetchCostos();
  }, [recipe, getCostosBatch]);

  // --- Lógica de Costeo y Validación ---
  const totalPorcentaje = recipe.reduce((sum, item) => sum + (parseFloat(item.porcentaje) || 0), 0);
  const esValido = Math.abs(totalPorcentaje - 100) < 0.001;
  
  const costoMezcla = recipe.reduce((acc, r) => {
    const c = costosIngredientes[r.id_componente] || 0;
    return acc + (c * (parseFloat(r.porcentaje) / 100));
  }, 0);

  const costoFinalSimulado = costoMezcla + parseFloat(localFP || 0);

  // --- Filtrado Técnico ---
  const piList = useMemo(() => 
    productos.filter(p => 
      p.tipo_producto === 'PI' && 
      (p.descripcion_producto.toLowerCase().includes(query.toLowerCase()) || 
       p.clave_producto.toLowerCase().includes(query.toLowerCase()))
    ), [productos, query]);

  const availableItems = productos.filter(p => p.id_producto !== target?.id_producto);
  const filteredItems = availableItems.filter(i => 
    i.descripcion_producto.toLowerCase().includes(labSearch.toLowerCase()) || 
    i.clave_producto.toLowerCase().includes(labSearch.toLowerCase())
  );

  // --- Handlers de Guardado ---
  const addIngredient = (item) => {
    if (!recipe.find(r => r.id_componente === item.id_producto)) {
      setRecipe([...recipe, { id_componente: item.id_producto, porcentaje: 0 }]);
    }
  };

  const updatePercentage = (id, value) => {
    setRecipe(recipe.map(r => 
      r.id_componente === id ? { ...r, porcentaje: value } : r
    ));
  };

  const handleSaveNew = async () => {
    if (!esValido) return;
    try {
      await createVersionFormula({
        id_producto: target.id_producto,
        nombre_proceso: nombreProceso.toUpperCase(),
        factor_proceso: parseFloat(localFP),
        ingredientes: recipe.map(r => ({
          id_componente: r.id_componente,
          porcentaje: parseFloat(r.porcentaje)
        }))
      });
      setTarget(null);
    } catch (e) { console.error(e); }
  };

  const handleUpdate = async () => {
    if (!esValido) return alert("Suma de protocolo debe ser 100%");
    if (!window.confirm("¿Sobrescribir la fórmula actual?")) return;
    try {
      await actualizarVersionActual({
        id_producto: target.id_producto,
        nombre_proceso: nombreProceso.toUpperCase(),
        factor_proceso: parseFloat(localFP),
        ingredientes: recipe.map(r => ({
          id_componente: r.id_componente,
          porcentaje: parseFloat(r.porcentaje)
        }))
      });
      setTarget(null); 
    } catch (error) { console.error(error); }
  };

  // --- RENDERS ---

  if (!target) {
    return (
      <div className="space-y-4 animate-fade max-w-6xl mx-auto">
        <div className="bg-[#1e293b] text-white p-8 rounded shadow-2xl flex justify-between items-center border-l-8 border-emerald-500">
          <div>
            <h1 className="text-xl font-black uppercase italic tracking-tighter">Centro de Síntesis</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Laboratorio de formulación y costeo técnico</p>
          </div>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="BUSCAR PI..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded text-[10px] font-black text-emerald-400 outline-none uppercase"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded shadow-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b text-[10px] font-black text-slate-500 uppercase tracking-widest">
              <tr>
                <th className="p-4 text-center">Clave</th>
                <th className="p-4">Descripción del Producto</th>
                <th className="p-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {piList.map(p => (
                <tr key={p.id_producto} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-center font-mono font-bold text-slate-400">{p.clave_producto}</td>
                  <td className="p-4 font-bold uppercase text-slate-700">{p.descripcion_producto}</td>
                  <td className="p-4 text-right">
                    <button onClick={() => setTarget(p)} className="bg-[#0f172a] text-emerald-400 px-4 py-2 rounded text-[10px] font-black uppercase hover:bg-black transition-all italic">
                      Abrir Laboratorio
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade">
      {/* HEADER DE LABORATORIO ACTIVO */}
      <div className="bg-white p-6 border border-slate-200 shadow-xl rounded-xl">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-center gap-6">
            <button onClick={() => setTarget(null)} className="p-2 bg-slate-100 rounded hover:bg-slate-200 text-slate-500 transition-all">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-800 uppercase italic underline decoration-emerald-400 decoration-4">
                {target.descripcion_producto}
              </h1>
              
              {/* SELECTOR DE PROCESO */}
              <div className="flex items-center gap-3 mt-4">
                <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-inner">
                  {[
                    { n: 'NINGUNO', v: 0 },
                    { n: 'CALOR', v: 0.5 },
                    { n: 'FRIO', v: 0.3 }
                  ].map((p) => (
                    <button
                      key={p.n}
                      onClick={() => aplicarPredefinido(p.n, p.v)}
                      className={`px-3 py-1.5 rounded-md text-[9px] font-black transition-all ${
                        nombreProceso === p.n && !esManual 
                        ? 'bg-white text-indigo-600 shadow-sm' 
                        : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {p.n}
                    </button>
                  ))}
                  <button
                    onClick={() => setEsManual(true)}
                    className={`px-3 py-1.5 rounded-md text-[9px] font-black transition-all ${
                      esManual 
                      ? 'bg-slate-800 text-white shadow-sm' 
                      : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Edit3 size={10} className="inline mr-1"/> MANUAL
                  </button>
                </div>

                {esManual && (
                  <div className="flex items-center gap-2 animate-in slide-in-from-left-2 duration-200">
                    <input 
                      placeholder="NOMBRE..."
                      className="bg-white border border-slate-300 px-2 py-1.5 rounded text-[10px] font-bold uppercase w-28 outline-none focus:border-indigo-500"
                      value={nombreProceso}
                      onChange={(e) => setNombreProceso(e.target.value.toUpperCase())}
                    />
                    <div className="flex items-center bg-indigo-50 border border-indigo-200 rounded px-2">
                      <span className="text-[10px] font-black text-indigo-400 mr-1">$</span>
                      <input 
                        type="number" step="0.01"
                        className="bg-transparent py-1.5 text-[10px] font-mono font-black text-indigo-600 w-14 outline-none"
                        value={localFP}
                        onChange={(e) => setLocalFP(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                )}

                {!esManual && nombreProceso !== 'NINGUNO' && (
                  <span className="text-[10px] font-mono font-black text-indigo-500 bg-indigo-50 px-2 py-1 rounded">
                    +${localFP.toFixed(2)} {nombreProceso}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="text-right px-6 border-r border-slate-100 hidden md:block">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Costo Resultante (MN)</p>
              <p className="text-2xl font-black text-emerald-600 font-mono italic underline">
                ${costoFinalSimulado.toFixed(2)}
              </p>
            </div>

            <div className={`px-6 py-2 rounded-lg border-2 font-mono font-black text-sm text-center ${!esValido ? 'bg-amber-50 border-amber-400 text-amber-600' : 'bg-emerald-50 border-emerald-500 text-emerald-600'}`}>
               <span className="text-[8px] block opacity-60 uppercase mb-0.5">Suma Protocolo</span>
               {totalPorcentaje.toFixed(2)}%
               {!esValido && <AlertTriangle size={10} className="mx-auto mt-1 animate-bounce" />}
            </div>
            
            <div className="flex flex-col gap-2">
              <button 
                onClick={handleUpdate}
                disabled={!esValido || isSyncing}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-black uppercase text-[9px] tracking-widest hover:bg-indigo-600 hover:text-white transition-all border border-indigo-200"
              >
                <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} /> 
                Sobrescribir Actual
              </button>

              <button 
                onClick={handleSaveNew}
                disabled={!esValido || isSyncing}
                className={`px-6 py-2.5 rounded-lg font-black uppercase text-[10px] tracking-widest shadow-lg transition-all ${
                  esValido ? 'bg-[#0f172a] text-emerald-400 hover:bg-black' : 'bg-slate-200 text-slate-400'
                }`}
              >
                {isSyncing ? 'Sincronizando...' : 'Nueva Versión'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ALMACÉN */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
           <div className="p-4 bg-[#0f172a] text-white font-black text-[10px] uppercase flex justify-between items-center tracking-widest">
              Almacén de Insumos <Database size={14}/>
           </div>
           <div className="p-4 space-y-4">
              <input 
                type="text" 
                placeholder="FILTRAR INSUMO..." 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-xs font-bold rounded-lg outline-none uppercase"
                value={labSearch}
                onChange={(e) => setLabSearch(e.target.value)}
              />
              <div className="space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar">
                {filteredItems.map(i => (
                  <button key={i.id_producto} onClick={() => addIngredient(i)} className="w-full p-3 text-left hover:bg-emerald-50 rounded-lg flex justify-between items-center group transition-all border border-transparent hover:border-emerald-100">
                    <div>
                      <p className="text-[9px] font-bold text-slate-400">{i.clave_producto}</p>
                      <p className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{i.descripcion_producto}</p>
                    </div>
                    <PlusCircle size={16} className="text-emerald-200 group-hover:text-emerald-500 opacity-0 group-hover:opacity-100 transition-all" />
                  </button>
                ))}
              </div>
           </div>
        </div>

        {/* MEZCLA TÉCNICA */}
        <div className="lg:col-span-8 bg-white border-2 border-slate-800 shadow-2xl rounded-xl overflow-hidden">
           <table className="w-full text-left border-collapse">
             <thead className="bg-slate-50 border-b-4 border-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-widest">
               <tr>
                 <th className="p-5">Insumo Seleccionado</th>
                 <th className="p-5 text-right w-32">Costo MN</th>
                 <th className="p-5 text-center w-40">Conc. (%)</th>
                 <th className="p-6 text-right w-36 italic bg-slate-100">Aporte</th>
               </tr>
             </thead>
             <tbody className="divide-y-2 divide-slate-50">
               {recipe.map(r => {
                 const item = productos.find(p => p.id_producto === r.id_componente);
                 const costoUnit = costosIngredientes[r.id_componente] || 0;
                 const aporte = costoUnit * (parseFloat(r.porcentaje) / 100);

                 return (
                   <tr key={r.id_componente} className="hover:bg-slate-50/80 transition-all">
                     <td className="p-5">
                       <div className="flex items-center gap-4">
                        <button onClick={() => setRecipe(recipe.filter(x => x.id_componente !== r.id_componente))} className="text-slate-300 hover:text-red-500 transition-colors p-1 hover:bg-red-50 rounded">
                            <Trash2 size={16} />
                        </button>
                        <div>
                            <p className="text-sm font-black text-slate-800 uppercase italic leading-none tracking-tighter">{item?.descripcion_producto}</p>
                            <p className="text-[9px] text-slate-400 font-mono mt-1 tracking-widest">{item?.clave_producto}</p>
                        </div>
                       </div>
                     </td>
                     <td className="p-5 text-right font-mono text-slate-400 text-xs font-bold">${costoUnit.toFixed(2)}</td>
                     <td className="p-5">
                       <div className="bg-[#0f172a] rounded-lg p-1.5 flex items-center border border-slate-800 shadow-inner group">
                          <input 
                            type="number" 
                            className="w-full bg-transparent py-1 text-center text-sm font-mono font-black text-emerald-400 outline-none" 
                            value={r.porcentaje} 
                            onChange={(e) => updatePercentage(r.id_componente, e.target.value)}
                          />
                          <span className="text-[9px] font-black text-slate-600 px-2 group-focus-within:text-emerald-600">%</span>
                       </div>
                     </td>
                     <td className="p-5 text-right font-black text-slate-900 font-mono text-base bg-emerald-50/20 underline">
                        ${aporte.toFixed(2)}
                     </td>
                   </tr>
                 );
               })}
             </tbody>
             <tfoot className="bg-slate-900 text-white">
                <tr className="font-black uppercase text-[10px] tracking-widest">
                    <td colSpan="2" className="p-6 text-right text-slate-400">Total Proyectado Mezcla:</td>
                    <td className={`p-6 text-center font-mono text-base ${esValido ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {totalPorcentaje.toFixed(2)}%
                    </td>
                    <td className="p-6 text-right font-mono text-xl text-emerald-400 italic">
                      ${costoFinalSimulado.toFixed(2)}
                    </td>
                </tr>
             </tfoot>
           </table>
        </div>
      </div>
    </div>
  );
};

export default FormulaEditor;