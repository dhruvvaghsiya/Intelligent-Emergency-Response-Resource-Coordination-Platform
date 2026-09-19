/* =========================================================================
   RESOURCES PAGE — Fleet Status & Hospital Capacity (Light Theme)
   Features spacious layout, pure white cards, and generous breathing room.
   ========================================================================= */
import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { StatusDot, SimBadge } from '../components/ui/Chip';
import { Layers, CheckCircle2 } from 'lucide-react';
import { formatRelativeTime, formatCoords } from '../lib/format';
import { STATUS_CONFIG } from '../lib/constants';

export function ResourcesPage() {
  const { units, hospitals } = useStore();
  const [tab, setTab] = useState('units');

  const unitsByStatus = units.reduce((acc, u) => {
    acc[u.status] = (acc[u.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-slate-50 select-none">
      <div className="max-w-[1300px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Layers size={24} className="text-blue-600" />
              Fleet & Healthcare Facility Registry
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Active Municipal Apparatus Telemetry & Regional Emergency Bed Networks
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full flex items-center gap-2">
              <CheckCircle2 size={15} />
              GPS Beacons Online
            </span>
          </div>
        </div>

        {/* Status summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {Object.entries(STATUS_CONFIG).map(([status, config]) => (
            <div
              key={status}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"
            >
              <div className="text-xs font-medium text-slate-500 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${config.dot}`} />
                {config.label}
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">
                {unitsByStatus[status] || 0}
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-slate-200 pb-px">
          <button
            onClick={() => setTab('units')}
            className={`pb-3 text-sm font-semibold cursor-pointer transition-all border-b-2 ${
              tab === 'units'
                ? 'text-blue-600 border-blue-600'
                : 'text-slate-500 border-transparent hover:text-slate-900'
            }`}
          >
            Dispatch Units ({units.length})
          </button>
          <button
            onClick={() => setTab('hospitals')}
            className={`pb-3 text-sm font-semibold cursor-pointer transition-all border-b-2 ${
              tab === 'hospitals'
                ? 'text-blue-600 border-blue-600'
                : 'text-slate-500 border-transparent hover:text-slate-900'
            }`}
          >
            Hospital Networks ({hospitals.length})
          </button>
        </div>

        {/* Unit table */}
        {tab === 'units' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="h-11 bg-slate-50/70 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-5">Call Sign</th>
                  <th className="px-5">Apparatus Type</th>
                  <th className="px-5">Status</th>
                  <th className="px-5">Capabilities</th>
                  <th className="px-5 text-center">Crew Size</th>
                  <th className="px-5">Coordinates</th>
                  <th className="px-5 text-right">Last Telemetry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {units.map(unit => (
                  <tr key={unit.id} className="h-12 hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 font-mono font-bold text-slate-900">{unit.call_sign}</td>
                    <td className="px-5 text-slate-700 font-medium">{unit.type.replace(/_/g, ' ')}</td>
                    <td className="px-5"><StatusDot status={unit.status} /></td>
                    <td className="px-5">
                      <div className="flex gap-1.5 flex-wrap">
                        {unit.capabilities.map(c => (
                          <span key={c} className="text-xs px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-slate-600">
                            {c.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 text-slate-700 text-center font-semibold">{unit.crew_size}</td>
                    <td className="px-5 font-mono text-xs text-slate-400">{formatCoords(unit.location)}</td>
                    <td className="px-5 text-right text-xs text-slate-500">{formatRelativeTime(unit.last_location_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Hospital table */}
        {tab === 'hospitals' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="h-11 bg-slate-50/70 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-5">Hospital Facility</th>
                  <th className="px-5 text-right">Available Beds</th>
                  <th className="px-5 text-right">ICU Capacity</th>
                  <th className="px-5">Specialty Services</th>
                  <th className="px-5 text-right">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {hospitals.map(h => (
                  <tr key={h.id} className="h-12 hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 text-slate-900 font-semibold">{h.name}</td>
                    <td className="px-5 text-right">
                      <span className={`text-sm font-bold ${
                        h.beds_available < 10 ? 'text-red-700 font-bold' :
                        h.beds_available < 25 ? 'text-amber-700' : 'text-emerald-700'
                      }`}>
                        {h.beds_available}
                      </span>
                      <span className="text-xs text-slate-400"> / {h.beds_total}</span>
                    </td>
                    <td className="px-5 text-right">
                      <span className={`text-sm font-bold ${
                        h.icu_available < 3 ? 'text-orange-700' : 'text-emerald-700'
                      }`}>
                        {h.icu_available} units
                      </span>
                    </td>
                    <td className="px-5">
                      <div className="flex gap-1.5 flex-wrap">
                        {h.specialities.map(s => (
                          <span key={s} className="text-xs px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-slate-600">
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 text-right text-xs text-slate-400">{formatRelativeTime(h.updated_at)}</td>
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
