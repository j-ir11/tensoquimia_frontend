import { useState } from 'react';
import { 
  Menu, FlaskConical, LayoutDashboard, Beaker, 
  PlusCircle, History as HistoryIcon, Edit3, TrendingUp, 
  FileText, FileStack, AlertTriangle, Check, X, LogOut 
} from 'lucide-react';
import useStore from '../../store/useStore';

const MainLayout = ({ children, currentView, setCurrentView }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isEditingTc, setIsEditingTc] = useState(false);
  const [tempTc, setTempTc] = useState(18.00);
  const [showTcModal, setShowTcModal] = useState(false);

  // Traemos el usuario y logout del store
  const { tcActual, actualizarTipoCambio, user, logout } = useStore();

  const tcValue = typeof tcActual === 'number' 
    ? tcActual 
    : (tcActual?.valor || tcActual?.value || 18.00);

  const startEditing = () => {
    setTempTc(tcValue);
    setIsEditingTc(true);
  };

  const handlePreSave = () => {
    const newValue = parseFloat(tempTc);
    const oldValue = parseFloat(tcValue);

    if (isNaN(newValue) || newValue === oldValue) {
      setIsEditingTc(false);
      return;
    }

    // SI ES ADMIN: Mostramos el modal para actualizar BD
    if (user?.rol === 'ADMIN') {
      setShowTcModal(true);
    } else {
      // SI ES AUXILIAR: Solo actualizamos el estado local (Simulación)
      // Usamos set del store para cambiar el valor visualmente sin llamar a la API
      useStore.setState({ tcActual: newValue });
      setIsEditingTc(false);
    }
  };

  const confirmUpdateTc = () => {
    actualizarTipoCambio(parseFloat(tempTc));
    setShowTcModal(false);
    setIsEditingTc(false);
  };

  // --- FILTRADO DE MENÚ POR ROL ---
  const allMenuItems = [
    { id: 'dashboard', label: 'DASHBOARD', icon: <LayoutDashboard size={18} />, roles: ['ADMIN'] },
    { id: 'formulacion', label: 'FORMULACIÓN', icon: <Beaker size={18} />, roles: ['ADMIN'] },
    { id: 'registro', label: 'NUEVO REGISTRO', icon: <PlusCircle size={18} />, roles: ['ADMIN'] },
    { id: 'reporte_individual', label: 'FICHA INDIVIDUAL', icon: <FileText size={18} />, roles: ['ADMIN'] },
    { id: 'reporte_colectivo', label: 'REPORTE COLECTIVO', icon: <FileStack size={18} />, roles: ['ADMIN', 'PRODUCCION'] },
    { id: 'historial', label: 'HISTORIAL', icon: <HistoryIcon size={18} />, roles: ['ADMIN'] },
    { id: 'grafica_evolucion', label: 'GRAFICAS', icon: <TrendingUp size={18} />, roles: ['ADMIN'] },
  ];

  // Filtramos los items según el rol del usuario logueado
  const menuItems = allMenuItems.filter(item => item.roles.includes(user?.rol));

  return (
    <div className="flex min-h-screen bg-slate-50 overflow-hidden font-sans">
      
      {/* MODAL DE CONFIRMACIÓN (SOLO PARA ADMIN) */}
      {showTcModal && user?.rol === 'ADMIN' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-fade">
          <div className="bg-white border-2 border-slate-800 shadow-2xl w-full max-w-md overflow-hidden rounded-2xl mx-4">
            <div className="bg-[#0f172a] p-4 flex items-center gap-3">
              <div className="bg-amber-500/20 p-2 rounded-lg text-amber-500">
                <AlertTriangle size={20} />
              </div>
              <h3 className="text-white font-black text-[10px] uppercase tracking-widest italic">Actualización de TC (Base de Datos)</h3>
            </div>
            
            <div className="p-8 text-center">
              <p className="text-slate-500 text-[9px] font-black uppercase mb-6 tracking-widest leading-relaxed">
                ¡Atención Administrador!<br/>Esta acción recalculará los costos de todo el catálogo.
              </p>
              
              <div className="flex justify-center items-center gap-8 mb-8">
                <div className="text-center">
                  <span className="block text-[8px] font-black text-slate-400 uppercase mb-1">Anterior</span>
                  <span className="text-lg font-mono font-black text-slate-300 line-through">${Number(tcValue).toFixed(2)}</span>
                </div>
                <TrendingUp className="text-emerald-500 animate-pulse" size={24} />
                <div className="text-center">
                  <span className="block text-[8px] font-black text-emerald-500 uppercase mb-1">Nuevo</span>
                  <span className="text-2xl font-mono font-black text-slate-900 underline decoration-emerald-400 decoration-4">
                    ${parseFloat(tempTc).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={() => { setShowTcModal(false); setIsEditingTc(false); }} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2">
                  <X size={14} /> Cancelar
                </button>
                <button onClick={confirmUpdateTc} className="flex-1 px-4 py-3 bg-[#0f172a] text-emerald-400 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2">
                  <Check size={14} /> Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0f172a] text-slate-300 transform transition-transform duration-300 lg:relative lg:translate-x-0 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-slate-700 bg-[#1e293b] flex items-center gap-3">
          <FlaskConical className="text-emerald-500 w-6 h-6" />
          <h2 className="text-lg font-black text-white tracking-widest uppercase italic">TENSO<span className="text-emerald-500">QUIMIA</span></h2>
        </div>

        <nav className="p-4 space-y-2 flex-1">
          {menuItems.map((item) => (
            <button 
              key={item.id} 
              onClick={() => { setCurrentView(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded text-[10px] font-black tracking-widest transition-all border-l-4 
                ${currentView === item.id ? 'bg-[#1e293b] text-white border-emerald-500 shadow-lg' : 'text-slate-500 border-transparent hover:bg-[#1e293b] hover:text-white'}`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </nav>

        {/* Botón de Logout al final */}
        <div className="p-4 border-t border-slate-700">
          <button onClick={logout} className="w-full flex items-center gap-4 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded transition-all font-black text-[10px] tracking-widest uppercase italic">
            <LogOut size={18} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative overflow-y-auto">
        <header className="bg-white border-b border-slate-200 p-4 lg:px-8 sticky top-0 z-40 flex justify-between items-center shadow-sm print:hidden">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-slate-600">
              <Menu size={24} />
            </button>
            <div>
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">SISTEMA DE CONTROL</h2>
              <p className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest">{user?.rol} : {user?.nombre}</p>
            </div>
          </div>

          {/* Tipo de Cambio Dinámico */}
          <div className={`transition-all duration-300 px-4 py-2 rounded-xl flex items-center gap-3 shadow-sm border ${isEditingTc ? 'bg-emerald-50 border-emerald-300 ring-4 ring-emerald-100' : 'bg-slate-50 border-slate-200'}`}>
            <TrendingUp size={16} className={isEditingTc ? 'text-emerald-500 animate-pulse' : 'text-emerald-600'} />
            <div className="flex flex-col text-right">
              <span className="text-[7px] font-black text-slate-400 uppercase italic">
                {user?.rol === 'ADMIN' ? 'Exchange Rate (DB)' : 'Exchange Rate (Simulación)'}
              </span>
              <div className="flex items-center gap-2 justify-end">
                {isEditingTc ? (
                  <input 
                    autoFocus 
                    type="number" 
                    step="0.01"
                    className="w-20 text-sm font-bold text-emerald-600 outline-none bg-transparent font-mono"
                    value={tempTc}
                    onChange={(e) => setTempTc(e.target.value)}
                    onBlur={handlePreSave}
                    onKeyDown={(e) => {
                      if(e.key === 'Enter') handlePreSave();
                      if(e.key === 'Escape') setIsEditingTc(false);
                    }}
                  />
                ) : (
                  <span className="text-sm font-mono font-black text-slate-800">
                    ${Number(tcValue).toFixed(2)}
                  </span>
                )}
                
                <button onClick={startEditing} className="text-slate-400 hover:text-emerald-600 transition-colors">
                  <Edit3 size={14} />
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="p-6 lg:p-8 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;