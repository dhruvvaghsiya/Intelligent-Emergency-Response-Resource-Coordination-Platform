/* =========================================================================
   TOAST / ALERT STACK — §14.2 Component Rules
   Top-right stack, max 3, auto-dismiss 6s except CRITICAL (sticky + ack).
   Alert color = severity color. Copy = <what happened> — <what to do>.
   ========================================================================= */
import React, { useState, useEffect, useCallback } from 'react';
import { X, AlertTriangle, Bell, AlertCircle, Info } from 'lucide-react';
import { SEVERITY_CONFIG } from '../../lib/constants';

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

    // Auto-dismiss after 6s unless CRITICAL
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
      <div className="fixed top-[56px] right-3 z-40 flex flex-col gap-2 w-[380px]" aria-live="polite">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }) {
  const config = SEVERITY_CONFIG[toast.severity] || SEVERITY_CONFIG.INFO;
  const Icon = toast.severity === 'CRITICAL' ? AlertCircle
    : toast.severity === 'HIGH' ? AlertTriangle
    : toast.severity === 'MODERATE' ? Bell
    : Info;

  return (
    <div
      className={`
        flex items-start gap-2.5 px-3 py-2.5
        border rounded-[4px] animate-slide-in-right
        ${config.bg} ${config.border}
      `}
      role={toast.severity === 'CRITICAL' ? 'alert' : 'status'}
      aria-live={toast.severity === 'CRITICAL' ? 'assertive' : 'polite'}
    >
      <Icon size={16} className={`mt-0.5 shrink-0 ${config.color}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-medium ${config.color}`}>{toast.title}</p>
        {toast.body && <p className="text-[12px] text-text-secondary mt-0.5 line-clamp-2">{toast.body}</p>}
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 p-0.5 text-text-muted hover:text-text-primary rounded cursor-pointer"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
