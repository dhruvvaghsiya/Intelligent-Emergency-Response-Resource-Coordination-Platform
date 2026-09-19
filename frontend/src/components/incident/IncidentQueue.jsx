/* =========================================================================
   INCIDENT QUEUE — Spacious Clean Incident Feed (Ward Alerts style)
   Features min 80px item height, py-4 padding, text-lg titles, text-sm metadata.
   ========================================================================= */
import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, AlertTriangle, Clock, Radio, MapPin } from 'lucide-react';
import { useStore } from '../../lib/store';
import { SeverityChip, IncidentStatusChip, SimBadge, CountChip } from '../ui/Chip';
import { SEVERITY } from '../../lib/constants';
import { formatRelativeTime } from '../../lib/format';

export function IncidentQueue() {
  const { incidents, selectedIncidentId, selectIncident, filters, setFilter, alerts } = useStore();

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
    <div className="w-[440px] h-full border-r border-slate-200 bg-white flex flex-col shrink-0 overflow-hidden select-none shadow-sm">
      {/* ——— Attention Bar ——— */}
      {(pendingAlerts.length > 0 || contestedIncidents.length > 0 || pendingRecommendations.length > 0) && (
        <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Radio size={13} className="text-red-600" />
              Active Operational Attention
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {pendingAlerts.filter(a => a.severity === 'CRITICAL').length > 0 && (
              <CountChip
                count={pendingAlerts.filter(a => a.severity === 'CRITICAL').length}
                label="critical alerts"
                variant="danger"
              />
            )}
            {contestedIncidents.length > 0 && (
              <CountChip count={contestedIncidents.length} label="contested" variant="warning" />
            )}
            {pendingRecommendations.length > 0 && (
              <CountChip count={pendingRecommendations.length} label="pending dispatch" variant="accent" />
            )}
          </div>
        </div>
      )}

      {/* ——— Search & Filters Bar ——— */}
      <div className="px-5 py-4 border-b border-slate-100 bg-white space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search incident title, location, code..."
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            className="
              w-full h-10 pl-10 pr-3.5 bg-slate-50 border border-slate-200 rounded-lg
              text-sm text-slate-900 placeholder:text-slate-400
              focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600
              transition-colors duration-150
            "
          />
        </div>

        {/* Severity Filter Chips */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-slate-500 mr-1">Filter:</span>
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
                  h-7 px-2.5 rounded-full text-xs font-semibold cursor-pointer border transition-colors
                  ${isSelected
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                  }
                `}
              >
                {sev.charAt(0) + sev.slice(1).toLowerCase()}
              </button>
            );
          })}
        </div>
      </div>

      {/* ——— Incident List ——— */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-white">
        {filteredIncidents.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400">
            No incidents found matching the selected filters.
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filteredIncidents.map((incident, i) => (
              <IncidentRow
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

      {/* ——— Footer Metrics ——— */}
      <div className="h-11 px-5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs text-slate-500 font-medium">
        <span>
          Showing <strong className="text-slate-800 font-semibold">{filteredIncidents.length}</strong> active incidents
        </span>
        <span>
          <strong className="text-slate-800 font-semibold">{incidents.reduce((s, i) => s + i.report_count, 0)}</strong> total reports
        </span>
      </div>
    </div>
  );
}

function IncidentRow({ incident, index, isSelected, onClick }) {
  return (
    <motion.button
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      className={`
        relative w-full text-left py-4 px-5 min-h-[82px]
        transition-colors duration-100 cursor-pointer
        flex flex-col justify-center gap-1.5
        ${isSelected
          ? 'bg-blue-50/80 border-l-[4px] border-l-blue-600 pl-[16px]'
          : 'hover:bg-slate-50/80'
        }
      `}
    >
      {/* Row 1: Code, Status badges, Severity */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs font-semibold text-slate-500">{incident.code}</span>
        <SeverityChip severity={incident.severity} score={incident.severity_score} />
        <IncidentStatusChip status={incident.status} />
        <div className="flex-1" />
        {incident.is_simulated && <SimBadge />}
      </div>

      {/* Row 2: Main Incident Title (text-lg font-semibold text-slate-900) */}
      <div className="text-base font-semibold text-slate-900 leading-snug line-clamp-1">
        {incident.title}
      </div>

      {/* Row 3: Meta details (location, time, report count) */}
      <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
        <span className="flex items-center gap-1">
          <Clock size={13} className="text-slate-400" />
          {formatRelativeTime(incident.occurred_at)}
        </span>
        <span>·</span>
        <span>{incident.report_count} reports</span>
        {incident.assigned_unit_count > 0 && (
          <>
            <span>·</span>
            <span>{incident.assigned_unit_count}/{incident.units_required} units</span>
          </>
        )}
        {incident.has_conflict && (
          <span className="text-amber-700 font-semibold flex items-center gap-1 ml-auto text-xs bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            <AlertTriangle size={12} />
            Contested
          </span>
        )}
      </div>
    </motion.button>
  );
}
