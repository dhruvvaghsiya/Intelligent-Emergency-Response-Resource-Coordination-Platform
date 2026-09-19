/* =========================================================================
   FIELD PAGE — Simplified mobile-first responder view
   §W9: Shows assigned incidents, status updates, offline queue
   ========================================================================= */
import React, { useState } from 'react';
import { MapPin, Clock, Send, CheckCircle, Navigation, Radio, AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { SeverityChip, IncidentStatusChip, SimBadge } from '../components/ui/Chip';
import { Panel, PanelSection } from '../components/ui/Panel';
import { useStore } from '../lib/store';
import { formatRelativeTime, formatDuration } from '../lib/format';

export function FieldPage() {
  const { units, incidents } = useStore();
  const [selectedUnit, setSelectedUnit] = useState(units[0]?.id);
  const [reportText, setReportText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const unit = units.find(u => u.id === selectedUnit);
  const assignedIncidents = unit?.current_assignment_id
    ? incidents.filter(i => i.assignments?.some(a => a.unit_id === selectedUnit))
    : [];

  return (
    <div className="flex-1 overflow-y-auto bg-canvas">
      <div className="max-w-[480px] mx-auto p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Radio size={20} className="text-accent" />
          <h1 className="text-[17px] font-semibold text-text-primary">Field Responder</h1>
          <SimBadge />
        </div>

        {/* Unit selector */}
        <div className="mb-4">
          <label className="block text-[11px] text-text-muted uppercase tracking-wider mb-1">Your Unit</label>
          <select
            value={selectedUnit}
            onChange={e => setSelectedUnit(e.target.value)}
            className="w-full h-[36px] px-3 bg-surface border border-border-subtle rounded-[4px] text-[13px] text-text-primary focus:border-border-focus focus:outline-none font-mono"
          >
            {units.map(u => (
              <option key={u.id} value={u.id}>{u.call_sign} — {u.type.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        {/* Unit status */}
        {unit && (
          <Panel title="Status" className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[17px] font-semibold text-text-primary">{unit.call_sign}</span>
              <IncidentStatusChip status={unit.status} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-[12px]">
              <div>
                <span className="text-text-muted">Type:</span>
                <span className="text-text-secondary ml-1">{unit.type.replace(/_/g, ' ')}</span>
              </div>
              <div>
                <span className="text-text-muted">Crew:</span>
                <span className="text-text-secondary ml-1">{unit.crew_size}</span>
              </div>
            </div>

            {/* Quick status buttons */}
            <div className="flex gap-2 mt-3">
              <Button variant="primary" size="compact" className="flex-1">
                <Navigation size={12} />
                En Route
              </Button>
              <Button variant="secondary" size="compact" className="flex-1">
                <MapPin size={12} />
                On Scene
              </Button>
              <Button variant="secondary" size="compact" className="flex-1">
                <CheckCircle size={12} />
                Complete
              </Button>
            </div>
          </Panel>
        )}

        {/* Assigned incidents */}
        <PanelSection title="Assigned Incidents" className="mb-4">
          {assignedIncidents.length > 0 ? (
            <div className="space-y-2">
              {assignedIncidents.map(inc => (
                <div key={inc.id} className="bg-surface border border-border-subtle rounded-[4px] p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-[11px] text-text-muted">{inc.code}</span>
                    <SeverityChip severity={inc.severity} score={inc.severity_score} />
                  </div>
                  <div className="text-[13px] font-medium text-text-primary mb-1">{inc.title}</div>
                  <div className="text-[11px] text-text-muted flex items-center gap-1">
                    <MapPin size={10} />
                    {inc.address}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-surface border border-border-subtle rounded-[4px] p-4 text-center text-[13px] text-text-muted">
              No active assignments. Standing by.
            </div>
          )}
        </PanelSection>

        {/* Field report */}
        <Panel title="Submit Field Report" className="mb-4">
          {submitted ? (
            <div className="text-center py-4">
              <CheckCircle size={32} className="text-status-available mx-auto mb-2" />
              <p className="text-[13px] text-text-primary font-medium">Report submitted</p>
              <Button variant="ghost" size="compact" className="mt-2" onClick={() => setSubmitted(false)}>
                New report
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                value={reportText}
                onChange={e => setReportText(e.target.value)}
                placeholder="Describe what you observe: fire status, casualties, access conditions, hazards..."
                rows={3}
                className="w-full px-3 py-2 bg-inset border border-border-subtle rounded-[4px] text-[13px] text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none resize-none"
              />
              <Button variant="primary" className="w-full" onClick={() => setSubmitted(true)} disabled={!reportText}>
                <Send size={14} />
                Submit Field Report
              </Button>
            </div>
          )}
        </Panel>

        {/* Offline indicator */}
        <div className="px-3 py-2 bg-inset border border-border-subtle rounded-[4px] text-[11px] text-text-muted text-center">
          <AlertTriangle size={10} className="inline mr-1" />
          Offline mode: Reports will be queued and synced when connection is restored
        </div>
      </div>
    </div>
  );
}
