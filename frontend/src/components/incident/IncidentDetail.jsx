/* =========================================================================
   INCIDENT DETAIL — Right Rail (420px)
   §14.3: Tabs: Overview · Evidence · Response · Related · Timeline
   ========================================================================= */
import React from 'react';
import { X, MapPin, Clock, Users, ChevronRight, ExternalLink, AlertTriangle, Crosshair } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Button } from '../ui/Button';
import { SeverityChip, IncidentStatusChip, SimBadge, DegradedBadge, ContestedBadge } from '../ui/Chip';
import { Panel, PanelSection } from '../ui/Panel';
import { INCIDENT_TYPE_CONFIG, SEVERITY_CONFIG } from '../../lib/constants';
import { formatTime, formatRelativeTime, formatDuration, formatProbability, formatAttribute, formatCoords } from '../../lib/format';
import { EvidenceLedger } from '../evidence/EvidenceLedger';
import { SeverityPanel } from '../evidence/SeverityPanel';

const TABS = [
  { key: 'overview',  label: 'Overview' },
  { key: 'evidence',  label: 'Evidence' },
  { key: 'response',  label: 'Response' },
  { key: 'related',   label: 'Related' },
  { key: 'timeline',  label: 'Timeline' },
];

export function IncidentDetail() {
  const { selectedIncidentId, incidents, clearSelection, rightRailTab, setRightRailTab } = useStore();
  const incident = incidents.find(i => i.id === selectedIncidentId);

  if (!incident) return null;

  const typeConfig = INCIDENT_TYPE_CONFIG[incident.type] || INCIDENT_TYPE_CONFIG.UNKNOWN;

  return (
    <div className="w-[420px] h-full border-l border-border-subtle bg-surface flex flex-col shrink-0 overflow-hidden animate-slide-in-right">
      {/* ——— Header ——— */}
      <div className="px-3 py-2.5 border-b border-border-subtle bg-inset">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[12px] text-text-muted">{incident.code}</span>
            <SeverityChip severity={incident.severity} score={incident.severity_score} />
            <IncidentStatusChip status={incident.status} />
          </div>
          <div className="flex items-center gap-1">
            {incident.is_simulated && <SimBadge />}
            {incident.ai?.degraded && <DegradedBadge />}
            <Button variant="ghost" size="icon" onClick={clearSelection} aria-label="Close detail panel">
              <X size={16} />
            </Button>
          </div>
        </div>
        <h2 className="text-[15px] font-medium text-text-primary leading-tight mb-1.5">
          {incident.title}
        </h2>
        <div className="flex items-center gap-3 text-[11px] text-text-muted">
          <span className="flex items-center gap-1">
            <MapPin size={10} />
            {incident.address || formatCoords(incident.location)}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={10} />
            {formatRelativeTime(incident.occurred_at)}
          </span>
        </div>
        {/* Contested attributes */}
        {incident.beliefs?.filter(b => b.state === 'CONTESTED').map(b => (
          <div key={b.attribute} className="mt-2">
            <ContestedBadge attribute={b.attribute} />
          </div>
        ))}
      </div>

      {/* ——— Tabs ——— */}
      <div className="flex border-b border-border-subtle">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setRightRailTab(tab.key)}
            className={`
              flex-1 h-[32px] text-[12px] font-medium text-center cursor-pointer
              transition-colors duration-[80ms] border-b-2
              ${rightRailTab === tab.key
                ? 'text-accent border-b-accent bg-accent-muted/30'
                : 'text-text-muted border-b-transparent hover:text-text-secondary hover:bg-hover'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ——— Tab Content ——— */}
      <div className="flex-1 overflow-y-auto p-3">
        {rightRailTab === 'overview' && <OverviewTab incident={incident} />}
        {rightRailTab === 'evidence' && <EvidenceTab incident={incident} />}
        {rightRailTab === 'response' && <ResponseTab incident={incident} />}
        {rightRailTab === 'related' && <RelatedTab incident={incident} />}
        {rightRailTab === 'timeline' && <TimelineTab incident={incident} />}
      </div>
    </div>
  );
}

// ——— OVERVIEW TAB ———
function OverviewTab({ incident }) {
  return (
    <div className="space-y-4">
      {/* Description */}
      <PanelSection title="Summary">
        <p className="text-[13px] text-text-secondary leading-relaxed">{incident.description}</p>
        {incident.ai?.briefing && (
          <div className="mt-2 px-2.5 py-2 bg-inset rounded-[4px] border border-border-subtle">
            <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
              AI Briefing
              {incident.ai.degraded && <DegradedBadge />}
            </div>
            <p className="text-[12px] text-text-secondary leading-relaxed">{incident.ai.briefing}</p>
          </div>
        )}
      </PanelSection>

      {/* Severity */}
      <SeverityPanel assessment={incident.severity_assessment} />

      {/* Beliefs summary */}
      {incident.beliefs && incident.beliefs.length > 0 && (
        <PanelSection title="Key beliefs">
          <div className="space-y-1.5">
            {incident.beliefs.map(belief => (
              <BeliefBar key={belief.attribute} belief={belief} />
            ))}
          </div>
        </PanelSection>
      )}

      {/* Quick stats */}
      <PanelSection title="Response">
        <div className="grid grid-cols-3 gap-2">
          <StatCard label="Reports" value={incident.report_count} />
          <StatCard label="Units" value={`${incident.assigned_unit_count}/${incident.units_required}`} />
          <StatCard label="Ward" value={incident.ward || '—'} small />
        </div>
      </PanelSection>
    </div>
  );
}

function BeliefBar({ belief }) {
  const isContested = belief.state === 'CONTESTED';
  const pct = Math.round(belief.probability * 100);

  return (
    <div className="flex items-center gap-2">
      <span className={`text-[11px] w-[100px] truncate ${isContested ? 'text-sev-high font-medium' : 'text-text-secondary'}`}>
        {formatAttribute(belief.attribute)}
      </span>
      <div className="flex-1 h-[6px] bg-inset rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-[220ms] ${
            isContested ? 'bg-sev-high' :
            belief.probability > 0.6 ? 'bg-accent' :
            belief.probability < 0.4 ? 'bg-text-muted' : 'bg-sev-moderate'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-[11px] text-text-muted w-[36px] text-right">
        {pct}%
      </span>
      {isContested && <AlertTriangle size={12} className="text-sev-high shrink-0" />}
    </div>
  );
}

function StatCard({ label, value, small = false }) {
  return (
    <div className="bg-inset rounded-[4px] px-2 py-1.5 border border-border-subtle">
      <div className="text-[10px] text-text-muted uppercase tracking-wider">{label}</div>
      <div className={`font-mono font-semibold text-text-primary ${small ? 'text-[13px]' : 'text-[17px]'}`}>
        {value}
      </div>
    </div>
  );
}

// ——— EVIDENCE TAB ———
function EvidenceTab({ incident }) {
  return <EvidenceLedger incident={incident} />;
}

// ——— RESPONSE TAB ———
function ResponseTab({ incident }) {
  return (
    <div className="space-y-3">
      <PanelSection title={`Assigned units (${incident.assigned_unit_count}/${incident.units_required})`}>
        {incident.assignments && incident.assignments.length > 0 ? (
          <div className="space-y-2">
            {incident.assignments.map(asg => (
              <div key={asg.id} className="bg-inset border border-border-subtle rounded-[4px] px-2.5 py-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[13px] font-semibold text-text-primary">{asg.unit_call_sign}</span>
                  <IncidentStatusChip status={asg.status} />
                </div>
                {asg.eta_seconds != null && asg.status === 'EN_ROUTE' && (
                  <div className="text-[12px] text-text-secondary">
                    ETA: <span className="font-mono font-medium text-accent">{formatDuration(asg.eta_seconds)}</span>
                    {asg.eta_method === 'HAVERSINE_FALLBACK' && (
                      <span className="text-[10px] text-sev-high ml-1">(est.)</span>
                    )}
                  </div>
                )}
                {asg.rationale && asg.rationale.length > 0 && (
                  <div className="text-[11px] text-text-muted mt-1">
                    {asg.rationale.join(' · ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-text-muted">No units assigned yet. Check the dispatch panel for recommendations.</p>
        )}
      </PanelSection>

      {incident.required_capabilities && incident.required_capabilities.length > 0 && (
        <PanelSection title="Required capabilities">
          <div className="flex flex-wrap gap-1">
            {incident.required_capabilities.map((cap, i) => (
              <span key={i} className="px-2 py-0.5 bg-inset border border-border-subtle rounded text-[11px] text-text-secondary">
                {cap.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </PanelSection>
      )}
    </div>
  );
}

// ——— RELATED TAB ———
function RelatedTab({ incident }) {
  return (
    <div className="text-[13px] text-text-muted py-4 text-center">
      No related incidents linked.
    </div>
  );
}

// ——— TIMELINE TAB ———
function TimelineTab({ incident }) {
  const events = [
    { ts: incident.occurred_at, type: 'incident.created', text: `Incident created from ${incident.report_count} reports` },
    ...(incident.assignments || []).map(a => ({
      ts: a.proposed_at,
      type: 'assignment.proposed',
      text: `${a.unit_call_sign} proposed — ${a.rationale?.[0] || ''}`,
    })),
    ...(incident.assignments || []).filter(a => a.approved_at).map(a => ({
      ts: a.approved_at,
      type: 'assignment.approved',
      text: `${a.unit_call_sign} approved and dispatched`,
    })),
    ...(incident.assignments || []).filter(a => a.arrived_at).map(a => ({
      ts: a.arrived_at,
      type: 'unit.on_scene',
      text: `${a.unit_call_sign} arrived on scene`,
    })),
  ].sort((a, b) => new Date(b.ts) - new Date(a.ts));

  return (
    <div className="space-y-0">
      {events.map((evt, i) => (
        <div key={i} className="flex gap-3 py-2 border-b border-border-subtle last:border-b-0">
          <div className="flex flex-col items-center">
            <div className="w-2 h-2 rounded-full bg-accent mt-1" />
            {i < events.length - 1 && <div className="w-[1px] flex-1 bg-border-subtle mt-1" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] text-text-primary">{evt.text}</div>
            <div className="text-[11px] text-text-muted font-mono mt-0.5">{formatTime(evt.ts)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
