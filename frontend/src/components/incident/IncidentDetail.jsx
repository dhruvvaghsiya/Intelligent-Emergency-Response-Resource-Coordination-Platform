/* =========================================================================
   INCIDENT DETAIL — Google Material Inspired Operational Action Drawer (480px)
   Minimalist design, increased typography, touch-friendly controls & generous spacing.
   ========================================================================= */
import React from 'react';
import { motion } from 'framer-motion';
import { X, MapPin, Clock, Users, ChevronRight, ExternalLink, AlertTriangle, FileText, Shield } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Button } from '../ui/Button';
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

const SEVERITY_DOT_COLORS = {
  CRITICAL: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MODERATE: 'bg-amber-500',
  LOW: 'bg-emerald-500',
  INFO: 'bg-blue-500',
};

const SEVERITY_TAG_STYLES = {
  CRITICAL: 'text-red-700 bg-red-50/90 border-red-200/70',
  HIGH: 'text-orange-700 bg-orange-50/90 border-orange-200/70',
  MODERATE: 'text-amber-700 bg-amber-50/90 border-amber-200/70',
  LOW: 'text-emerald-700 bg-emerald-50/90 border-emerald-200/70',
  INFO: 'text-blue-700 bg-blue-50/90 border-blue-200/70',
};

export function IncidentDetail() {
  const { selectedIncidentId, incidents, clearSelection, rightRailTab, setRightRailTab } = useStore();
  const incident = incidents.find(i => i.id === selectedIncidentId);

  if (!incident) return null;

  const dotBg = SEVERITY_DOT_COLORS[incident.severity] || 'bg-slate-400';
  const tagStyle = SEVERITY_TAG_STYLES[incident.severity] || 'text-slate-700 bg-slate-100 border-slate-200';

  return (
    <div className="w-[480px] max-w-[92vw] h-full border-l border-slate-200/80 bg-white flex flex-col shrink-0 overflow-hidden shadow-2xl select-none z-30">
      {/* ——— Header ——— */}
      <div className="p-5 sm:p-6 border-b border-slate-200/80 bg-white shrink-0 space-y-3">
        {/* Row 1: Code + Severity Pill + Status + Close Button */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold text-slate-400 tracking-wider">
              {incident.code}
            </span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${tagStyle}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${dotBg}`} />
              {incident.severity?.toLowerCase()} {incident.severity_score && `· ${incident.severity_score}`}
            </span>
            <span className="text-xs font-semibold text-slate-500 capitalize px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/70">
              {incident.status?.replace(/_/g, ' ').toLowerCase()}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {incident.is_simulated && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                Simulated
              </span>
            )}
            <button
              onClick={clearSelection}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              title="Close detail panel"
              aria-label="Close detail panel"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Row 2: Headline Title */}
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug tracking-tight">
          {incident.title}
        </h2>

        {/* Row 3: Location & Time Details */}
        <div className="flex items-center gap-4 text-xs sm:text-sm font-semibold text-slate-600 flex-wrap pt-0.5">
          <span className="flex items-center gap-1.5">
            <MapPin size={15} className="text-slate-400 shrink-0" />
            {incident.address || formatCoords(incident.location)}
          </span>
          <span className="text-slate-300">·</span>
          <span className="flex items-center gap-1.5">
            <Clock size={15} className="text-slate-400 shrink-0" />
            {formatRelativeTime(incident.occurred_at)}
          </span>
        </div>

        {/* Contested Warnings */}
        {incident.beliefs?.filter(b => b.state === 'CONTESTED').map(b => (
          <div key={b.attribute} className="mt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs">
              <AlertTriangle size={13} className="text-amber-600 shrink-0" />
              <span>Contested ({formatAttribute(b.attribute)})</span>
            </span>
          </div>
        ))}
      </div>

      {/* ——— Tabs Navigation ——— */}
      <div className="flex border-b border-slate-200/80 bg-slate-50/70 px-2 shrink-0 relative h-12 items-center">
        {TABS.map(tab => {
          const isActive = rightRailTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setRightRailTab(tab.key)}
              className={`
                relative flex-1 h-full flex items-center justify-center text-xs sm:text-sm font-semibold cursor-pointer transition-colors whitespace-nowrap px-1
                ${isActive
                  ? 'text-blue-600 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
                }
              `}
            >
              <span className="py-1">{tab.label}</span>
              {isActive && (
                <motion.div
                  layoutId="detail-tab-underline"
                  className="absolute left-1 right-1 bottom-0 h-0.5 bg-blue-600 rounded-t-md z-10"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ——— Tab Content Container ——— */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-50/40 space-y-6">
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
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-sans">{incident.description}</p>
          {incident.ai?.briefing && (
            <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200/70 space-y-1.5">
              <div className="text-xs font-bold text-blue-700 flex items-center gap-2">
                <Shield size={14} className="text-blue-600" />
                <span>AI Synthesized Briefing</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-sans">{incident.ai.briefing}</p>
            </div>
          )}
        </div>
      </PanelSection>

      {/* Severity Model */}
      <SeverityPanel assessment={incident.severity_assessment} incidentId={incident.id} />

      {/* Beliefs summary */}
      {incident.beliefs && incident.beliefs.length > 0 && (
        <PanelSection title="Probabilistic State Beliefs">
          <div className="space-y-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            {incident.beliefs.map(belief => (
              <BeliefBar key={belief.attribute} belief={belief} />
            ))}
          </div>
        </PanelSection>
      )}

      {/* Quick stats */}
      <PanelSection title="Response Units Overview">
        <div className="grid grid-cols-3 gap-3.5">
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
      <span className={`text-xs sm:text-sm w-36 truncate ${isContested ? 'text-amber-800 font-bold' : 'text-slate-700 font-semibold'}`}>
        {formatAttribute(belief.attribute)}
      </span>
      <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isContested ? 'bg-amber-500' :
            belief.probability > 0.6 ? 'bg-blue-600' :
            belief.probability < 0.4 ? 'bg-slate-400' : 'bg-amber-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-xs text-slate-500 w-10 text-right font-bold">
        {pct}%
      </span>
      {isContested && <AlertTriangle size={15} className="text-amber-600 shrink-0" />}
    </div>
  );
}

function StatCard({ label, value, small = false }) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs text-center">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">{label}</div>
      <div className={`font-bold text-slate-900 ${small ? 'text-sm sm:text-base' : 'text-lg sm:text-xl'}`}>
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
    <div className="space-y-6">
      <PanelSection title={`Assigned Fleet (${incident.assigned_unit_count}/${incident.units_required})`}>
        {incident.assignments && incident.assignments.length > 0 ? (
          <div className="space-y-3.5">
            {incident.assignments.map(asg => (
              <div key={asg.id} className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-2xs space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-sm font-bold text-slate-900">{asg.unit_call_sign}</span>
                  <span className="text-xs font-semibold text-slate-600 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200/80 capitalize">
                    {asg.status?.replace(/_/g, ' ').toLowerCase()}
                  </span>
                </div>
                {asg.eta_seconds != null && asg.status === 'EN_ROUTE' && (
                  <div className="text-xs sm:text-sm text-slate-600 font-medium">
                    ETA: <strong className="font-bold text-blue-600">{formatDuration(asg.eta_seconds)}</strong>
                    {asg.eta_method === 'HAVERSINE_FALLBACK' && (
                      <span className="text-xs text-amber-700 ml-1.5 font-medium">(estimated)</span>
                    )}
                  </div>
                )}
                {asg.rationale && asg.rationale.length > 0 && (
                  <div className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                    {asg.rationale.join(' · ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 text-center">
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              No units assigned yet. Review dispatch options below.
            </p>
          </div>
        )}
      </PanelSection>

      {incident.required_capabilities && incident.required_capabilities.length > 0 && (
        <PanelSection title="Required Capabilities">
          <div className="flex flex-wrap gap-2">
            {incident.required_capabilities.map((cap, i) => (
              <span key={i} className="px-3 py-1 bg-white border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs">
                {cap.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </PanelSection>
      )}

      {/* Dispatch recommendations */}
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
    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-0 relative">
      {events.map((evt, i) => (
        <div key={i} className="flex gap-4 py-3 border-b border-slate-100 last:border-b-0">
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-blue-600 mt-1 shadow-2xs" />
            {i < events.length - 1 && <div className="w-[1.5px] flex-1 bg-slate-200 mt-1" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs sm:text-sm text-slate-800 font-semibold leading-snug">{evt.text}</div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5 font-medium">{formatTime(evt.ts)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
