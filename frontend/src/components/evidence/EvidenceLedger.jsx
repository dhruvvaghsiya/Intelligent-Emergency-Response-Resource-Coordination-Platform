/* =========================================================================
   EVIDENCE LEDGER — Multi-Source Evidence & Belief Fusion (Light Theme)
   ========================================================================= */
import React from 'react';
import { AlertTriangle, Eye, EyeOff, User, Radio, Cpu, Globe, Phone, ShieldCheck } from 'lucide-react';
import { PanelSection } from '../ui/Panel';
import { ContestedBadge } from '../ui/Chip';
import { formatAttribute, formatTime, formatProbability, formatConfidence } from '../../lib/format';
import { SOURCE_RELIABILITY } from '../../lib/constants';

const SOURCE_ICONS = {
  EMERGENCY_CALL: Phone,
  CITIZEN_APP: User,
  CITIZEN_SMS: Phone,
  SOCIAL_MEDIA: Globe,
  IOT_SENSOR: Cpu,
  CCTV_ANALYTICS: Eye,
  FIELD_UNIT: Radio,
  HOSPITAL: User,
  GOV_DEPARTMENT: User,
  OPERATOR_MANUAL: User,
  SYSTEM_DERIVED: Cpu,
};

export function EvidenceLedger({ incident }) {
  if (!incident) return null;

  const beliefs = incident.beliefs || [];
  const evidence = incident.evidence || [];

  return (
    <div className="space-y-6">
      {/* Belief summary */}
      {beliefs.length > 0 && (
        <PanelSection title="Fused State Beliefs">
          <div className="space-y-3">
            {beliefs.map(belief => (
              <BeliefDetail key={belief.attribute} belief={belief} />
            ))}
          </div>
        </PanelSection>
      )}

      {/* Evidence items */}
      {evidence.length > 0 && (
        <PanelSection title={`Ingested Evidence Ledger (${evidence.length})`}>
          <div className="space-y-2">
            {evidence.map(ev => (
              <EvidenceItem key={ev.id} evidence={ev} />
            ))}
          </div>
        </PanelSection>
      )}

      {evidence.length === 0 && beliefs.length === 0 && (
        <div className="text-sm text-slate-400 text-center py-8">
          No evidence signals logged for this incident.
        </div>
      )}
    </div>
  );
}

function BeliefDetail({ belief }) {
  const isContested = belief.state === 'CONTESTED';
  const isSupported = belief.state === 'SUPPORTED';
  const isRefuted = belief.state === 'REFUTED';
  const pct = Math.round(belief.probability * 100);

  return (
    <div className={`
      p-4 rounded-xl border transition-colors
      ${isContested ? 'bg-amber-50/50 border-amber-200' : 'bg-white border-slate-200 shadow-sm'}
    `}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-slate-900">
          {formatAttribute(belief.attribute)}
        </span>
        {isContested && <ContestedBadge />}
        {isSupported && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            Supported
          </span>
        )}
        {isRefuted && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            Refuted
          </span>
        )}
      </div>

      {/* Dual bar — supporting vs refuting */}
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500 w-12">Supporting</span>
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-200"
              style={{ width: `${Math.min(belief.supporting_weight / 5 * 100, 100)}%` }}
            />
          </div>
          <span className="font-mono text-xs text-slate-600 w-7 text-right font-medium">
            {belief.supporting_weight.toFixed(1)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500 w-12">Refuting</span>
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500 rounded-full transition-all duration-200"
              style={{ width: `${Math.min(belief.refuting_weight / 5 * 100, 100)}%` }}
            />
          </div>
          <span className="font-mono text-xs text-slate-600 w-7 text-right font-medium">
            {belief.refuting_weight.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Result metrics */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
        <span className="text-slate-500">
          {belief.evidence_ids.length} corroborated sources
        </span>
        <span className={`font-mono text-sm font-bold ${
          isContested ? 'text-amber-700' :
          pct > 60 ? 'text-blue-600' :
          pct < 40 ? 'text-slate-400' : 'text-amber-700'
        }`}>
          {pct}% Confidence
        </span>
      </div>
    </div>
  );
}

function EvidenceItem({ evidence }) {
  const Icon = SOURCE_ICONS[evidence.source_type] || User;
  const supports = evidence.asserted_probability >= 0.5;

  return (
    <div className={`
      flex items-start gap-3 p-3.5 rounded-xl border
      ${evidence.superseded
        ? 'opacity-50 bg-slate-50 border-slate-200 line-through'
        : 'bg-white border-slate-200 hover:bg-slate-50/70'
      }
      transition-colors duration-100 shadow-xs
    `}>
      <div className="p-2 rounded-lg bg-slate-100 text-slate-600 shrink-0">
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-slate-900 truncate">
            {evidence.source_label}
          </span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${supports ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {supports ? 'Positive' : 'Negative'}
          </span>
        </div>
        <div className="text-xs text-slate-600 font-medium mt-1">
          {formatAttribute(evidence.attribute)}
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400 font-mono">
          <span>Rel: <strong className="text-slate-600 font-normal">{formatConfidence(evidence.source_reliability)}</strong></span>
          <span>Conf: <strong className="text-slate-600 font-normal">{formatConfidence(evidence.extraction_confidence)}</strong></span>
          <span>Weight: <strong className="text-slate-600 font-normal">{evidence.weight.toFixed(2)}</strong></span>
          <span className="ml-auto">{formatTime(evidence.observed_at)}</span>
        </div>
      </div>
    </div>
  );
}
