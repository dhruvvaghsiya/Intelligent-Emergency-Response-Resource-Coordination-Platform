/* =========================================================================
   RESOURCES PAGE — Fleet Status & Hospital Capacity (Light Theme)
   Features spacious layout, pure white cards, and generous breathing room.
   ========================================================================= */
import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { StatusDot, SimBadge } from '../components/ui/Chip';
import { HeartHandshake, CheckCircle2, X, Pencil, Check } from 'lucide-react';
import { formatRelativeTime, formatCoords } from '../lib/format';
import { STATUS_CONFIG } from '../lib/constants';
import { hasPermission, PERMISSIONS } from '../lib/permissions';

export function ResourcesPage() {
  const { units, hospitals, user, patchHospitalCapacity } = useStore();
  const canManageResources = hasPermission(user, PERMISSIONS.MANAGE_RESOURCES);
  const [tab, setTab] = useState('units');
  const [statusFilter, setStatusFilter] = useState(null);
  const [editingHospitalId, setEditingHospitalId] = useState(null);
  const [editForm, setEditForm] = useState({ beds_available: 0, icu_available: 0 });
  const [savingHospital, setSavingHospital] = useState(false);

  const startEditHospital = (h) => {
    setEditingHospitalId(h.id);
    setEditForm({ beds_available: h.beds_available, icu_available: h.icu_available });
  };

  const saveHospitalCapacity = async (id) => {
    setSavingHospital(true);
    try {
      await patchHospitalCapacity(id, editForm);
      setEditingHospitalId(null);
    } catch {
      // best-effort — leave the row in edit mode so the operator can retry
    } finally {
      setSavingHospital(false);
    }
  };

  const unitsByStatus = units.reduce((acc, u) => {
    acc[u.status] = (acc[u.status] || 0) + 1;
    return acc;
  }, {});

  const filteredUnits = statusFilter
    ? units.filter(u => u.status === statusFilter)
    : units;

  const handleStatusClick = (status) => {
    if (statusFilter === status) {
      setStatusFilter(null);
    } else {
      setStatusFilter(status);
      setTab('units');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-slate-50 select-none">
      <div className="max-w-[1300px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <HeartHandshake size={24} className="text-blue-600" />
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

        {/* Status summary cards as interactive filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {Object.entries(STATUS_CONFIG).map(([status, config]) => {
            const isSelected = statusFilter === status;
            const count = unitsByStatus[status] || 0;
            return (
              <button
                key={status}
                onClick={() => handleStatusClick(status)}
                className={`text-left rounded-xl p-4 transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/40 border-2 border-blue-600 shadow-md ring-2 ring-blue-100 transform scale-[1.02]'
                    : 'bg-white border border-slate-200 shadow-xs hover:border-blue-400 hover:shadow-md hover:scale-[1.01]'
                }`}
              >
                <div className="text-xs font-medium text-slate-500 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${config.dot}`} />
                    <span className={isSelected ? 'font-semibold text-blue-900' : ''}>{config.label}</span>
                  </div>
                  {isSelected && (
                    <span className="text-[10px] font-bold uppercase bg-blue-600 text-white px-1.5 py-0.5 rounded">
                      Active
                    </span>
                  )}
                </div>
                <div className={`text-2xl font-bold mt-2 ${isSelected ? 'text-blue-600' : 'text-slate-900'}`}>
                  {count}
                </div>
              </button>
            );
          })}
        </div>

        {/* Tabs & Active Filter Pill */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-px">
          <div className="flex gap-4">
            <button
              onClick={() => setTab('units')}
              className={`pb-3 text-sm font-semibold cursor-pointer transition-all border-b-2 ${
                tab === 'units'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-slate-500 border-transparent hover:text-slate-900'
              }`}
            >
              Dispatch Units ({statusFilter ? `${filteredUnits.length} of ${units.length}` : units.length})
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

          {statusFilter && tab === 'units' && (
            <div className="flex items-center gap-2 pb-2">
              <span className="text-xs text-slate-500">
                Filtered by: <strong className="text-slate-800">{STATUS_CONFIG[statusFilter]?.label}</strong>
              </span>
              <button
                onClick={() => setStatusFilter(null)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-red-600 bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-200 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
              >
                <X size={12} />
                Clear filter
              </button>
            </div>
          )}
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
                {filteredUnits.length > 0 ? (
                  filteredUnits.map(unit => (
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
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                      <div className="max-w-xs mx-auto space-y-2">
                        <p className="text-sm font-medium text-slate-700">
                          No units currently in "{STATUS_CONFIG[statusFilter]?.label || statusFilter}" status
                        </p>
                        <p className="text-xs text-slate-400">
                          Try selecting another status category or clear the filter.
                        </p>
                        <button
                          onClick={() => setStatusFilter(null)}
                          className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          View All Units
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
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
                  {canManageResources && <th className="px-5 text-right w-10"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {hospitals.map(h => {
                  const isEditing = editingHospitalId === h.id;
                  return (
                  <tr key={h.id} className="h-12 hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 text-slate-900 font-semibold">{h.name}</td>
                    <td className="px-5 text-right">
                      {isEditing ? (
                        <input
                          type="number" min={0} max={h.beds_total} value={editForm.beds_available}
                          onChange={e => setEditForm(f => ({ ...f, beds_available: Number(e.target.value) }))}
                          className="w-16 h-7 px-2 text-right bg-white border border-blue-300 rounded-md text-sm font-bold focus:border-blue-600 focus:outline-none"
                        />
                      ) : (
                        <span className={`text-sm font-bold ${
                          h.beds_available < 10 ? 'text-red-700 font-bold' :
                          h.beds_available < 25 ? 'text-amber-700' : 'text-emerald-700'
                        }`}>
                          {h.beds_available}
                        </span>
                      )}
                      <span className="text-xs text-slate-400"> / {h.beds_total}</span>
                    </td>
                    <td className="px-5 text-right">
                      {isEditing ? (
                        <input
                          type="number" min={0} value={editForm.icu_available}
                          onChange={e => setEditForm(f => ({ ...f, icu_available: Number(e.target.value) }))}
                          className="w-16 h-7 px-2 text-right bg-white border border-blue-300 rounded-md text-sm font-bold focus:border-blue-600 focus:outline-none"
                        />
                      ) : (
                        <span className={`text-sm font-bold ${
                          h.icu_available < 3 ? 'text-orange-700' : 'text-emerald-700'
                        }`}>
                          {h.icu_available} units
                        </span>
                      )}
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
                    {canManageResources && (
                      <td className="px-5 text-right">
                        {isEditing ? (
                          <button
                            onClick={() => saveHospitalCapacity(h.id)}
                            disabled={savingHospital}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer disabled:opacity-50"
                            title="Save"
                          >
                            <Check size={14} />
                          </button>
                        ) : (
                          <button
                            onClick={() => startEditHospital(h)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Edit capacity"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
