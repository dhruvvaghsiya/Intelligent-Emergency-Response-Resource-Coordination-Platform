/* =========================================================================
   INCIDENT DETAIL — Spacious Telemetry & Operational Action Rail (480px)
   Features p-6 breathing room, clean tabs, soft belief progress bars.
   ========================================================================= */
import React from 'react';
import { motion } from 'framer-motion';
import { X, MapPin, Clock, Users, ChevronRight, ExternalLink, AlertTriangle } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Button } from '../ui/Button';
import { SeverityChip, IncidentStatusChip, SimBadge, DegradedBadge, ContestedBadge } from '../ui/Chip';
import { PanelSection } from '../ui/Panel';
import { formatTime, formatRelativeTime, formatDuration, formatAttribute, formatCoords } from '../../lib/format';
import { EvidenceLedger } from '../evidence/EvidenceLedger';
import { SeverityPanel } from '../evidence/SeverityPanel';
import { DispatchPanel } from '../dispatch/DispatchPanel';
import { RelatedTab } from './RelatedTab';

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

  return (
    <div className="w-[480px] h-full border-l border-slate-200 bg-white flex flex-col shrink-0 overflow-hidden shadow-lg select-none">
      {/* ——— Header ——— */}
      <div className="p-6 border-b border-slate-100 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-slate-500">{incident.code}</span>
            <SeverityChip severity={incident.severity} score={incident.severity_score} />
            <IncidentStatusChip status={incident.status} />
          </div>
          <div className="flex items-center gap-1.5">
            {incident.is_simulated && <SimBadge />}
            {incident.ai?.degraded && <DegradedBadge />}
            <Button variant="ghost" size="compact" onClick={clearSelection} aria-label="Close detail panel" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700">
              <X size={18} />
            </Button>
          </div>
        </div>

        <h2 className="text-xl font-bold text-slate-900 leading-snug mb-2 tracking-tight">
          {incident.title}
        </h2>

        <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
          <span className="flex items-center gap-1.5">
            <MapPin size={14} className="text-slate-400" />
            {incident.address || formatCoords(incident.location)}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={14} className="text-slate-400" />
            {formatRelativeTime(incident.occurred_at)}
          </span>
        </div>

        {/* Contested attributes */}
        {incident.beliefs?.filter(b => b.state === 'CONTESTED').map(b => (
          <div key={b.attribute} className="mt-3">
            <ContestedBadge attribute={b.attribute} />
          </div>
        ))}
      </div>

      {/* ——— Tabs Navigation ——— */}
      <div className="flex border-b border-slate-200 bg-slate-50/50 px-3 relative">
        {TABS.map(tab => {
          const isActive = rightRailTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setRightRailTab(tab.key)}
              className={`
                relative flex-1 h-11 text-sm font-medium text-center cursor-pointer transition-colors
                ${isActive
                  ? 'text-blue-600 font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
                }
              `}
            >
              {tab.label}
              {isActive && (
                <motion.div
                  layoutId="detail-tab-underline"
                  className="absolute left-2 right-2 -bottom-px h-[2px] bg-blue-600 rounded-full"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ——— Tab Content ——— */}
      <div className="flex-1 overflow-y-auto p-6 bg-white space-y-6">
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
    <div className="space-y-6">
      {/* Description */}
      <PanelSection title="Incident Summary">
        <p className="text-sm text-slate-700 leading-relaxed font-sans">{incident.description}</p>
        {incident.ai?.briefing && (
          <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-xs font-semibold text-blue-700 mb-1.5 flex items-center gap-2">
              <span>AI Synthesized Briefing</span>
              {incident.ai.degraded && <DegradedBadge />}
            </div>
            <p className="text-sm text-slate-700 leading-relaxed font-sans">{incident.ai.briefing}</p>
          </div>
        )}
      </PanelSection>

      {/* Severity */}
      <SeverityPanel assessment={incident.severity_assessment} incidentId={incident.id} />

      {/* Beliefs summary */}
      {incident.beliefs && incident.beliefs.length > 0 && (
        <PanelSection title="Probabilistic State Beliefs">
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            {incident.beliefs.map(belief => (
              <BeliefBar key={belief.attribute} belief={belief} />
            ))}
          </div>
        </PanelSection>
      )}

      {/* Quick stats */}
      <PanelSection title="Response Units">
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Reports" value={incident.report_count} />
          <StatCard label="Units Dispatched" value={`${incident.assigned_unit_count}/${incident.units_required}`} />
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
    <div className="flex items-center gap-3">
      <span className={`text-sm w-32 truncate ${isContested ? 'text-amber-800 font-semibold' : 'text-slate-700 font-medium'}`}>
        {formatAttribute(belief.attribute)}
      </span>
      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-200 ${
            isContested ? 'bg-amber-500' :
            belief.probability > 0.6 ? 'bg-blue-600' :
            belief.probability < 0.4 ? 'bg-slate-400' : 'bg-amber-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-xs text-slate-500 w-9 text-right font-medium">
        {pct}%
      </span>
      {isContested && <AlertTriangle size={14} className="text-amber-600 shrink-0" />}
    </div>
  );
}

function StatCard({ label, value, small = false }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="text-xs text-slate-500 font-medium mb-1">{label}</div>
      <div className={`font-semibold text-slate-900 ${small ? 'text-base' : 'text-xl'}`}>
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
    <div className="space-y-5">
      <PanelSection title={`Assigned Fleet (${incident.assigned_unit_count}/${incident.units_required})`}>
        {incident.assignments && incident.assignments.length > 0 ? (
          <div className="space-y-3">
            {incident.assignments.map(asg => (
              <div key={asg.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-sm font-bold text-slate-900">{asg.unit_call_sign}</span>
                  <IncidentStatusChip status={asg.status} />
                </div>
                {asg.eta_seconds != null && asg.status === 'EN_ROUTE' && (
                  <div className="text-sm text-slate-600">
                    ETA: <strong className="font-semibold text-blue-600">{formatDuration(asg.eta_seconds)}</strong>
                    {asg.eta_method === 'HAVERSINE_FALLBACK' && (
                      <span className="text-xs text-amber-700 ml-1.5 font-medium">(estimated)</span>
                    )}
                  </div>
                )}
                {asg.rationale && asg.rationale.length > 0 && (
                  <div className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
                    {asg.rationale.join(' · ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 py-3">
            No units assigned yet. Review dispatch options below.
          </p>
        )}
      </PanelSection>

      {incident.required_capabilities && incident.required_capabilities.length > 0 && (
        <PanelSection title="Required Capabilities">
          <div className="flex flex-wrap gap-2">
            {incident.required_capabilities.map((cap, i) => (
              <span key={i} className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700">
                {cap.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </PanelSection>
      )}

      {/* Dispatch recommendations — reachable for any non-terminal, understaffed incident */}
      {!['CLOSED', 'MERGED', 'FALSE_ALARM', 'RESOLVED'].includes(incident.status) &&
        incident.assigned_unit_count < incident.units_required && (
        <DispatchPanel incidentId={incident.id} />
      )}
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
      text: `${a.unit_call_sign} on scene`,
    })),
  ].sort((a, b) => new Date(b.ts) - new Date(a.ts));

  return (
    <div className="space-y-0 relative">
      {events.map((evt, i) => (
        <div key={i} className="flex gap-4 py-3 border-b border-slate-100 last:border-b-0">
          <div className="flex flex-col items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600 mt-1" />
            {i < events.length - 1 && <div className="w-[1px] flex-1 bg-slate-200 mt-1" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-slate-800 font-medium leading-snug">{evt.text}</div>
            <div className="text-xs text-slate-400 font-mono mt-0.5">{formatTime(evt.ts)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
