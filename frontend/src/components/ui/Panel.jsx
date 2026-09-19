/* =========================================================================
   PANEL — §14.2 Component Rules
   1px border, 4px radius, bg-surface, 32px header row with 12px uppercase title
   and right-aligned actions. No nested cards. No shadows.
   ========================================================================= */
import React from 'react';

export function Panel({ title, actions, children, className = '', noPadding = false }) {
  return (
    <div className={`border border-border-subtle rounded-[4px] bg-surface overflow-hidden ${className}`}>
      {title && (
        <div className="flex items-center justify-between h-[32px] px-3 bg-inset border-b border-border-subtle">
          <span className="text-[12px] font-medium uppercase tracking-wider text-text-muted">
            {title}
          </span>
          {actions && <div className="flex items-center gap-1">{actions}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-3'}>
        {children}
      </div>
    </div>
  );
}

export function PanelSection({ title, children, className = '' }) {
  return (
    <div className={`${className}`}>
      {title && (
        <h4 className="text-[11px] font-medium uppercase tracking-wider text-text-muted mb-2">
          {title}
        </h4>
      )}
      {children}
    </div>
  );
}
