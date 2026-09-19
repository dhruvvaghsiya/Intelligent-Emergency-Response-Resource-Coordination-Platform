/* =========================================================================
   INCIDENT QUEUE — Left Rail
   Severity-sorted, 1-line AI summary per row
   Attention Bar at top for pending confirmations
   ========================================================================= */
import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, AlertTriangle, Clock } from 'lucide-react';
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
    <div className="w-[380px] h-full border-r border-border-subtle glass flex flex-col shrink-0 overflow-hidden">
      {/* ——— Attention Bar ——— */}
      {(pendingAlerts.length > 0 || contestedIncidents.length > 0) && (
        <div className="border-b border-border-subtle bg-white/[0.02] px-4 py-3">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-text-muted mb-2">
            Needs attention
          </div>
          <div className="flex flex-wrap gap-1.5">
            {pendingAlerts.filter(a => a.severity === 'CRITICAL').length > 0 && (
              <CountChip
                count={pendingAlerts.filter(a => a.severity === 'CRITICAL').length}
                label="critical"
                variant="danger"
              />
            )}
            {contestedIncidents.length > 0 && (
              <CountChip count={contestedIncidents.length} label="contested" variant="warning" />
            )}
            {pendingRecommendations.length > 0 && (
              <CountChip count={pendingRecommendations.length} label="pending plans" variant="accent" />
            )}
          </div>
        </div>
      )}

      {/* ——— Search & filters ——— */}
      <div className="px-4 py-3 border-b border-border-subtle flex items-center gap-2">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search incidents..."
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            className="
              w-full h-[34px] pl-9 pr-2.5 bg-black/25 border border-border-subtle rounded-[var(--radius-md)]
              text-[12.5px] text-text-primary placeholder:text-text-muted
              focus:border-accent/50 focus:bg-black/40 focus:outline-none
              transition-all duration-200
            "
          />
        </div>
        <div className="flex gap-1">
          {SEVERITY.slice(0, 3).map(sev => (
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
                h-[34px] px-2 rounded-[var(--radius-md)] text-[10px] font-bold uppercase cursor-pointer
                border transition-all duration-150
                ${filters.severity.includes(sev)
                  ? `${sev === 'CRITICAL' ? 'bg-sev-critical-bg border-sev-critical/40 text-sev-critical' :
                     sev === 'HIGH' ? 'bg-sev-high-bg border-sev-high/40 text-sev-high' :
                     'bg-sev-moderate-bg border-sev-moderate/40 text-sev-moderate'}`
                  : 'bg-transparent border-border-subtle text-text-muted hover:border-border-strong hover:text-text-secondary'
                }
              `}
            >
              {sev.slice(0, 4)}
            </button>
          ))}
        </div>
      </div>

      {/* ——— List ——— */}
      <div className="flex-1 overflow-y-auto">
        {filteredIncidents.length === 0 ? (
          <div className="p-8 text-center text-[13px] text-text-muted">
            No incidents match the current filters.
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

      {/* ——— Footer ——— */}
      <div className="h-[34px] px-4 border-t border-border-subtle bg-white/[0.02] flex items-center justify-between">
        <span className="text-[11px] text-text-muted font-medium">
          {filteredIncidents.length} incident{filteredIncidents.length !== 1 ? 's' : ''}
        </span>
        <span className="text-[11px] text-text-muted font-mono">
          {incidents.reduce((s, i) => s + i.report_count, 0)} reports
        </span>
      </div>
    </div>
  );
}

function IncidentRow({ incident, index, isSelected, onClick }) {
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3), ease: [0.16, 0.84, 0.32, 1] }}
      onClick={onClick}
      className={`
        relative w-full text-left px-4 py-3 border-b border-border-subtle
        transition-colors duration-150 cursor-pointer
        flex flex-col gap-1.5
        ${isSelected
          ? 'bg-accent/[0.07]'
          : 'hover:bg-white/[0.035]'
        }
      `}
    >
      {isSelected && (
        <motion.div layoutId="incident-row-active" className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent shadow-[0_0_8px_rgba(45,212,191,0.7)]" />
      )}

      {/* Row 1: Code, severity, status */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10.5px] text-text-muted">{incident.code}</span>
        <SeverityChip severity={incident.severity} score={incident.severity_score} />
        <IncidentStatusChip status={incident.status} />
        <div className="flex-1" />
        {incident.is_simulated && <SimBadge />}
      </div>

      {/* Row 2: Title */}
      <div className="text-[13.5px] text-text-primary font-semibold leading-snug line-clamp-1 tracking-tight">
        {incident.title}
      </div>

      {/* Row 3: Meta */}
      <div className="flex items-center gap-3 text-[11px] text-text-muted">
        <span className="flex items-center gap-1">
          <Clock size={10} />
          {formatRelativeTime(incident.occurred_at)}
        </span>
        <span>{incident.report_count} reports</span>
        {incident.assigned_unit_count > 0 && (
          <span>{incident.assigned_unit_count}/{incident.units_required} units</span>
        )}
        {incident.has_conflict && (
          <span className="text-sev-high font-semibold flex items-center gap-0.5">
            <AlertTriangle size={10} />
            Contested
          </span>
        )}
      </div>
    </motion.button>
  );
}
