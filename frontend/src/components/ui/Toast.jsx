/* =========================================================================
   TOAST / ALERT STACK — Clean Light Notification Stack
   Top-right stack, max 3, auto-dismiss 6s except CRITICAL.
   ========================================================================= */
import React, { useState, useCallback } from 'react';
import { X, AlertTriangle, Bell, AlertCircle, Info } from 'lucide-react';

const ToastContext = React.createContext(null);

export function useToast() {
  return React.useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const newToast = { id, ...toast };
    setToasts(prev => [newToast, ...prev].slice(0, 3));

    if (toast.severity !== 'CRITICAL') {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 6000);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 w-[400px] pointer-events-none" aria-live="polite">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onDismiss={() => removeToast(toast.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }) {
  const isCritical = toast.severity === 'CRITICAL';
  const Icon = toast.severity === 'CRITICAL' ? AlertCircle
    : toast.severity === 'HIGH' ? AlertTriangle
    : toast.severity === 'MODERATE' ? Bell
    : Info;

  const leftBorder = toast.severity === 'CRITICAL' ? 'border-l-red-500 text-red-600'
    : toast.severity === 'HIGH' ? 'border-l-orange-500 text-orange-600'
    : toast.severity === 'MODERATE' ? 'border-l-amber-500 text-amber-600'
    : toast.severity === 'LOW' ? 'border-l-emerald-500 text-emerald-600'
    : 'border-l-blue-500 text-blue-600';

  return (
    <div
      className={`
        flex items-start gap-3.5 p-4
        bg-white border border-slate-200 ${leftBorder} border-l-[4px] rounded-xl
        shadow-[0_10px_30px_rgba(15,23,42,0.08)]
        transition-all
      `}
      role={isCritical ? 'alert' : 'status'}
      aria-live={isCritical ? 'assertive' : 'polite'}
    >
      <Icon size={20} className="mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-[14.5px] font-semibold text-slate-900">{toast.title}</p>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {toast.severity}
          </span>
        </div>
        {toast.body && (
          <p className="text-sm text-slate-600 leading-relaxed">
            {toast.body}
          </p>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
}
