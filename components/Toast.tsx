
import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message: string;
}

interface ToastProps {
  toast: ToastMessage;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-400" />,
    error: <AlertCircle className="w-5 h-5 text-rose-400" />,
    info: <Info className="w-5 h-5 text-blue-400" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-400" />
  };

  const borders = {
    success: 'border-emerald-500/30',
    error: 'border-rose-500/30',
    info: 'border-blue-500/30',
    warning: 'border-amber-500/30'
  };

  const bgs = {
    success: 'bg-emerald-500/5',
    error: 'bg-rose-500/5',
    info: 'bg-blue-500/5',
    warning: 'bg-amber-500/5'
  };

  return (
    <div className={`glass-card ${bgs[toast.type]} ${borders[toast.type]} border p-4 rounded-xl flex items-start gap-3 shadow-2xl animate-in slide-in-from-right fade-in duration-300 w-80 mb-3`}>
      <div className="mt-0.5">{icons[toast.type]}</div>
      <div className="flex-1">
        <h4 className="text-[10px] font-black uppercase tracking-widest mb-1 text-slate-200">
          {toast.title}
        </h4>
        <p className="text-[11px] text-slate-400 font-medium leading-tight">
          {toast.message}
        </p>
      </div>
      <button 
        onClick={() => onClose(toast.id)}
        className="text-slate-500 hover:text-slate-300 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Toast;
