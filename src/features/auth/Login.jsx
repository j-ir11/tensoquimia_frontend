import React, { useState } from 'react';
import useStore from '../../store/useStore';
import { Lock, User, AlertCircle, Loader2, Beaker } from 'lucide-react';

const Login = () => {
  const login = useStore((state) => state.login);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ usuario: '', contraseña: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await login(form);
    if (!result.success) {
      setError(result.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decoración de fondo (Efecto laboratorio) */}
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md z-10 animate-fade">
        <div className="bg-white rounded-sm shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden border-t-4 border-emerald-500">
          <div className="p-10">
            {/* Header Login */}
            <div className="text-center mb-10">
              <div className="inline-flex p-3 bg-slate-100 rounded-full mb-4 text-slate-800">
                <Beaker size={32} strokeWidth={2.5} />
              </div>
              <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">
                Tenso<span className="text-emerald-500">Quimia</span>
              </h1>
              <div className="h-1 w-12 bg-slate-200 mx-auto mt-2"></div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] mt-3">
                Sistema de Gestión de Laboratorio
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Identificador de Usuario</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    required
                    className="w-full bg-slate-50 border border-slate-200 p-3 pl-10 text-xs font-bold uppercase outline-none focus:border-emerald-500 transition-all rounded-sm"
                    placeholder="USUARIO..."
                    onChange={(e) => setForm({...form, usuario: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Clave de Seguridad</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    required
                    type="password"
                    className="w-full bg-slate-50 border border-slate-200 p-3 pl-10 text-xs font-bold outline-none focus:border-emerald-500 transition-all rounded-sm"
                    placeholder="••••••••"
                    onChange={(e) => setForm({...form, contraseña: e.target.value})}
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                  <AlertCircle size={18} />
                  <p className="text-[10px] font-black uppercase tracking-tight">{error}</p>
                </div>
              )}

              <button 
                disabled={loading}
                className="w-full bg-slate-900 text-emerald-400 py-4 font-black uppercase text-[10px] tracking-[0.3em] hover:bg-black transition-all flex items-center justify-center gap-3 shadow-lg border border-emerald-950 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Autenticar en el Sistema'}
              </button>
            </form>
          </div>
          
          <div className="bg-slate-50 p-4 border-t border-slate-100">
            <p className="text-[8px] text-center text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
              Propiedad del mismisimo uriel<br/>
             
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;