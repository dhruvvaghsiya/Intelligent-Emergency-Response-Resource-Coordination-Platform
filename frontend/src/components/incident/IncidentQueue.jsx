/* =========================================================================
   INCIDENT QUEUE — Left Rail (360px)
   §14.3: Severity-sorted, 1-line AI summary per row
   Attention Bar at top for pending confirmations
   ========================================================================= */
import React, { useMemo, useState } from 'react';
import { Search, Filter, ChevronDown, AlertTriangle, Clock, Crosshair } from 'lucide-react';
import { useStore } from '../../lib/store';
import { SeverityChip, IncidentStatusChip, SimBadge, ContestedBadge, CountChip } from '../ui/Chip';
import { Button } from '../ui/Button';
import { SEVERITY, INCIDENT_TYPE_CONFIG } from '../../lib/constants';
import { formatRelativeTime, formatDuration } from '../../lib/format';

export function IncidentQueue() {
  const { incidents, selectedIncidentId, selectIncident, filters, setFilter, alerts } = useStore();
  const [searchOpen, setSearchOpen] = useState(false);

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
    <div className="w-[360px] h-full border-r border-border-subtle bg-surface flex flex-col shrink-0 overflow-hidden">
      {/* ——— Attention Bar ——— */}
      {(pendingAlerts.length > 0 || contestedIncidents.length > 0) && (
        <div className="border-b border-border-subtle bg-inset px-3 py-2">
          <div className="text-[11px] font-medium uppercase tracking-wider text-text-muted mb-1.5">
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
      <div className="px-3 py-2 border-b border-border-subtle flex items-center gap-2">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search incidents..."
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            className="
              w-full h-[28px] pl-7 pr-2 bg-inset border border-border-subtle rounded-[4px]
              text-[12px] text-text-primary placeholder:text-text-muted
              focus:border-border-focus focus:outline-none
              transition-colors
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
                h-[28px] px-1.5 rounded-[4px] text-[10px] font-semibold uppercase cursor-pointer
                border transition-colors
                ${filters.severity.includes(sev)
                  ? `${sev === 'CRITICAL' ? 'bg-sev-critical-bg border-sev-critical/40 text-sev-critical' :
                     sev === 'HIGH' ? 'bg-sev-high-bg border-sev-high/40 text-sev-high' :
                     'bg-sev-moderate-bg border-sev-moderate/40 text-sev-moderate'}`
                  : 'bg-transparent border-border-subtle text-text-muted hover:border-border-strong'
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
          <div className="p-6 text-center text-[13px] text-text-muted">
            No incidents match the current filters.
          </div>
        ) : (
          filteredIncidents.map(incident => (
            <IncidentRow
              key={incident.id}
              incident={incident}
              isSelected={incident.id === selectedIncidentId}
              onClick={() => selectIncident(incident.id)}
            />
          ))
        )}
      </div>

      {/* ——— Footer ——— */}
      <div className="h-[28px] px-3 border-t border-border-subtle bg-inset flex items-center justify-between">
        <span className="text-[11px] text-text-muted">
          {filteredIncidents.length} incident{filteredIncidents.length !== 1 ? 's' : ''}
        </span>
        <span className="text-[11px] text-text-muted font-mono">
          {incidents.reduce((s, i) => s + i.report_count, 0)} reports
        </span>
      </div>
    </div>
  );
}

function IncidentRow({ incident, isSelected, onClick }) {
  const typeConfig = INCIDENT_TYPE_CONFIG[incident.type] || INCIDENT_TYPE_CONFIG.UNKNOWN;

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left px-3 py-2 border-b border-border-subtle
        transition-colors duration-[80ms] cursor-pointer
        flex flex-col gap-1
        ${isSelected
          ? 'bg-selected border-l-2 border-l-accent'
          : 'hover:bg-hover border-l-2 border-l-transparent'
        }
      `}
    >
      {/* Row 1: Code, severity, status */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px] text-text-muted">{incident.code}</span>
        <SeverityChip severity={incident.severity} score={incident.severity_score} />
        <IncidentStatusChip status={incident.status} />
        <div className="flex-1" />
        {incident.is_simulated && <SimBadge />}
      </div>

      {/* Row 2: Title */}
      <div className="text-[13px] text-text-primary font-medium leading-tight line-clamp-1">
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
          <span className="text-sev-high font-medium flex items-center gap-0.5">
            <AlertTriangle size={10} />
            Contested
          </span>
        )}
      </div>
    </button>
  );
}
