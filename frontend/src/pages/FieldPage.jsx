/* =========================================================================
   FIELD PAGE — Simplified mobile-first responder view
   §W9: Shows assigned incidents, status updates, offline queue
   ========================================================================= */
import React, { useState, useEffect } from 'react';
import { MapPin, Send, CheckCircle, Navigation, Radio, AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { SeverityChip, IncidentStatusChip, SimBadge } from '../components/ui/Chip';
import { Panel, PanelSection } from '../components/ui/Panel';
import { useStore } from '../lib/store';
import { fieldApi, incidentsApi } from '../lib/api';
import { EVIDENCE_ATTRIBUTE } from '../lib/constants';
import { formatAttribute } from '../lib/format';

export function FieldPage() {
  const { units, incidents } = useStore();
  const [selectedUnit, setSelectedUnit] = useState(units[0]?.id);
  const [assignedIncidentId, setAssignedIncidentId] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [attribute, setAttribute] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState('');

  useEffect(() => {
    if (!selectedUnit && units.length > 0) setSelectedUnit(units[0].id);
  }, [units, selectedUnit]);

  const unit = units.find(u => u.id === selectedUnit);

  // The unit's own record only carries `current_assignment_id`, not which incident it
  // belongs to — the incident list only has summary fields. Cross-reference against the
  // (few) non-terminal incidents that currently have an assigned unit to find the match.
  useEffect(() => {
    setAssignedIncidentId(null);
    if (!unit?.current_assignment_id) return;
    let cancelled = false;
    const candidates = incidents.filter(i =>
      i.assigned_unit_count > 0 && !['CLOSED', 'MERGED', 'FALSE_ALARM'].includes(i.status)
    );
    (async () => {
      setLookupLoading(true);
      for (const inc of candidates) {
        try {
          const detail = await incidentsApi.get(inc.id);
          if (detail.assignments?.some(a => a.id === unit.current_assignment_id)) {
            if (!cancelled) setAssignedIncidentId(inc.id);
            return;
          }
        } catch { /* skip unreadable incident */ }
      }
      if (!cancelled) setLookupLoading(false);
    })().finally(() => { if (!cancelled) setLookupLoading(false); });
    return () => { cancelled = true; };
  }, [unit?.current_assignment_id, incidents]);

  const assignedIncident = incidents.find(i => i.id === assignedIncidentId) || null;

  const sendStatusUpdate = async (status) => {
    if (!unit?.current_assignment_id) return;
    setStatusUpdating(true);
    setStatusError('');
    try {
      const [result] = await fieldApi.sync({
        actions: [{
          type: 'STATUS_UPDATE',
          idempotency_key: crypto.randomUUID(),
          captured_at: new Date().toISOString(),
          payload: { assignment_id: unit.current_assignment_id, status },
        }],
      });
      if (result?.applied !== 'applied') {
        setStatusError(result?.reason || 'Status update was not applied');
      }
    } catch (err) {
      setStatusError(err?.response?.data?.error?.message || 'Failed to sync status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const submitObservation = async () => {
    if (!assignedIncidentId || !attribute) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const [result] = await fieldApi.sync({
        actions: [{
          type: 'OBSERVATION',
          idempotency_key: crypto.randomUUID(),
          captured_at: new Date().toISOString(),
          payload: { incident_id: assignedIncidentId, attribute, asserted_probability: 0.9 },
        }],
      });
      if (result?.applied === 'applied') {
        setSubmitted(true);
      } else {
        setSubmitError(result?.reason || 'Observation was not recorded');
      }
    } catch (err) {
      setSubmitError(err?.response?.data?.error?.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

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
              <Button
                variant="primary" size="compact" className="flex-1"
                disabled={!unit.current_assignment_id || statusUpdating}
                onClick={() => sendStatusUpdate('EN_ROUTE')}
              >
                <Navigation size={12} />
                En Route
              </Button>
              <Button
                variant="secondary" size="compact" className="flex-1"
                disabled={!unit.current_assignment_id || statusUpdating}
                onClick={() => sendStatusUpdate('ON_SCENE')}
              >
                <MapPin size={12} />
                On Scene
              </Button>
              <Button
                variant="secondary" size="compact" className="flex-1"
                disabled={!unit.current_assignment_id || statusUpdating}
                onClick={() => sendStatusUpdate('COMPLETED')}
              >
                <CheckCircle size={12} />
                Complete
              </Button>
            </div>
            {!unit.current_assignment_id && (
              <p className="text-[11px] text-text-muted mt-2">No active assignment to update.</p>
            )}
            {statusError && (
              <p className="text-[11px] text-sev-critical mt-2">{statusError}</p>
            )}
          </Panel>
        )}

        {/* Assigned incidents */}
        <PanelSection title="Assigned Incidents" className="mb-4">
          {lookupLoading ? (
            <div className="bg-surface border border-border-subtle rounded-[4px] p-4 text-center text-[13px] text-text-muted">
              Looking up assignment…
            </div>
          ) : assignedIncident ? (
            <div className="bg-surface border border-border-subtle rounded-[4px] p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[11px] text-text-muted">{assignedIncident.code}</span>
                <SeverityChip severity={assignedIncident.severity} score={assignedIncident.severity_score} />
              </div>
              <div className="text-[13px] font-medium text-text-primary mb-1">{assignedIncident.title}</div>
              <div className="text-[11px] text-text-muted flex items-center gap-1">
                <MapPin size={10} />
                {assignedIncident.address || 'Location unavailable'}
              </div>
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
              <Button variant="ghost" size="compact" className="mt-2" onClick={() => { setSubmitted(false); setAttribute(''); }}>
                New report
              </Button>
            </div>
          ) : !assignedIncident ? (
            <p className="text-[12px] text-text-muted py-2">
              Field reports confirm a condition on your currently assigned incident — you'll be able to submit one once you have an active assignment.
            </p>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-text-muted uppercase tracking-wider mb-1">
                  What do you observe at {assignedIncident.code}?
                </label>
                <select
                  value={attribute}
                  onChange={e => setAttribute(e.target.value)}
                  className="w-full h-[36px] px-3 bg-inset border border-border-subtle rounded-[4px] text-[13px] text-text-primary focus:border-border-focus focus:outline-none"
                >
                  <option value="">Select a condition to confirm...</option>
                  {EVIDENCE_ATTRIBUTE.map(attr => (
                    <option key={attr} value={attr}>{formatAttribute(attr)}</option>
                  ))}
                </select>
              </div>
              {submitError && <p className="text-[12px] text-sev-critical">{submitError}</p>}
              <Button variant="primary" className="w-full" onClick={submitObservation} disabled={!attribute || submitting}>
                <Send size={14} />
                {submitting ? 'Submitting...' : 'Submit Field Report'}
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
