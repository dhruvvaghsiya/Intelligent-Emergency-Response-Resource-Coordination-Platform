/* =========================================================================
   CHIP — pill badges with soft glow accents
   Severity: filled pill, 11px, uppercase, sev-* text on sev-*-bg + 1px border
   Status: dot + label, not filled
   SIM badge, DEGRADED badge
   ========================================================================= */
import React from 'react';
import { SEVERITY_CONFIG, STATUS_CONFIG, INCIDENT_STATUS_CONFIG } from '../../lib/constants';

export function SeverityChip({ severity, score, className = '' }) {
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.INFO;
  const isCritical = severity === 'CRITICAL';
  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-0.5
        rounded-full border text-[10.5px] font-bold uppercase tracking-wide leading-none
        ${config.color} ${config.bg} ${config.border}
        ${isCritical ? 'shadow-[0_0_10px_-2px_currentColor]' : ''}
        ${className}
      `}
    >
      {config.label}
      {score != null && (
        <span className="font-mono text-[9.5px] opacity-80">{score}</span>
      )}
    </span>
  );
}

export function StatusDot({ status, className = '' }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.OFFLINE;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${config.color} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} shadow-[0_0_6px_currentColor]`} />
      {config.label}
    </span>
  );
}

export function IncidentStatusChip({ status, className = '' }) {
  const config = INCIDENT_STATUS_CONFIG[status] || { label: status, color: 'text-text-muted' };
  return (
    <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${config.color} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full bg-current`} />
      {config.label}
    </span>
  );
}

export function SimBadge({ show = true }) {
  if (!show) return null;
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9.5px] font-mono font-semibold uppercase tracking-wider bg-accent/[0.12] text-accent border border-accent/25">
      SIM
    </span>
  );
}

export function DegradedBadge({ show = true }) {
  if (!show) return null;
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9.5px] font-semibold uppercase tracking-wider bg-sev-high-bg text-sev-high border border-sev-high/30">
      <span className="w-1.5 h-1.5 rounded-full bg-sev-high" />
      DEGRADED
    </span>
  );
}

export function ContestedBadge({ attribute, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wide bg-sev-high-bg text-sev-high border border-sev-high/30 shadow-[0_0_10px_-3px_currentColor] ${className}`}>
      ⚠ CONTESTED
      {attribute && <span className="font-normal normal-case text-[10px] opacity-80">({attribute.replace(/_/g, ' ')})</span>}
    </span>
  );
}

export function CountChip({ count, label, variant = 'default' }) {
  const variants = {
    default: 'glass text-text-secondary',
    warning: 'bg-sev-high-bg border-sev-high/30 text-sev-high',
    danger: 'bg-sev-critical-bg border-sev-critical/30 text-sev-critical',
    accent: 'bg-accent-muted border-accent/30 text-accent',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${variants[variant]}`}>
      <span className="font-mono font-bold">{count}</span>
      {label && <span className="opacity-85 font-medium">{label}</span>}
    </span>
  );
}
