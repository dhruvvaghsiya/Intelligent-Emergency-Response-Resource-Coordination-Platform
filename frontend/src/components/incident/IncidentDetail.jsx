/* =========================================================================
   INCIDENT DETAIL — Google Material Inspired Operational Action Drawer (480px)
   Minimalist design, increased typography, touch-friendly controls & generous spacing.
   ========================================================================= */
import React from 'react';
import { motion } from 'framer-motion';
import { X, MapPin, Clock, Users, ChevronRight, ExternalLink, AlertTriangle, FileText, Shield, Truck, ShieldCheck, Activity } from 'lucide-react';
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
    <div className="w-full h-full flex flex-col shrink-0 overflow-hidden select-none bg-transparent gap-2">
      {/* ——— Header ——— */}
      <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-xs shrink-0 space-y-2.5">
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
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              title="Close detail panel"
              aria-label="Close detail panel"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Row 2: Headline Title */}
        <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug tracking-tight">
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
      <div className="flex bg-white rounded-xl border border-slate-200/90 shadow-xs px-2 shrink-0 relative h-10 items-center overflow-hidden">
        {TABS.map(tab => {
          const isActive = rightRailTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setRightRailTab(tab.key)}
              className={`
                relative flex-1 h-full flex items-center justify-center text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap px-1
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
      <div className="flex-1 overflow-y-auto pr-1 space-y-3">
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
    <div className="space-y-4 font-sans text-slate-900">
      {/* 1. Incident Summary Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold shrink-0 shadow-2xs">
            <FileText size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Incident Summary
            </h3>
            <p className="text-[11px] font-medium text-slate-500">
              AI-generated briefing and operator report synthesis
            </p>
          </div>
        </div>

        <div className="space-y-3">
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
      </div>

      {/* 2. Severity Attribution Model Card */}
      <SeverityPanel assessment={incident.severity_assessment} incidentId={incident.id} />

      {/* 3. Probabilistic State Beliefs Card */}
      {incident.beliefs && incident.beliefs.length > 0 && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold shrink-0 shadow-2xs">
              <Activity size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Probabilistic State Beliefs
              </h3>
              <p className="text-[11px] font-medium text-slate-500">
                Fused Bayesian belief probabilities across incident attributes
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {incident.beliefs.map(belief => (
              <BeliefBar key={belief.attribute} belief={belief} />
            ))}
          </div>
        </div>
      )}

      {/* 4. Response Units Overview Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold shrink-0 shadow-2xs">
            <Users size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Response Units Overview
            </h3>
            <p className="text-[11px] font-medium text-slate-500">
              Aggregated reports, dispatch counts & ward allocation
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-1">
          <StatCard label="Reports" value={incident.report_count} />
          <StatCard label="Units Dispatched" value={`${incident.assigned_unit_count}/${incident.units_required}`} />
          <StatCard label="Ward" value={incident.ward || '—'} small />
        </div>
      </div>
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
    <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 shadow-2xs text-center">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{label}</div>
      <div className={`font-bold text-slate-900 ${small ? 'text-xs sm:text-sm' : 'text-base sm:text-lg'}`}>
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
    <div className="space-y-4 font-sans text-slate-900">
      {/* 1. Assigned Fleet Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold shrink-0 shadow-2xs">
              <Truck size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Assigned Response Fleet
              </h3>
              <p className="text-[11px] font-medium text-slate-500">
                Active unit dispatches and real-time transit telemetry
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full shrink-0">
            {incident.assigned_unit_count}/{incident.units_required} Units
          </span>
        </div>

        {incident.assignments && incident.assignments.length > 0 ? (
          <div className="space-y-3">
            {incident.assignments.map(asg => (
              <div key={asg.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-extrabold text-slate-900 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                      {asg.unit_call_sign}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border text-emerald-700 bg-emerald-50 border-emerald-200">
                    {asg.status?.replace(/_/g, ' ')}
                  </span>
                </div>

                {asg.eta_seconds != null && asg.status === 'EN_ROUTE' && (
                  <div className="text-xs text-slate-700 font-semibold bg-white p-2.5 rounded-lg border border-slate-200/70">
                    ETA: <strong className="font-bold text-blue-600">{formatDuration(asg.eta_seconds)}</strong>
                    {asg.eta_method === 'HAVERSINE_FALLBACK' && (
                      <span className="text-xs text-amber-700 ml-1.5 font-medium">(estimated)</span>
                    )}
                  </div>
                )}

                {asg.rationale && asg.rationale.length > 0 && (
                  <div className="text-xs text-slate-600 font-medium bg-white p-2.5 rounded-lg border border-slate-200/70">
                    {asg.rationale.join(' · ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
            <p className="text-xs font-medium text-slate-500">
              No units assigned yet. Review dispatch options below.
            </p>
          </div>
        )}
      </div>

      {/* 2. Required Capabilities Card */}
      {incident.required_capabilities && incident.required_capabilities.length > 0 && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold shrink-0 shadow-2xs">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Required Capabilities
              </h3>
              <p className="text-[11px] font-medium text-slate-500">
                Required apparatus and skill qualifications for response
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {incident.required_capabilities.map((cap, i) => (
              <span key={i} className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-2xs">
                {cap.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 3. Dispatch Recommendations Card */}
      {!['CLOSED', 'MERGED', 'FALSE_ALARM', 'RESOLVED'].includes(incident.status) &&
        incident.assigned_unit_count < incident.units_required && (
        <DispatchPanel incidentId={incident.id} />
      )}
    </div>
  );
}

// ——— TIMELINE TAB ———
function TimelineTab({ incident }) {
  const storeTimelineEvents = useStore(s => s.timelineEvents);

  // Match timeline events for this incident from the real-time store, excluding raw duplicate initial ingests
  const matchingStoreEvents = (storeTimelineEvents || []).filter(
    e => (e.incident_id === incident.id || e.payload?.incident_id === incident.id) &&
         !['INCIDENT_REPORTED', 'report.ingested', 'report.received', 'AI_TRIAGE_COMPLETE', 'AI_TRIAGE_COMPLETED', 'ai.triage'].includes(e.type)
  );

  // Single authoritative reporting milestone
  const primaryReport = incident.reports?.[0];
  const reportTime = primaryReport?.received_at || primaryReport?.occurred_at || incident.reported_at || incident.occurred_at || new Date().toISOString();
  
  const reportEvent = {
    ts: reportTime,
    type: 'report.ingested',
    text: `Citizen Report Ingested: "${incident.description || incident.title}"`,
    subtext: `Source: ${primaryReport?.source_label || 'Citizen Mobile App'} · Incident Code: ${incident.code || 'INC'} · Status: ${incident.status?.replace(/_/g, ' ') || 'ACTIVE'}`,
    badge: 'REPORT INGEST',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  // Single authoritative AI triage milestone
  const triageTime = new Date(new Date(reportTime).getTime() + 5000).toISOString();
  const triageEvent = {
    ts: triageTime,
    type: 'ai.triage',
    text: `AI Triage & Synthesis: Severity ${incident.severity || 'HIGH'} (${incident.severity_score || 75}/100)`,
    subtext: incident.ai?.briefing || `Multi-attribute Bayesian fusion computed ${incident.priority || 'HIGH'} operational response profile.`,
    badge: 'AI TRIAGE',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  const operationalEvents = [
    reportEvent,
    triageEvent,
    ...(matchingStoreEvents || []).map(e => ({
      ts: e.ts,
      type: e.type,
      text: e.summary || e.type?.replace(/_/g, ' '),
      subtext: e.actor?.name ? `Actor: ${e.actor.name}` : undefined,
      badge: e.category?.toUpperCase() || 'UPDATE',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    })),
    ...(incident.assignments || []).map(a => ({
      ts: a.proposed_at,
      type: 'assignment.proposed',
      text: `${a.unit_call_sign} Proposed for Dispatch`,
      subtext: a.rationale?.[0] || 'Multi-criteria optimizer selected unit based on ETA and required capabilities.',
      badge: 'PROPOSAL',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    })),
    ...(incident.assignments || []).filter(a => a.approved_at).map(a => ({
      ts: a.approved_at,
      type: 'assignment.approved',
      text: `${a.unit_call_sign} Dispatched & En Route`,
      subtext: 'Authorized by Incident Commander · Responding under Emergency Protocol',
      badge: 'DISPATCHED',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    })),
    ...(incident.assignments || []).filter(a => a.arrived_at).map(a => ({
      ts: a.arrived_at,
      type: 'unit.on_scene',
      text: `${a.unit_call_sign} Arrived on Scene`,
      subtext: 'First responder arrival telemetry confirmed · Operations active',
      badge: 'ON SCENE',
      badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
    })),
  ].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

  // Deduplicate any duplicate timestamp/type combinations
  const seenKeys = new Set();
  const events = [];
  for (const evt of operationalEvents) {
    const key = `${evt.type}_${evt.ts}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      events.push(evt);
    }
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-0 relative">
      {events.map((evt, i) => (
        <div key={i} className="flex gap-4 py-4.5 border-b border-slate-100 last:border-b-0">
          <div className="flex flex-col items-center">
            <div className="w-3.5 h-3.5 rounded-full bg-blue-600 mt-1 shadow-xs ring-4 ring-blue-50 shrink-0" />
            {i < events.length - 1 && <div className="w-0.5 flex-1 bg-slate-200 mt-2 min-h-[28px]" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${evt.badgeColor || 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                {evt.badge || 'EVENT'}
              </span>
              <span className="text-xs text-slate-500 font-mono font-semibold">{formatTime(evt.ts)}</span>
            </div>
            <div className="text-sm sm:text-base text-slate-900 font-bold leading-snug">{evt.text}</div>
            {evt.subtext && (
              <div className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed font-normal">{evt.subtext}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
