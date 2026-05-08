import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    success: { bg: 'bg-emerald-600', icon: <CheckCircle2 size={22} /> },
    error:   { bg: 'bg-red-600',     icon: <AlertCircle size={22} /> }
  };

  const current = styles[type] || styles.success;

  return (
    <div className={`
      fixed top-6 right-6 z-[10000] flex items-center gap-4 
      px-6 py-4 rounded-2xl shadow-2xl ${current.bg} text-white
      min-w-[340px] animate-slideIn
    `}>
      <div>{current.icon}</div>
      <div className="flex-1 font-medium">{message}</div>
      <button onClick={onClose} className="text-white/70 hover:text-white">
        <X size={20} />
      </button>
    </div>
  );
};

export default Toast;