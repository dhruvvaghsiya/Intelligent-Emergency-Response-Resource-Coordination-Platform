/* =========================================================================
   RESOURCES PAGE — Unit board + Hospital capacity
   ========================================================================= */
import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { StatusDot, SimBadge } from '../components/ui/Chip';
import { Panel, PanelSection } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { MapPin, Clock, Activity, Building2, Bed } from 'lucide-react';
import { formatRelativeTime, formatCoords } from '../lib/format';
import { UNIT_TYPE, STATUS_CONFIG } from '../lib/constants';

export function ResourcesPage() {
  const { units, hospitals } = useStore();
  const [tab, setTab] = useState('units');

  const unitsByStatus = units.reduce((acc, u) => {
    acc[u.status] = (acc[u.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="max-w-[1200px] mx-auto">
        <h1 className="text-[21px] font-semibold text-text-primary mb-4">Resources</h1>

        {/* Status summary */}
        <div className="flex gap-3 mb-4 flex-wrap">
          {Object.entries(STATUS_CONFIG).map(([status, config]) => (
            <div key={status} className="bg-surface border border-border-subtle rounded-[4px] px-3 py-2 min-w-[100px]">
              <div className="text-[10px] text-text-muted uppercase tracking-wider">{config.label}</div>
              <div className="font-mono text-[21px] font-semibold text-text-primary">{unitsByStatus[status] || 0}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 mb-4 border-b border-border-subtle">
          <button
            onClick={() => setTab('units')}
            className={`px-4 h-[32px] text-[13px] font-medium border-b-2 cursor-pointer transition-colors ${
              tab === 'units' ? 'text-accent border-accent' : 'text-text-muted border-transparent hover:text-text-secondary'
            }`}
          >
            Units ({units.length})
          </button>
          <button
            onClick={() => setTab('hospitals')}
            className={`px-4 h-[32px] text-[13px] font-medium border-b-2 cursor-pointer transition-colors ${
              tab === 'hospitals' ? 'text-accent border-accent' : 'text-text-muted border-transparent hover:text-text-secondary'
            }`}
          >
            Hospitals ({hospitals.length})
          </button>
        </div>

        {/* Unit table */}
        {tab === 'units' && (
          <div className="bg-surface border border-border-subtle rounded-[4px] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="h-[28px] bg-inset border-b border-border-subtle text-[11px] text-text-muted uppercase tracking-wider">
                  <th className="text-left px-3 font-medium">Call Sign</th>
                  <th className="text-left px-3 font-medium">Type</th>
                  <th className="text-left px-3 font-medium">Status</th>
                  <th className="text-left px-3 font-medium">Capabilities</th>
                  <th className="text-left px-3 font-medium">Crew</th>
                  <th className="text-left px-3 font-medium">Location</th>
                  <th className="text-right px-3 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {units.map(unit => (
                  <tr key={unit.id} className="h-[28px] border-b border-border-subtle hover:bg-hover transition-colors">
                    <td className="px-3 font-mono text-[13px] font-semibold text-text-primary">{unit.call_sign}</td>
                    <td className="px-3 text-[12px] text-text-secondary">{unit.type.replace(/_/g, ' ')}</td>
                    <td className="px-3"><StatusDot status={unit.status} /></td>
                    <td className="px-3">
                      <div className="flex gap-1 flex-wrap">
                        {unit.capabilities.map(c => (
                          <span key={c} className="text-[10px] px-1.5 py-0.5 bg-inset border border-border-subtle rounded text-text-muted">
                            {c.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 font-mono text-[12px] text-text-secondary text-center">{unit.crew_size}</td>
                    <td className="px-3 font-mono text-[11px] text-text-muted">{formatCoords(unit.location)}</td>
                    <td className="px-3 text-right text-[11px] text-text-muted">{formatRelativeTime(unit.last_location_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Hospital table */}
        {tab === 'hospitals' && (
          <div className="bg-surface border border-border-subtle rounded-[4px] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="h-[28px] bg-inset border-b border-border-subtle text-[11px] text-text-muted uppercase tracking-wider">
                  <th className="text-left px-3 font-medium">Hospital</th>
                  <th className="text-right px-3 font-medium">Beds Available</th>
                  <th className="text-right px-3 font-medium">ICU</th>
                  <th className="text-left px-3 font-medium">Specialities</th>
                  <th className="text-right px-3 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {hospitals.map(h => (
                  <tr key={h.id} className="h-[28px] border-b border-border-subtle hover:bg-hover transition-colors">
                    <td className="px-3 text-[13px] text-text-primary font-medium">{h.name}</td>
                    <td className="px-3 text-right">
                      <span className={`font-mono text-[13px] font-semibold ${h.beds_available < 10 ? 'text-sev-critical' : h.beds_available < 25 ? 'text-sev-moderate' : 'text-status-available'}`}>
                        {h.beds_available}
                      </span>
                      <span className="text-[11px] text-text-muted">/{h.beds_total}</span>
                    </td>
                    <td className="px-3 text-right">
                      <span className={`font-mono text-[13px] font-semibold ${h.icu_available < 3 ? 'text-sev-high' : 'text-status-available'}`}>
                        {h.icu_available}
                      </span>
                    </td>
                    <td className="px-3">
                      <div className="flex gap-1 flex-wrap">
                        {h.specialities.map(s => (
                          <span key={s} className="text-[10px] px-1.5 py-0.5 bg-inset border border-border-subtle rounded text-text-muted">
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 text-right text-[11px] text-text-muted">{formatRelativeTime(h.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
