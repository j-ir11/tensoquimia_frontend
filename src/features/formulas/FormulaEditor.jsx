import React, { useState, useEffect, useMemo } from "react";
import useStore from "../../store/useStore";
import {
  ArrowLeft,
  Search,
  PlusCircle,
  Trash2,
  Database,
  AlertTriangle,
  RefreshCw,
  Loader2,
  ChevronDown,
  X,
  Check,
} from "lucide-react";

const FormulaEditor = () => {
  const {
    productos,
    createVersionFormula,
    getUltimosIngredientes,
    getCostosBatch,
    actualizarVersionActual,
  } = useStore();

  const [target, setTarget] = useState(null);
  const [recipe, setRecipe] = useState([]);
  const [originalData, setOriginalData] = useState({
    recipe: [],
    nombreProceso: "NINGUNO",
    localFP: "",
  });
  const [query, setQuery] = useState("");
  const [labSearch, setLabSearch] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [costosIngredientes, setCostosIngredientes] = useState({});
  const [nombreProceso, setNombreProceso] = useState("NINGUNO");
  const [localFP, setLocalFP] = useState("");
  const [esManual, setEsManual] = useState(false);
  const [hasPreviousVersion, setHasPreviousVersion] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ESTADO PARA EL MODAL DE CONFIRMACIÓN PROPIO
  const [showConfirm, setShowConfirm] = useState(false);

  const handleFocus = (e) => e.target.select();

  // FUNCIÓN DE REDONDEO ESTRICTO: 0.005 sube, todo lo menor (0.0049...) baja
  const redondearCostoEstricto = (valor) => {
    const num = parseFloat(valor);
    if (isNaN(num) || num < 0) return 0;
    
    const multiplicado = num * 100;
    const parteEntera = Math.floor(multiplicado);
    const residuoDecimal = multiplicado - parteEntera;

    if (residuoDecimal >= 0.49999) {
      return parseFloat(((parteEntera + 1) / 100).toFixed(2));
    } else {
      return parseFloat((parteEntera / 100).toFixed(2));
    }
  };

  const formatOnBlur = (value, setter) => {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) {
      setter("");
    } else {
      setter(redondearCostoEstricto(num).toFixed(2));
    }
  };

  useEffect(() => {
    const loadPrev = async () => {
      if (target) {
        const data = await getUltimosIngredientes(target.id_producto);
        if (data && data.version) {
          setHasPreviousVersion(true);
          const loadedRecipe = data.ingredientes
            ? data.ingredientes.map((ing) => ({
                id_componente: ing.id_componente,
                porcentaje: parseFloat(ing.porcentaje).toFixed(2),
              }))
            : [];

          const nProc = data.version.nombre_proceso || "NINGUNO";
          const fProc = parseFloat(data.version.factor_proceso || 0).toFixed(2);

          setRecipe(loadedRecipe);
          setNombreProceso(nProc);
          setLocalFP(fProc);

          setOriginalData({
            recipe: loadedRecipe,
            nombreProceso: nProc,
            localFP: fProc,
          });

          const predefinidos = { CALOR: 0.5, FRIO: 0.3, NINGUNO: 0 };
          const esPredefinido =
            predefinidos[nProc.toUpperCase()] !== undefined &&
            Math.abs(predefinidos[nProc.toUpperCase()] - parseFloat(fProc)) <
              0.01;
          setEsManual(!esPredefinido && nProc !== "NINGUNO");
        } else {
          setHasPreviousVersion(false);
          setRecipe([]);
          setNombreProceso("NINGUNO");
          setLocalFP("");
          setOriginalData({
            recipe: [],
            nombreProceso: "NINGUNO",
            localFP: "",
          });
          setEsManual(false);
        }
      }
    };
    loadPrev();
  }, [target, getUltimosIngredientes]);

  const isDirty = useMemo(() => {
    if (recipe.length !== originalData.recipe.length) return true;
    const recipeChanged = recipe.some((ing, idx) => {
      const orig = originalData.recipe[idx];
      return (
        ing.id_componente !== orig?.id_componente ||
        ing.porcentaje !== orig?.porcentaje
      );
    });
    if (recipeChanged) return true;
    if (nombreProceso !== originalData.nombreProceso) return true;
    if (localFP !== originalData.localFP) return true;
    return false;
  }, [recipe, nombreProceso, localFP, originalData]);

  const handleFPChange = (e) => {
    const val = e.target.value;
    if (val === "MANUAL") {
      setEsManual(true);
      setNombreProceso("PERSONALIZADO");
      setLocalFP("");
    } else {
      setEsManual(false);
      const opciones = { NINGUNO: 0, CALOR: 0.5, FRIO: 0.3 };
      setNombreProceso(val);
      setLocalFP(opciones[val].toFixed(2));
    }
  };

  useEffect(() => {
    const fetchCostos = async () => {
      if (recipe.length === 0) return;
      setIsSyncing(true);
      const ids = recipe.map((r) => r.id_componente);
      const batch = await getCostosBatch(ids);
      setCostosIngredientes(batch);
      setIsSyncing(false);
    };
    fetchCostos();
  }, [recipe, getCostosBatch]);

  const totalPorcentaje = recipe.reduce(
    (sum, item) => sum + (parseFloat(item.porcentaje) || 0),
    0,
  );
  
  const esValido = Math.abs(totalPorcentaje - 100) < 0.01;

  const costoFinalSimulado = useMemo(() => {
    const sumaAportesRedondeados = recipe.reduce((acc, r) => {
      const costoUnit = costosIngredientes[r.id_componente] || 0;
      const aporteExacto = costoUnit * (parseFloat(r.porcentaje || 0) / 100);
      const aporteRedondeado = redondearCostoEstricto(aporteExacto);
      return acc + aporteRedondeado;
    }, 0);

    const factorProceso = parseFloat(localFP) || 0;
    return redondearCostoEstricto(sumaAportesRedondeados + factorProceso);
  }, [recipe, costosIngredientes, localFP]);

  const filteredItems = productos.filter(
    (p) =>
      p.id_producto !== target?.id_producto &&
      (p.descripcion_producto.toLowerCase().includes(labSearch.toLowerCase()) ||
        p.clave_producto.toLowerCase().includes(labSearch.toLowerCase())),
  );

  const addIngredient = (item) => {
    if (!recipe.find((r) => r.id_componente === item.id_producto)) {
      setRecipe([
        ...recipe,
        { id_componente: item.id_producto, porcentaje: "" },
      ]);
    }
  };

  const executeUpdate = async () => {
    setIsSaving(true);
    setShowConfirm(false);
    try {
      // MANDAMOS EL VALOR FORMATEADO COMO STRING CON DOS DECIMALES FIJOS PARA ROMPER IMPRECISIONES EN BD
      await actualizarVersionActual({
        id_producto: target.id_producto,
        nombre_proceso: nombreProceso.toUpperCase(),
        factor_proceso: parseFloat(localFP) || 0,
        costo_final: costoFinalSimulado.toFixed(2), // <-- Modificado aquí (.toFixed(2))
        ingredientes: recipe.map((r) => ({
          id_componente: r.id_componente,
          porcentaje: parseFloat(r.porcentaje) || 0,
        })),
      });
      setTarget(null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNew = async () => {
    if (!esValido || isSaving) return;
    setIsSaving(true);
    try {
      // MANDAMOS EL VALOR FORMATEADO COMO STRING CON DOS DECIMALES FIJOS PARA ROMPER IMPRECISIONES EN BD
      await createVersionFormula({
        id_producto: target.id_producto,
        nombre_proceso: nombreProceso.toUpperCase(),
        factor_proceso: parseFloat(localFP) || 0,
        costo_final: costoFinalSimulado.toFixed(2), // <-- Modificado aquí (.toFixed(2))
        ingredientes: recipe.map((r) => ({
          id_componente: r.id_componente,
          porcentaje: parseFloat(r.porcentaje) || 0,
        })),
      });
      setTarget(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  if (!target) {
    return (
      <div className="space-y-4 animate-fade max-w-6xl mx-auto">
        <div className="bg-[#1e293b] text-white p-8 rounded shadow-2xl flex justify-between items-center border-l-8 border-emerald-500">
          <div>
            <h1 className="text-xl font-black uppercase italic tracking-tighter">
              Centro de Síntesis
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
              Laboratorio de formulación y costeo técnico
            </p>
          </div>
          <div className="relative w-72">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              size={16}
            />
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
              {productos
                .filter(
                  (p) =>
                    p.tipo_producto === "PI" &&
                    p.descripcion_producto
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                )
                .map((p) => (
                  <tr
                    key={p.id_producto}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="p-4 text-center font-mono font-bold text-slate-400">
                      {p.clave_producto}
                    </td>
                    <td className="p-4 font-bold uppercase text-slate-700">
                      {p.descripcion_producto}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setTarget(p)}
                        className="bg-[#0f172a] text-emerald-400 px-4 py-2 rounded text-[10px] font-black uppercase hover:bg-black transition-all italic"
                      >
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
      {/* MODAL DE CONFIRMACIÓN PERSONALIZADO */}
      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-2xl border-t-4 border-indigo-500 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <RefreshCw
                  className="text-indigo-600 animate-spin-slow"
                  size={32}
                />
              </div>
              <h3 className="text-lg font-black uppercase text-slate-800 tracking-tighter">
                ¿Sobrescribir Fórmula?
              </h3>
              <p className="text-xs font-bold text-slate-500 mt-2 leading-relaxed">
                Esta acción reemplazará la versión actual en la base de datos de
                forma permanente.
              </p>
            </div>
            <div className="grid grid-cols-2 border-t">
              <button
                onClick={() => setShowConfirm(false)}
                className="p-4 text-[10px] font-black uppercase text-slate-400 hover:bg-slate-50 transition-colors border-r flex items-center justify-center gap-2"
              >
                <X size={14} /> Cancelar
              </button>
              <button
                onClick={executeUpdate}
                className="p-4 text-[10px] font-black uppercase text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
              >
                <Check size={14} /> Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 border border-slate-200 shadow-xl rounded-xl">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setTarget(null)}
              className="p-2 bg-slate-100 rounded hover:bg-slate-200 text-slate-500 transition-all"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-800 uppercase italic underline decoration-emerald-400 decoration-4">
                {target.descripcion_producto}
              </h1>

              <div className="flex items-center gap-4 mt-4">
                <div className="relative">
                  <select
                    onChange={handleFPChange}
                    value={esManual ? "MANUAL" : nombreProceso}
                    className="appearance-none bg-slate-50 border border-slate-300 pl-3 pr-8 py-1.5 rounded text-[10px] font-black uppercase outline-none focus:border-indigo-500 cursor-pointer shadow-sm"
                  >
                    <option value="NINGUNO">SIN PROCESO ($0.00)</option>
                    <option value="CALOR">CALOR ($0.50)</option>
                    <option value="FRIO">FRÍO ($0.30)</option>
                    <option value="MANUAL">PERSONALIZADO</option>
                  </select>
                  <ChevronDown
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    size={12}
                  />
                </div>

                {esManual && (
                  <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                    <input
                      placeholder="ETIQUETA..."
                      className="bg-white border border-slate-300 px-2 py-1.5 rounded text-[10px] font-bold uppercase w-32 outline-none focus:border-indigo-500 shadow-sm"
                      value={nombreProceso}
                      onFocus={handleFocus}
                      onChange={(e) =>
                        setNombreProceso(e.target.value.toUpperCase())
                      }
                    />
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-indigo-400">
                        $
                      </span>
                      <input
                        className="bg-white border border-slate-300 pl-5 pr-2 py-1.5 rounded text-[10px] font-mono font-black text-indigo-600 w-20 outline-none focus:border-indigo-500 shadow-sm"
                        value={localFP}
                        placeholder="0.00"
                        onFocus={handleFocus}
                        onChange={(e) => setLocalFP(e.target.value)}
                        onBlur={() => formatOnBlur(localFP, setLocalFP)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="text-right px-6 border-r border-slate-100 hidden md:block">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                Costo Resultante (MN)
              </p>
              <p className="text-2xl font-black text-emerald-600 font-mono italic underline">
                ${costoFinalSimulado.toFixed(2)}
              </p>
            </div>
            <div
              className={`px-6 py-2 rounded-lg border-2 font-mono font-black text-sm text-center ${!esValido ? "bg-amber-50 border-amber-400 text-amber-600" : "bg-emerald-50 border-emerald-500 text-emerald-600"}`}
            >
              <span className="text-[8px] block opacity-60 uppercase mb-0.5">
                Suma Protocolo
              </span>
              {totalPorcentaje.toFixed(2)}%
            </div>

            <div className="flex flex-col gap-2">
              {hasPreviousVersion && (
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={!esValido || isSaving || !isDirty}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-black uppercase text-[9px] tracking-widest hover:bg-indigo-600 hover:text-white transition-all border border-indigo-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <RefreshCw size={12} />
                  )}
                  Sobrescribir Actual
                </button>
              )}
              <button
                onClick={handleSaveNew}
                disabled={!esValido || isSaving || !isDirty}
                className={`px-6 py-2.5 rounded-lg font-black uppercase text-[10px] tracking-widest shadow-lg transition-all flex items-center justify-center gap-2 ${esValido && isDirty ? "bg-[#0f172a] text-emerald-400 hover:bg-black" : "bg-slate-200 text-slate-400 cursor-not-allowed"} disabled:opacity-50`}
              >
                {isSaving ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : null}
                {isSaving ? "Guardando..." : "Nueva Versión"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-4 bg-[#0f172a] text-white font-black text-[10px] uppercase flex justify-between items-center tracking-widest">
            Almacén de Insumos <Database size={14} />
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
              {filteredItems.map((i) => (
                <button
                  key={i.id_producto}
                  onClick={() => addIngredient(i)}
                  className="w-full p-3 text-left hover:bg-emerald-50 rounded-lg flex justify-between items-center group transition-all border border-transparent hover:border-emerald-100"
                >
                  <div>
                    <p className="text-[9px] font-bold text-slate-400">
                      {i.clave_producto}
                    </p>
                    <p className="text-[11px] font-black text-slate-700 uppercase tracking-tight">
                      {i.descripcion_producto}
                    </p>
                  </div>
                  <PlusCircle
                    size={16}
                    className="text-emerald-200 group-hover:text-emerald-500 opacity-0 group-hover:opacity-100 transition-all"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 bg-white border-2 border-slate-800 shadow-2xl rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b-4 border-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-widest">
              <tr>
                <th className="p-5">Insumo Seleccionado</th>
                <th className="p-5 text-right w-32">Costo MN</th>
                <th className="p-5 text-center w-40">Conc. (%)</th>
                <th className="p-6 text-right w-36 italic bg-slate-100">
                  Aporte
                </th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-50">
              {recipe.map((r) => {
                const item = productos.find(
                  (p) => p.id_producto === r.id_componente,
                );
                const costoUnit = costosIngredientes[r.id_componente] || 0;
                const aporte =
                  costoUnit * (parseFloat(r.porcentaje || 0) / 100);
                return (
                  <tr
                    key={r.id_componente}
                    className="hover:bg-slate-50/80 transition-all"
                  >
                    <td className="p-5">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() =>
                            setRecipe(
                              recipe.filter(
                                (x) => x.id_componente !== r.id_componente,
                              ),
                            )
                          }
                          className="text-slate-300 hover:text-red-500 transition-colors p-1 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={16} />
                        </button>
                        <div>
                          <p className="text-sm font-black text-slate-800 uppercase italic leading-none tracking-tighter">
                            {item?.descripcion_producto}
                          </p>
                          <p className="text-[9px] text-slate-400 font-mono mt-1 tracking-widest">
                            {item?.clave_producto}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5 text-right font-mono text-slate-400 text-xs font-bold">
                      ${costoUnit.toFixed(2)}
                    </td>
                    <td className="p-5">
                      <div className="bg-[#0f172a] rounded-lg p-1.5 flex items-center border border-slate-800 shadow-inner group">
                        <input
                          type="text"
                          onFocus={handleFocus}
                          className="w-full bg-transparent py-1 text-center text-sm font-mono font-black text-emerald-400 outline-none"
                          value={r.porcentaje}
                          placeholder="0.00"
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) {
                              setRecipe(
                                recipe.map((x) =>
                                  x.id_componente === r.id_componente
                                    ? { ...x, porcentaje: val }
                                    : x,
                                ),
                              );
                            }
                          }}
                          onBlur={(e) => {
                            const num = parseFloat(e.target.value);
                            const formatted =
                              isNaN(num) || num < 0 ? "" : num.toFixed(2);
                            setRecipe(
                              recipe.map((x) =>
                                x.id_componente === r.id_componente
                                  ? { ...x, porcentaje: formatted }
                                  : x,
                              ),
                            );
                          }}
                        />
                        <span className="text-[9px] font-black text-slate-600 px-2 group-focus-within:text-emerald-600">
                          %
                        </span>
                      </div>
                    </td>
                    <td className="p-5 text-right font-black text-slate-900 font-mono text-base bg-emerald-50/20 underline">
                      ${redondearCostoEstricto(aporte).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-900 text-white">
              <tr className="font-black uppercase text-[10px] tracking-widest">
                <td colSpan="2" className="p-6 text-right text-slate-400">
                  Total Proyectado Mezcla:
                </td>
                <td
                  className={`p-6 text-center font-mono text-base ${esValido ? "text-emerald-400" : "text-amber-400"}`}
                >
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