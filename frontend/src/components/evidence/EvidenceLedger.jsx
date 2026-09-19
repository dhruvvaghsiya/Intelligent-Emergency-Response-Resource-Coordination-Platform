/* =========================================================================
   EVIDENCE LEDGER — §W1 Evidence Ledger & Belief Fusion
   Shows evidence items with source reliability, confidence, belief bars
   CONTESTED detection, operator supersede action
   ========================================================================= */
import React, { useState } from 'react';
import { AlertTriangle, Eye, EyeOff, User, Radio, Cpu, Globe, Phone, Ban } from 'lucide-react';
import { PanelSection } from '../ui/Panel';
import { ContestedBadge } from '../ui/Chip';
import { Button } from '../ui/Button';
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
    <div className="space-y-4">
      {/* Belief summary */}
      {beliefs.length > 0 && (
        <PanelSection title="Fused beliefs">
          <div className="space-y-2.5">
            {beliefs.map(belief => (
              <BeliefDetail key={belief.attribute} belief={belief} />
            ))}
          </div>
        </PanelSection>
      )}

      {/* Evidence items */}
      {evidence.length > 0 && (
        <PanelSection title={`Evidence ledger (${evidence.length})`}>
          <div className="space-y-1.5">
            {evidence.map(ev => (
              <EvidenceItem key={ev.id} evidence={ev} incidentId={incident.id} />
            ))}
          </div>
        </PanelSection>
      )}

      {evidence.length === 0 && beliefs.length === 0 && (
        <div className="text-[13px] text-text-muted text-center py-4">
          No evidence items recorded for this incident.
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
      px-2.5 py-2 rounded-[4px] border
      ${isContested ? 'bg-sev-high-bg/50 border-sev-high/30' :
        isSupported ? 'bg-surface border-border-subtle' :
        'bg-surface border-border-subtle'}
    `}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12px] font-medium text-text-primary">
          {formatAttribute(belief.attribute)}
        </span>
        {isContested && <ContestedBadge />}
        {isSupported && (
          <span className="text-[10px] text-accent font-medium uppercase">Supported</span>
        )}
        {isRefuted && (
          <span className="text-[10px] text-text-muted font-medium uppercase">Refuted</span>
        )}
      </div>

      {/* Dual bar — supporting vs refuting */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] text-text-muted w-[28px]">For</span>
        <div className="flex-1 h-[5px] bg-inset rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-[220ms]"
            style={{ width: `${Math.min(belief.supporting_weight / 5 * 100, 100)}%` }}
          />
        </div>
        <span className="font-mono text-[10px] text-text-muted w-[28px] text-right">
          {belief.supporting_weight.toFixed(1)}
        </span>
      </div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[10px] text-text-muted w-[28px]">Against</span>
        <div className="flex-1 h-[5px] bg-inset rounded-full overflow-hidden">
          <div
            className="h-full bg-sev-critical rounded-full transition-all duration-[220ms]"
            style={{ width: `${Math.min(belief.refuting_weight / 5 * 100, 100)}%` }}
          />
        </div>
        <span className="font-mono text-[10px] text-text-muted w-[28px] text-right">
          {belief.refuting_weight.toFixed(1)}
        </span>
      </div>

      {/* Result */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-text-muted">
          {belief.evidence_ids.length} evidence source{belief.evidence_ids.length !== 1 ? 's' : ''}
        </span>
        <span className={`font-mono text-[13px] font-semibold ${
          isContested ? 'text-sev-high' :
          pct > 60 ? 'text-accent' :
          pct < 40 ? 'text-text-muted' : 'text-sev-moderate'
        }`}>
          {pct}%
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
      flex items-start gap-2 px-2 py-1.5 rounded-[4px] border
      ${evidence.superseded
        ? 'opacity-50 bg-inset border-border-subtle line-through'
        : 'bg-surface border-border-subtle hover:bg-hover'
      }
      transition-colors
    `}>
      <Icon size={14} className="mt-0.5 text-text-muted shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] text-text-primary font-medium truncate">
            {evidence.source_label}
          </span>
          <span className={`text-[10px] font-mono ${supports ? 'text-accent' : 'text-sev-critical'}`}>
            {supports ? '✓' : '✗'} {formatAttribute(evidence.attribute)}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-[10px] text-text-muted">
          <span>Reliability: {formatConfidence(evidence.source_reliability)}</span>
          <span>Confidence: {formatConfidence(evidence.extraction_confidence)}</span>
          <span>Weight: {evidence.weight.toFixed(3)}</span>
          <span className="font-mono">{formatTime(evidence.observed_at)}</span>
        </div>
        {evidence.superseded ? (
          <div className="text-[10px] text-sev-moderate mt-1 no-underline">Superseded{evidence.superseded_reason ? `: ${evidence.superseded_reason}` : ''}</div>
        ) : showReason ? (
          <div className="flex items-center gap-1.5 mt-1.5">
            <input
              type="text" value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Reason for superseding..."
              className="flex-1 h-[24px] px-2 bg-inset border border-border-subtle rounded text-[11px] text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none"
            />
            <Button variant="danger" size="compact" onClick={supersede} disabled={busy}>
              {busy ? 'Superseding...' : 'Confirm'}
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setShowReason(true)}
            className="text-[10px] text-text-muted hover:text-sev-critical mt-1 flex items-center gap-1 cursor-pointer transition-colors no-underline"
          >
            <Ban size={10} />
            Supersede
          </button>
        )}
        {error && <div className="text-[10px] text-sev-critical mt-1">{error}</div>}
      </div>
    </div>
  );
}
