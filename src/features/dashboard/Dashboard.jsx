import React, { useState, useMemo, useEffect } from "react";
import { Search, Group, Edit3, Trash2, Plus } from "lucide-react";
import useStore from "../../store/useStore";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

const Dashboard = ({ onEdit, setCurrentView }) => {
  const { productos, initialize, tcActual, deleteProducto } = useStore();

  const [query, setQuery] = useState("");
  const [groupByFamily, setGroupByFamily] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const filtered = productos.filter(
    (p) =>
      p.descripcion_producto?.toLowerCase().includes(query.toLowerCase()) ||
      p.clave_producto?.toLowerCase().includes(query.toLowerCase())
  );

  const families = useMemo(() => {
    const map = {};

    filtered.forEach((p) => {
      const f = p.familia_producto || "SIN CLASIFICAR";

      if (!map[f]) map[f] = [];

      map[f].push(p);
    });

    return map;
  }, [filtered]);

  const handleDeleteClick = (producto) => {
    setProductToDelete(producto);
    setShowConfirm(true);
  };

  const confirmDelete = () => {
    if (productToDelete) {
      deleteProducto(productToDelete.id_producto);
    }

    setShowConfirm(false);
    setProductToDelete(null);
  };

  return (
    <div className="space-y-6 animate-fade h-full flex flex-col">
      {/* CABECERA */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col lg:flex-row justify-between items-center gap-4">
        <div className="flex flex-col md:flex-row items-center gap-4 w-full lg:w-auto">
          <div className="relative w-full md:w-80">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />

            <input
              type="text"
              placeholder="Buscar por nombre o clave..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-xs font-bold uppercase outline-none focus:border-emerald-500 transition-all rounded-lg"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <button
            onClick={() => setGroupByFamily(!groupByFamily)}
            className={`w-full md:w-auto px-4 py-2.5 border rounded-lg text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${
              groupByFamily
                ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Group size={14} />

            {groupByFamily
              ? "Vista Individual"
              : "Agrupar por Familia"}
          </button>
        </div>

        <button
          onClick={() => setCurrentView("registro")}
          className="w-full lg:w-auto px-6 py-2.5 bg-[#0f172a] hover:bg-emerald-600 text-white text-[10px] font-black uppercase rounded-lg shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={16} strokeWidth={3} />
          Agregar Producto (MP / PI)
        </button>
      </div>

      {/* TABLA */}
      <div className="bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden flex-1 min-h-0">
        
        {/* SCROLL */}
        <div className="overflow-auto max-h-[70vh]">
          <table className="w-full text-left border-collapse table-fixed">
            
            {/* HEADER FIJO */}
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr className="border-b-2 border-slate-200 text-[10px] font-black text-slate-600 uppercase tracking-widest">
                <th className="px-6 py-4 border-r border-slate-100 w-[10%]">
                  Producto
                </th>

                <th className="px-6 py-4 w-[35%]">
                  Descripción
                </th>

                <th className="px-6 py-4 text-right w-[15%]">
                  Costo Base
                </th>

                <th className="px-6 py-4 text-center w-[12%]">
                  T.C.
                </th>

                <th className="px-6 py-4 text-right text-emerald-600 bg-emerald-50/20 italic w-[15%]">
                  Valor (MXN)
                </th>

                <th className="px-6 py-4 text-center w-[13%]">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-[13px]">
              {groupByFamily
                ? Object.entries(families).map(([name, items]) => (
                    <React.Fragment key={name}>
                      <tr className="bg-slate-100/50">
                        <td
                          colSpan="6"
                          className="px-6 py-2 text-[9px] font-black text-emerald-700 uppercase tracking-widest italic border-y border-slate-200 bg-slate-50"
                        >
                          📁 Grupo: {name} ({items.length} registros)
                        </td>
                      </tr>

                      {items.map((p) => (
                        <DashboardRow
                          key={p.id_producto}
                          producto={p}
                          tcActual={tcActual}
                          onEdit={onEdit}
                          onDelete={handleDeleteClick}
                        />
                      ))}
                    </React.Fragment>
                  ))
                : filtered.map((p) => (
                    <DashboardRow
                      key={p.id_producto}
                      producto={p}
                      tcActual={tcActual}
                      onEdit={onEdit}
                      onDelete={handleDeleteClick}
                    />
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONFIRMACIÓN */}
      <ConfirmDialog
        isOpen={showConfirm}
        title="¿Eliminar producto?"
        message={`¿Estás seguro de eliminar "${productToDelete?.descripcion_producto}"? Esta acción no se puede deshacer.`}
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowConfirm(false);
          setProductToDelete(null);
        }}
      />
    </div>
  );
};

const DashboardRow = ({
  producto,
  tcActual,
  onEdit,
  onDelete,
}) => {
  const costoBase = parseFloat(producto.costo || 0);

  const tc = Number(tcActual || 18);

  // Redondeo matemático estricto a 2 decimales para la conversión de divisas
  const valorEnMXN =
    producto.moneda === "USD"
      ? parseFloat((costoBase * tc).toFixed(2))
      : parseFloat(costoBase.toFixed(2));

  return (
    <tr className="hover:bg-emerald-50/30 transition-colors group">
      <td className="px-6 py-4 font-mono text-xs font-bold text-slate-400 group-hover:text-emerald-600 uppercase border-r border-slate-50 truncate">
        {producto.clave_producto}
      </td>

      <td className="px-6 py-4 uppercase font-bold text-slate-700 tracking-tight truncate">
        {producto.descripcion_producto}

        <span className="block text-[9px] text-slate-400 font-normal mt-0.5 italic">
          {producto.tipo_producto === "MP"
            ? "MATERIA PRIMA"
            : "PRODUCTO INTERMEDIO"}
        </span>
      </td>

      <td className="px-6 py-4 text-right font-mono text-xs text-slate-400 font-bold">
        ${costoBase.toFixed(2)}

        <span className="text-[9px] opacity-60 uppercase">
          ({producto.moneda})
        </span>
      </td>

      <td className="px-6 py-4 text-center">
        <div className="inline-flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
          <span className="text-[10px] font-black font-mono text-emerald-600">
            ${tc.toFixed(2)}
          </span>
        </div>
      </td>

      <td className="px-6 py-4 text-right bg-emerald-50/10 font-black text-slate-900 font-mono text-base">
        ${valorEnMXN.toLocaleString("es-MX", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2, // Se fuerza a un límite máximo estricto en la interfaz
        })}
      </td>

      <td className="px-6 py-4 text-center">
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => onEdit(producto)}
            className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg transition-all"
          >
            <Edit3 size={16} />
          </button>

          <button
            onClick={() => onDelete(producto)}
            className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition-all"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default Dashboard;