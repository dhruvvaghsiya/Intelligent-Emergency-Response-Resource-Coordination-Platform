/* =========================================================================
   INCIDENT QUEUE — Google Material Inspired Left Sidebar Queue
   Card-based list layout with clean typography, severity left-accents, and modern filter dock.
   ========================================================================= */
import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, AlertTriangle, Clock, Radio, Users, FileText, X } from 'lucide-react';
import { useStore } from '../../lib/store';
import { SEVERITY } from '../../lib/constants';
import { formatRelativeTime } from '../../lib/format';

const SEVERITY_ACCENT = {
  CRITICAL: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MODERATE: 'bg-amber-500',
  LOW: 'bg-emerald-500',
  INFO: 'bg-blue-500',
};

const SEVERITY_TAG_STYLES = {
  CRITICAL: 'bg-red-50 text-red-700 border-red-200/80',
  HIGH: 'bg-orange-50 text-orange-700 border-orange-200/80',
  MODERATE: 'bg-amber-50 text-amber-700 border-amber-200/80',
  LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  INFO: 'bg-blue-50 text-blue-700 border-blue-200/80',
};

export function IncidentQueue() {
  const { incidents, selectedIncidentId, selectIncident, filters, setFilter, alerts, toggleSidebar } = useStore();

  // Pending actions
  const pendingAlerts = alerts.filter(a => !a.acked_at);
  const contestedIncidents = incidents.filter(i => i.has_conflict);
  const pendingRecommendations = incidents.filter(i => i.has_pending_recommendation);

  // Filter incidents
  const filteredIncidents = useMemo(() => {
    let list = [...incidents];

    // Exclude terminal states from main queue
    list = list.filter(i => !['CLOSED', 'MERGED', 'FALSE_ALARM'].includes(i.status));

    if (filters.severity.length > 0) {
      list = list.filter(i => filters.severity.includes(i.severity));
    }
    if (filters.status.length > 0) {
      list = list.filter(i => filters.status.includes(i.status));
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.code.toLowerCase().includes(q) ||
        i.address?.toLowerCase().includes(q)
      );
    }
    if (filters.hasConflict) {
      list = list.filter(i => i.has_conflict);
    }

    // Sort: severity score desc
    const sevOrder = { CRITICAL: 0, HIGH: 1, MODERATE: 2, LOW: 3, INFO: 4 };
    list.sort((a, b) => (sevOrder[a.severity] - sevOrder[b.severity]) || (b.severity_score - a.severity_score));

    return list;
  }, [incidents, filters]);

  return (
    <div className="w-[410px] h-full border-r border-slate-200/80 bg-slate-50/60 flex flex-col shrink-0 overflow-hidden select-none">
      {/* ——— Sidebar Header & Close Control ——— */}
      <div className="px-4 py-2.5 bg-white border-b border-slate-200/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Incident Queue</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80">
            {filteredIncidents.length} active
          </span>
        </div>
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Close Sidebar Menu"
          aria-label="Close Sidebar Menu"
        >
          <X size={16} />
        </button>
      </div>

      {/* ——— Attention Banner ——— */}
      {(pendingAlerts.length > 0 || contestedIncidents.length > 0 || pendingRecommendations.length > 0) && (
        <div className="border-b border-amber-200/60 bg-amber-50/70 px-4 py-2.5 shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
              <Radio size={13} className="text-amber-600 animate-pulse" />
              Active Operational Attention
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {pendingAlerts.filter(a => a.severity === 'CRITICAL').length > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-800 text-[11px] font-bold border border-red-200/80 flex items-center gap-1">
                <span>{pendingAlerts.filter(a => a.severity === 'CRITICAL').length}</span> critical alerts
              </span>
            )}
            {contestedIncidents.length > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[11px] font-bold border border-amber-200/80 flex items-center gap-1">
                <span>{contestedIncidents.length}</span> contested
              </span>
            )}
            {pendingRecommendations.length > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 text-[11px] font-bold border border-blue-200/80 flex items-center gap-1">
                <span>{pendingRecommendations.length}</span> pending dispatch
              </span>
            )}
          </div>
        </div>
      )}

      {/* ——— Search & Filters Header ——— */}
      <div className="p-3.5 border-b border-slate-200/80 bg-white space-y-2.5 shrink-0">
        {/* Search Bar */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search incident title, location, code..."
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            className="
              w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200/90 rounded-xl
              text-xs text-slate-900 placeholder:text-slate-400
              focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20
              transition-all duration-150 shadow-2xs
            "
          />
        </div>

        {/* Severity Filter Chips */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-0.5">
          <button
            onClick={() => setFilter('severity', [])}
            className={`
              h-6 px-2.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0
              ${filters.severity.length === 0
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
              }
            `}
          >
            All ({incidents.length})
          </button>
          {SEVERITY.slice(0, 4).map(sev => {
            const isSelected = filters.severity.includes(sev);
            return (
              <button
                key={sev}
                onClick={() => {
                  const current = filters.severity;
                  setFilter('severity', current.includes(sev)
                    ? current.filter(s => s !== sev)
                    : [...current, sev]
                  );
                }}
                className={`
                  h-6 px-2.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 border
                  ${isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50 hover:text-slate-900'
                  }
                `}
              >
                {sev.charAt(0) + sev.slice(1).toLowerCase()}
              </button>
            );
          })}
        </div>
      </div>

      {/* ——— Incident Cards Feed ——— */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50/50">
        {filteredIncidents.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 font-medium">
            No incidents found matching the selected filters.
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filteredIncidents.map((incident, i) => (
              <IncidentCard
                key={incident.id}
                incident={incident}
                index={i}
                isSelected={incident.id === selectedIncidentId}
                onClick={() => selectIncident(incident.id)}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* ——— Footer Stats Bar ——— */}
      <div className="h-9 px-4 border-t border-slate-200/80 bg-white flex items-center justify-between text-[11px] text-slate-500 font-medium shrink-0">
        <span>
          Showing <strong className="text-slate-800 font-bold">{filteredIncidents.length}</strong> active incidents
        </span>
        <span>
          <strong className="text-slate-800 font-bold">{incidents.reduce((s, i) => s + i.report_count, 0)}</strong> total reports
        </span>
      </div>
    </div>
  );
}

function IncidentCard({ incident, isSelected, onClick }) {
  const accentBg = SEVERITY_ACCENT[incident.severity] || 'bg-slate-400';
  const tagStyle = SEVERITY_TAG_STYLES[incident.severity] || 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      className={`
        relative w-full text-left p-3.5 rounded-xl border transition-all duration-150 cursor-pointer
        bg-white shadow-2xs overflow-hidden group
        ${isSelected
          ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-500/20 shadow-sm'
          : 'border-slate-200/80 hover:border-slate-300 hover:shadow-md'
        }
      `}
    >
      {/* Left Severity Accent Bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${accentBg}`} />

      {/* Line 1: Code + Severity Pill + Status */}
      <div className="flex items-center justify-between gap-2 mb-1.5 pl-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-bold text-slate-400 tracking-wider">
            {incident.code}
          </span>
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${tagStyle}`}>
            {incident.severity} {incident.severity_score && `· ${incident.severity_score}`}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            {incident.status?.replace(/_/g, ' ')}
          </span>
          {incident.is_simulated && (
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 border border-slate-200">
              SIM
            </span>
          )}
        </div>
      </div>

      {/* Line 2: Incident Title */}
      <h3 className="text-xs sm:text-[13px] font-semibold text-slate-900 leading-snug line-clamp-2 mb-2 pl-1 group-hover:text-blue-600 transition-colors">
        {incident.title}
      </h3>

      {/* Line 3: Meta Footer (Time, Reports, Units, Conflicts) */}
      <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500 pl-1 pt-1 border-t border-slate-100">
        <span className="flex items-center gap-1">
          <Clock size={12} className="text-slate-400 shrink-0" />
          {formatRelativeTime(incident.occurred_at)}
        </span>
        <span>·</span>
        <span className="flex items-center gap-1">
          <FileText size={12} className="text-slate-400 shrink-0" />
          {incident.report_count} reports
        </span>
        {incident.assigned_unit_count > 0 && (
          <>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Users size={12} className="text-slate-400 shrink-0" />
              {incident.assigned_unit_count}/{incident.units_required}
            </span>
          </>
        )}

        {incident.has_conflict && (
          <span className="ml-auto text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80 flex items-center gap-1">
            <AlertTriangle size={11} className="text-amber-600 shrink-0" />
            Contested
          </span>
        )}
      </div>
    </motion.div>
  );
}
