/* =========================================================================
   INCIDENT QUEUE — Google Material Inspired Left Sidebar Queue
   Expanded card dimensions, increased typography & icon sizes, and generous spacing.
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

const SEVERITY_DOT_COLORS = {
  CRITICAL: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MODERATE: 'bg-amber-500',
  LOW: 'bg-emerald-500',
  INFO: 'bg-blue-500',
};

const SEVERITY_TEXT_COLORS = {
  CRITICAL: 'text-red-700 bg-red-50/90 border-red-200/70',
  HIGH: 'text-orange-700 bg-orange-50/90 border-orange-200/70',
  MODERATE: 'text-amber-700 bg-amber-50/90 border-amber-200/70',
  LOW: 'text-emerald-700 bg-emerald-50/90 border-emerald-200/70',
  INFO: 'text-blue-700 bg-blue-50/90 border-blue-200/70',
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
    <div className="w-[440px] h-full border-r border-slate-200/80 bg-slate-50/60 flex flex-col shrink-0 overflow-hidden select-none">
      {/* ——— Sidebar Header & Close Control ——— */}
      <div className="px-5 py-3 bg-white border-b border-slate-200/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-bold text-slate-900 uppercase tracking-wider">Incident Queue</span>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80">
            {filteredIncidents.length} active
          </span>
        </div>
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Close Sidebar Menu"
          aria-label="Close Sidebar Menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* ——— Attention Banner ——— */}
      {(pendingAlerts.length > 0 || contestedIncidents.length > 0 || pendingRecommendations.length > 0) && (
        <div className="border-b border-amber-200/60 bg-amber-50/70 px-5 py-3 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
              <Radio size={14} className="text-amber-600 animate-pulse" />
              Active Operational Attention
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {pendingAlerts.filter(a => a.severity === 'CRITICAL').length > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-red-100 text-red-800 text-xs font-bold border border-red-200/80 flex items-center gap-1">
                <span>{pendingAlerts.filter(a => a.severity === 'CRITICAL').length}</span> critical alerts
              </span>
            )}
            {contestedIncidents.length > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 text-xs font-bold border border-amber-200/80 flex items-center gap-1">
                <span>{contestedIncidents.length}</span> contested
              </span>
            )}
            {pendingRecommendations.length > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-900 text-xs font-bold border border-blue-200/80 flex items-center gap-1">
                <span>{pendingRecommendations.length}</span> pending dispatch
              </span>
            )}
          </div>
        </div>
      )}

      {/* ——— Search & Filters Header ——— */}
      <div className="p-4 border-b border-slate-200/80 bg-white space-y-3 shrink-0">
        {/* Search Bar */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search incident title, location, code..."
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            className="
              w-full h-10 pl-10 pr-3.5 bg-slate-50 border border-slate-200/90 rounded-xl
              text-xs sm:text-sm text-slate-900 placeholder:text-slate-400
              focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20
              transition-all duration-150 shadow-2xs
            "
          />
        </div>

        {/* Severity Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
          <button
            onClick={() => setFilter('severity', [])}
            className={`
              h-7 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0
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
                  h-7 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 border
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
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50">
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
      <div className="h-10 px-5 border-t border-slate-200/80 bg-white flex items-center justify-between text-xs text-slate-500 font-medium shrink-0">
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
  const dotBg = SEVERITY_DOT_COLORS[incident.severity] || 'bg-slate-400';
  const tagStyle = SEVERITY_TEXT_COLORS[incident.severity] || 'text-slate-700 bg-slate-100 border-slate-200';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      className={`
        relative w-full text-left p-4 sm:p-4.5 rounded-2xl border transition-all duration-150 cursor-pointer
        bg-white overflow-hidden group shadow-2xs
        ${isSelected
          ? 'bg-blue-50/60 border-blue-400/80 ring-2 ring-blue-500/20 shadow-xs'
          : 'border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
        }
      `}
    >
      {/* Left Severity Accent Line */}
      <div className={`absolute left-0 top-3.5 bottom-3.5 w-1.5 rounded-r-full ${accentBg}`} />

      {/* Row 1: Code + Severity Tag + Status */}
      <div className="flex items-center justify-between gap-2.5 mb-2 pl-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-slate-400 tracking-wider">
            {incident.code}
          </span>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${tagStyle}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dotBg}`} />
            {incident.severity?.toLowerCase()}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-500 capitalize">
            {incident.status?.replace(/_/g, ' ').toLowerCase()}
          </span>
        </div>
      </div>

      {/* Row 2: Headline Incident Title */}
      <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug line-clamp-2 my-2.5 pl-2 group-hover:text-blue-600 transition-colors">
        {incident.title}
      </h3>

      {/* Row 3: Minimal Metadata Footer (Time, Reports, Units, Contested Tag) */}
      <div className="flex items-center gap-3 text-xs text-slate-600 font-medium pl-2 pt-2.5 border-t border-slate-100/90">
        <span className="flex items-center gap-1.5">
          <Clock size={14} className="text-slate-400 shrink-0" />
          {formatRelativeTime(incident.occurred_at)}
        </span>
        <span className="text-slate-300">·</span>
        <span className="flex items-center gap-1.5">
          <FileText size={14} className="text-slate-400 shrink-0" />
          {incident.report_count} reports
        </span>
        {incident.assigned_unit_count > 0 && (
          <>
            <span className="text-slate-300">·</span>
            <span className="flex items-center gap-1.5">
              <Users size={14} className="text-slate-400 shrink-0" />
              {incident.assigned_unit_count}/{incident.units_required} units
            </span>
          </>
        )}

        {incident.has_conflict && (
          <span className="ml-auto text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/80 flex items-center gap-1">
            <AlertTriangle size={12} className="text-amber-600 shrink-0" />
            Contested
          </span>
        )}
      </div>
    </motion.div>
  );
}
