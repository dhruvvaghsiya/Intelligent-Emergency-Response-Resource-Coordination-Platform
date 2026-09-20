/* =========================================================================
   EVIDENCE LEDGER — Multi-Source Evidence & Belief Fusion (Light Theme)
   ========================================================================= */
import React, { useState } from 'react';
import { AlertTriangle, Eye, EyeOff, User, Radio, Cpu, Globe, Phone, Ban, ShieldCheck } from 'lucide-react';
import { PanelSection } from '../ui/Panel';
import { ContestedBadge } from '../ui/Chip';
import { formatAttribute, formatTime, formatProbability, formatConfidence } from '../../lib/format';
import { SOURCE_RELIABILITY } from '../../lib/constants';
import { evidenceApi } from '../../lib/api';
import { useStore } from '../../lib/store';

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
    <div className="space-y-4 font-sans text-slate-900">
      {/* 1. Belief Summary Card */}
      {beliefs.length > 0 && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold shrink-0 shadow-2xs">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Fused State Beliefs
              </h3>
              <p className="text-[11px] font-medium text-slate-500">
                Multi-source probabilistic Bayesian inference & confidence state
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {beliefs.map(belief => (
              <BeliefDetail key={belief.attribute} belief={belief} />
            ))}
          </div>
        </div>
      )}

      {/* 2. Evidence Ledger Card */}
      {evidence.length > 0 && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold shrink-0 shadow-2xs">
              <Eye size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Ingested Evidence Ledger ({evidence.length})
              </h3>
              <p className="text-[11px] font-medium text-slate-500">
                Structured signal telemetry, extraction confidence & source reliability
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {evidence.map(ev => (
              <EvidenceItem key={ev.id} evidence={ev} incidentId={incident.id} />
            ))}
          </div>
        </div>
      )}

      {evidence.length === 0 && beliefs.length === 0 && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 text-center text-xs font-medium text-slate-500 shadow-xs">
          No evidence signals or probabilistic beliefs logged for this incident.
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
      p-4 rounded-xl border transition-colors shadow-2xs
      ${isContested ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50/70 border-slate-200'}
    `}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-slate-900">
          {formatAttribute(belief.attribute)}
        </span>
        {isContested && <ContestedBadge />}
        {isSupported && (
          <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
            Supported
          </span>
        )}
        {isRefuted && (
          <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs">
            Refuted
          </span>
        )}
      </div>

      {/* Dual bar — supporting vs refuting */}
      <div className="space-y-2 mb-3 bg-white p-3 rounded-lg border border-slate-200/70">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 w-20 shrink-0">Supporting</span>
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(belief.supporting_weight / 5 * 100, 100)}%` }}
            />
          </div>
          <span className="font-mono text-xs text-slate-700 w-7 text-right font-bold">
            {belief.supporting_weight.toFixed(1)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 w-20 shrink-0">Refuting</span>
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
            <div
              className="h-full bg-red-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(belief.refuting_weight / 5 * 100, 100)}%` }}
            />
          </div>
          <span className="font-mono text-xs text-slate-700 w-7 text-right font-bold">
            {belief.refuting_weight.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Result metrics */}
      <div className="flex items-center justify-between pt-1 text-xs">
        <span className="text-slate-500 font-medium">
          {belief.evidence_ids.length} corroborated sources
        </span>
        <span className={`font-mono text-xs sm:text-sm font-bold ${
          isContested ? 'text-amber-700' :
          pct > 60 ? 'text-blue-600' :
          pct < 40 ? 'text-slate-500' : 'text-amber-700'
        }`}>
          {pct}% Confidence
        </span>
      </div>
    </div>
  );
}

function EvidenceItem({ evidence, incidentId }) {
  const Icon = SOURCE_ICONS[evidence.source_type] || User;
  const supports = evidence.asserted_probability >= 0.5;
  const [showReason, setShowReason] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fetchIncidentDetail = useStore(s => s.fetchIncidentDetail);

  const supersede = async () => {
    setBusy(true);
    setError('');
    try {
      await evidenceApi.supersede(incidentId, evidence.id, reason || 'Superseded by operator');
      await fetchIncidentDetail(incidentId);
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Failed to supersede evidence');
      setBusy(false);
    }
  };

  return (
    <div className={`
      flex items-start gap-3 p-3.5 rounded-xl border
      ${evidence.superseded
        ? 'opacity-60 bg-slate-50 border-slate-200 line-through'
        : 'bg-slate-50/60 border-slate-200/90 hover:bg-slate-50'
      }
      transition-colors duration-100 shadow-2xs
    `}>
      <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-600 shrink-0 shadow-2xs">
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
            {evidence.source_label}
          </span>
          <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-md border shrink-0 ${supports ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
            {supports ? 'Positive' : 'Negative'}
          </span>
        </div>
        <div className="text-xs text-slate-700 font-semibold mt-1">
          {formatAttribute(evidence.attribute)}
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-500 font-mono">
          <span>Rel: <strong className="text-slate-800 font-semibold">{formatConfidence(evidence.source_reliability)}</strong></span>
          <span>Conf: <strong className="text-slate-800 font-semibold">{formatConfidence(evidence.extraction_confidence)}</strong></span>
          <span>Weight: <strong className="text-slate-800 font-semibold">{evidence.weight.toFixed(2)}</strong></span>
          <span className="ml-auto text-slate-400 font-medium">{formatTime(evidence.observed_at)}</span>
        </div>
        {evidence.superseded ? (
          <div className="text-[11px] text-amber-700 font-medium mt-1.5 no-underline">Superseded{evidence.superseded_reason ? `: ${evidence.superseded_reason}` : ''}</div>
        ) : showReason ? (
          <div className="flex items-center gap-2 mt-2">
            <input
              type="text" value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Reason for superseding..."
              className="flex-1 h-8 px-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
            />
            <Button variant="danger" size="compact" className="h-8 px-3 text-xs" onClick={supersede} disabled={busy}>
              {busy ? 'Superseding...' : 'Confirm'}
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setShowReason(true)}
            className="text-[11px] font-semibold text-slate-400 hover:text-red-600 mt-2 flex items-center gap-1 cursor-pointer transition-colors no-underline"
          >
            <Ban size={11} />
            Supersede Signal
          </button>
        )}
        {error && <div className="text-[11px] text-red-600 font-semibold mt-1">{error}</div>}
      </div>
    </div>
  );
}
