/* =========================================================================
   PANEL — Spacious Pure White Elevated Card
   Features generous breathing room (p-6) and subtle soft shadow.
   ========================================================================= */
import React from 'react';

export function Panel({ title, actions, children, className = '', noPadding = false }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <h3 className="text-base font-semibold text-slate-900">
            {title}
          </h3>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-6'}>
        {children}
      </div>
    </div>
  );
}

export function PanelSection({ title, children, className = '' }) {
  return (
    <div className={`${className}`}>
      {title && (
        <h4 className="text-sm font-semibold text-slate-900 mb-3">
          {title}
        </h4>
      )}
      {children}
    </div>
  );
}
