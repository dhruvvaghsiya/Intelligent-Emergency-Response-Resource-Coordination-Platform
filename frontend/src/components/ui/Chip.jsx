/* =========================================================================
   CHIP — Soft Tinted Badges & Status Indicators
   Subtle non-overpowering tinted backgrounds with darker text (Ward Alerts rule).
   ========================================================================= */
import React from 'react';
import { STATUS_CONFIG, INCIDENT_STATUS_CONFIG } from '../../lib/constants';

const SEVERITY_LIGHT_CONFIG = {
  CRITICAL: {
    bg: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-500',
    label: 'Critical',
  },
  HIGH: {
    bg: 'bg-orange-50 text-orange-700 border-orange-200',
    dot: 'bg-orange-500',
    label: 'High',
  },
  MODERATE: {
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
    label: 'Moderate',
  },
  LOW: {
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    label: 'Low',
  },
  INFO: {
    bg: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
    label: 'Info',
  },
};

export function SeverityChip({ severity, score, className = '' }) {
  const config = SEVERITY_LIGHT_CONFIG[severity] || SEVERITY_LIGHT_CONFIG.INFO;
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-0.5
        rounded-full border text-xs font-semibold select-none
        ${config.bg}
        ${className}
      `}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span>{config.label}</span>
      {score != null && (
        <span className="font-mono text-[11px] opacity-80 pl-1 border-l border-current/20">{score}</span>
      )}
    </span>
  );
}

export function StatusDot({ status, className = '' }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.OFFLINE;
  return (
    <span className={`inline-flex items-center gap-2 text-sm font-medium text-slate-700 ${className}`}>
      <span className={`w-2 h-2 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

export function IncidentStatusChip({ status, className = '' }) {
  const config = INCIDENT_STATUS_CONFIG[status] || { label: status, color: 'text-slate-600' };
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
      {config.label}
    </span>
  );
}

export function SimBadge({ show = true }) {
  if (!show) return null;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
      Simulated
    </span>
  );
}

export function DegradedBadge({ show = true }) {
  if (!show) return null;
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
      Degraded
    </span>
  );
}

export function ContestedBadge({ attribute, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 ${className}`}>
      <span>Contested</span>
      {attribute && <span className="font-normal text-slate-600">({attribute.replace(/_/g, ' ')})</span>}
    </span>
  );
}

export function CountChip({ count, label, variant = 'default' }) {
  const variants = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    accent: 'bg-blue-50 text-blue-700 border-blue-200',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${variants[variant] || variants.default}`}>
      <strong className="font-semibold">{count}</strong>
      {label && <span>{label}</span>}
    </span>
  );
}
