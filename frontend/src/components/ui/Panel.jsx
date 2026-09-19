/* =========================================================================
   PANEL — Glass card with soft border, subtle depth shadow
   ========================================================================= */
import React from 'react';

export function Panel({ title, actions, children, className = '', noPadding = false }) {
  return (
    <div className={`glass-panel rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--shadow-card)] ${className}`}>
      {title && (
        <div className="flex items-center justify-between h-[40px] px-4 border-b border-border-subtle bg-white/[0.02]">
          <span className="text-[11px] font-semibold uppercase tracking-[0.09em] text-text-muted">
            {title}
          </span>
          {actions && <div className="flex items-center gap-1">{actions}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-4'}>
        {children}
      </div>
    </div>
  );
}

export function PanelSection({ title, children, className = '' }) {
  return (
    <div className={`${className}`}>
      {title && (
        <h4 className="text-[11px] font-semibold uppercase tracking-[0.09em] text-text-muted mb-2.5">
          {title}
        </h4>
      )}
      {children}
    </div>
  );
}
