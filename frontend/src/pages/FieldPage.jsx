/* =========================================================================
   FIELD PAGE — Tactical Mobile-First Responder Terminal
   Offline report queueing, direct status update buttons, assignment display.
   ========================================================================= */
import React, { useState } from 'react';
import { MapPin, Send, CheckCircle, Navigation, Radio, AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { SeverityChip, IncidentStatusChip, SimBadge } from '../components/ui/Chip';
import { Panel } from '../components/ui/Panel';
import { useStore } from '../lib/store';

export function FieldPage() {
  const { units, incidents } = useStore();
  const [selectedUnit, setSelectedUnit] = useState(units[0]?.id);
  const [reportText, setReportText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState('');

  useEffect(() => {
    if (!selectedUnit && units.length > 0) setSelectedUnit(units[0].id);
  }, [units, selectedUnit]);

  const unit = units.find(u => u.id === selectedUnit);
  const assignedIncidents = unit?.current_assignment_id
    ? incidents.filter(i => i.assignments?.some(a => a.unit_id === selectedUnit))
    : [];

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

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="max-w-[560px] mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm">
              <Radio size={18} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Field Responder Terminal
              </h1>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit Cockpit</span>
            </div>
          </div>
          <SimBadge />
        </div>

        {/* Unit selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Select Active Assigned Unit
          </label>
          <select
            value={selectedUnit}
            onChange={e => setSelectedUnit(e.target.value)}
            className="w-full h-11 px-3.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 shadow-sm cursor-pointer"
          >
            {units.map(u => (
              <option key={u.id} value={u.id}>{u.call_sign} — {u.type.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        {/* Unit status */}
        {unit && (
          <Panel title="Operational Unit Telemetry">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xl font-bold text-slate-900">{unit.call_sign}</span>
              <IncidentStatusChip status={unit.status} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs p-3.5 bg-slate-50 rounded-lg border border-slate-200 mb-4">
              <div>
                <span className="text-slate-500 font-medium">Apparatus:</span>
                <span className="text-slate-800 ml-1.5 font-semibold">{unit.type.replace(/_/g, ' ')}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Crew:</span>
                <span className="text-slate-800 ml-1.5 font-semibold">{unit.crew_size} Officers</span>
              </div>
            </div>

            {/* Quick status buttons */}
            <div className="grid grid-cols-3 gap-2.5">
              <Button variant="primary" size="compact">
                <Navigation size={13} />
                En Route
              </Button>
              <Button variant="secondary" size="compact">
                <MapPin size={13} />
                On Scene
              </Button>
              <Button variant="secondary" size="compact">
                <CheckCircle size={13} />
                Clear Scene
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
        <Panel title="Active Incident Assignment">
          {assignedIncidents.length > 0 ? (
            <div className="space-y-3">
              {assignedIncidents.map(inc => (
                <div key={inc.id} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono font-bold text-slate-600">{inc.code}</span>
                    <SeverityChip severity={inc.severity} score={inc.severity_score} />
                  </div>
                  <div className="text-base font-semibold text-slate-900 mb-1">{inc.title}</div>
                  <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                    <MapPin size={13} className="text-slate-400" />
                    {inc.address}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center text-xs font-medium text-slate-500">
              No active dispatches assigned · Unit standing by
            </div>
          )}
        </Panel>

        {/* Field report */}
        <Panel title="Direct Incident Intelligence Report">
          {submitted ? (
            <div className="text-center py-6">
              <CheckCircle size={32} className="text-emerald-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-900">Field Intelligence Logged</p>
              <Button variant="secondary" size="compact" className="mt-3" onClick={() => setSubmitted(false)}>
                Submit New Observations
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                value={reportText}
                onChange={e => setReportText(e.target.value)}
                placeholder="Observed conditions: trapped count, structural deformation, wind direction, water depth..."
                rows={3}
                className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 resize-none font-sans"
              />
              <Button variant="primary" className="w-full h-10" onClick={() => setSubmitted(true)} disabled={!reportText}>
                <Send size={14} />
                Transmit Field Update
              </Button>
            </div>
          )}
        </Panel>

        {/* Offline indicator */}
        <div className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 text-center flex items-center justify-center gap-2 shadow-sm">
          <AlertTriangle size={15} className="text-amber-500 shrink-0" />
          <span>Offline resilience active: Local IndexedDB queue will sync upon link restoration</span>
        </div>
      </div>
    </div>
  );
}
