/* =========================================================================
   RESOURCES PAGE — Fleet Status & Hospital Capacity (Light Theme)
   Features spacious layout, pure white cards, and generous breathing room.
   ========================================================================= */
import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { StatusDot, SimBadge } from '../components/ui/Chip';
import { HeartHandshake, CheckCircle2, X, Pencil, Check, Plus, Truck, Shield } from 'lucide-react';
import { formatRelativeTime, formatCoords } from '../lib/format';
import { STATUS_CONFIG } from '../lib/constants';
import { hasPermission, PERMISSIONS } from '../lib/permissions';
import { Button } from '../components/ui/Button';

const UNIT_STATUS_OPTIONS = ['AVAILABLE', 'EN_ROUTE', 'ON_SCENE', 'RETURNING', 'OUT_OF_SERVICE', 'OFFLINE'];
const UNIT_TYPE_OPTIONS = ['AMBULANCE_ALS', 'AMBULANCE_BLS', 'FIRE_ENGINE', 'FIRE_LADDER', 'HAZMAT', 'RESCUE_TECHNICAL', 'POLICE_PATROL'];

export function ResourcesPage() {
  const { units, hospitals, user, patchHospitalCapacity, patchUnit, createUnit } = useStore();
  const canManageResources = hasPermission(user, PERMISSIONS.MANAGE_RESOURCES);
  const [tab, setTab] = useState('units');
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [editingHospitalId, setEditingHospitalId] = useState(null);
  const [editForm, setEditForm] = useState({ beds_available: 0, icu_available: 0 });
  const [savingHospital, setSavingHospital] = useState(false);

  // Unit management
  const [editingUnitId, setEditingUnitId] = useState(null);
  const [unitEditForm, setUnitEditForm] = useState({ status: 'AVAILABLE', crew_size: 2 });
  const [savingUnit, setSavingUnit] = useState(false);

  // Add unit modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    call_sign: '',
    type: 'FIRE_ENGINE',
    crew_size: 3,
    station_id: 'STATION-MAIN',
    capabilities: 'FIRE_SUPPRESSION',
  });
  const [addingUnit, setAddingUnit] = useState(false);

  const startEditUnit = (u) => {
    setEditingUnitId(u.id);
    setUnitEditForm({ status: u.status, crew_size: u.crew_size });
  };

  const saveUnitEdit = async (id) => {
    setSavingUnit(true);
    try {
      await patchUnit(id, unitEditForm);
      setEditingUnitId(null);
    } catch (err) {
      console.warn('Failed to update unit:', err);
    } finally {
      setSavingUnit(false);
    }
  };

  const handleCreateUnit = async (e) => {
    e.preventDefault();
    if (!addForm.call_sign.trim()) return;
    setAddingUnit(true);
    try {
      await createUnit({
        call_sign: addForm.call_sign.trim().toUpperCase(),
        type: addForm.type,
        crew_size: Number(addForm.crew_size) || 2,
        station_id: addForm.station_id.trim() || 'STATION-MAIN',
        capabilities: addForm.capabilities.split(',').map(c => c.trim()).filter(Boolean),
      });
      setShowAddModal(false);
      setAddForm({
        call_sign: '',
        type: 'FIRE_ENGINE',
        crew_size: 3,
        station_id: 'STATION-MAIN',
        capabilities: 'FIRE_SUPPRESSION',
      });
    } catch (err) {
      console.warn('Failed to create unit:', err);
    } finally {
      setAddingUnit(false);
    }
  };

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

  const filteredUnits = selectedStatuses.length > 0
    ? units.filter(u => selectedStatuses.includes(u.status))
    : units;

  const handleStatusClick = (status) => {
    setSelectedStatuses((prev) => {
      if (prev.includes(status)) {
        return prev.filter(s => s !== status);
      } else {
        return [...prev, status];
      }
    });
    setTab('units');
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50 select-none">
      <div className="max-w-[1300px] mx-auto space-y-4 sm:space-y-6">
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
          <div className="flex items-center gap-3">
            {canManageResources && (
              <Button
                variant="primary"
                size="compact"
                onClick={() => setShowAddModal(true)}
                className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-xs cursor-pointer flex items-center gap-1.5 rounded-lg px-3 py-1.5"
              >
                <Plus size={15} />
                Add Apparatus
              </Button>
            )}
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full flex items-center gap-2">
              <CheckCircle2 size={15} />
              GPS Beacons Online
            </span>
          </div>
        </div>

        {/* Status summary cards as interactive filters (Multi-select enabled) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {Object.entries(STATUS_CONFIG).map(([status, config]) => {
            const isSelected = selectedStatuses.includes(status);
            const count = unitsByStatus[status] || 0;
            return (
              <button
                key={status}
                type="button"
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
                    <span className="text-[10px] font-bold uppercase bg-blue-600 text-white px-1.5 py-0.5 rounded shadow-2xs">
                      ACTIVE
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

        {/* Tabs & Active Filter Pills */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-px">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setTab('units')}
              className={`pb-3 text-sm font-semibold cursor-pointer transition-all border-b-2 ${
                tab === 'units'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-slate-500 border-transparent hover:text-slate-900'
              }`}
            >
              Dispatch Units ({selectedStatuses.length > 0 ? `${filteredUnits.length} of ${units.length}` : units.length})
            </button>
            <button
              type="button"
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

          {selectedStatuses.length > 0 && tab === 'units' && (
            <div className="flex items-center gap-2 pb-2 flex-wrap">
              <span className="text-xs text-slate-500 font-medium">Filtered by:</span>
              {selectedStatuses.map((st) => (
                <span
                  key={st}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-200/90 px-2.5 py-1 rounded-lg shadow-2xs"
                >
                  <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[st]?.dot}`} />
                  {STATUS_CONFIG[st]?.label}
                  <button
                    type="button"
                    onClick={() => handleStatusClick(st)}
                    className="hover:text-red-600 text-slate-400 cursor-pointer transition-colors ml-0.5"
                    title={`Remove ${STATUS_CONFIG[st]?.label} filter`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => setSelectedStatuses([])}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-red-600 bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ml-1"
              >
                <X size={12} /> Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Unit table */}
        {tab === 'units' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto shadow-sm">
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
                  {canManageResources && <th className="px-5 text-right w-24">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredUnits.length > 0 ? (
                  filteredUnits.map(unit => {
                    const isEditing = editingUnitId === unit.id;
                    return (
                      <tr key={unit.id} className="h-12 hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 font-mono font-bold text-slate-900">{unit.call_sign}</td>
                        <td className="px-5 text-slate-700 font-medium">{unit.type.replace(/_/g, ' ')}</td>
                        <td className="px-5">
                          {isEditing ? (
                            <select
                              value={unitEditForm.status}
                              onChange={e => setUnitEditForm(f => ({ ...f, status: e.target.value }))}
                              className="text-xs font-bold bg-white border border-blue-400 rounded px-2 py-1 focus:outline-none"
                            >
                              {UNIT_STATUS_OPTIONS.map(opt => (
                                <option key={opt} value={opt}>
                                  {STATUS_CONFIG[opt]?.label || opt}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <StatusDot status={unit.status} />
                          )}
                        </td>
                        <td className="px-5">
                          <div className="flex gap-1.5 flex-wrap">
                            {unit.capabilities.map(c => (
                              <span key={c} className="text-xs px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-slate-600">
                                {c.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 text-slate-700 text-center font-semibold">
                          {isEditing ? (
                            <input
                              type="number"
                              min={1}
                              max={12}
                              value={unitEditForm.crew_size}
                              onChange={e => setUnitEditForm(f => ({ ...f, crew_size: Number(e.target.value) }))}
                              className="w-14 h-7 text-center bg-white border border-blue-400 rounded text-xs font-bold focus:outline-none"
                            />
                          ) : (
                            unit.crew_size
                          )}
                        </td>
                        <td className="px-5 font-mono text-xs text-slate-400">{formatCoords(unit.location)}</td>
                        <td className="px-5 text-right text-xs text-slate-500">{formatRelativeTime(unit.last_location_at)}</td>
                        {canManageResources && (
                          <td className="px-5 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => saveUnitEdit(unit.id)}
                                  disabled={savingUnit}
                                  title="Save unit"
                                  className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 cursor-pointer disabled:opacity-50"
                                >
                                  <Check size={16} />
                                </button>
                                <button
                                  onClick={() => setEditingUnitId(null)}
                                  title="Cancel"
                                  className="p-1 rounded-md text-slate-400 hover:bg-slate-100 cursor-pointer"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => startEditUnit(unit)}
                                title="Edit status & crew"
                                className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              >
                                <Pencil size={15} />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={canManageResources ? 8 : 7} className="px-5 py-16 text-center">
                      <div className="max-w-md mx-auto flex flex-col items-center justify-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
                          <Truck size={24} />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-base font-bold text-slate-900 tracking-tight">
                            No Apparatus Matching Selection
                          </h3>
                          <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-sm">
                            {selectedStatuses.length > 0
                              ? `No dispatch units found matching filter(s): ${selectedStatuses.map(s => STATUS_CONFIG[s]?.label || s).join(', ')}`
                              : 'There are currently no dispatch units registered in the system.'}
                          </p>
                        </div>
                        {selectedStatuses.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedStatuses([])}
                            className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 border border-blue-200/90 px-3.5 py-2 rounded-xl transition-colors cursor-pointer shadow-xs"
                          >
                            <X size={14} />
                            Reset Filter & Show All Units ({units.length})
                          </button>
                        )}
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
          <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto shadow-sm">
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

      {/* Add Apparatus Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Truck size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add Emergency Apparatus</h3>
                  <p className="text-xs text-slate-500">Register new fleet unit & crew</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUnit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Call Sign
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FE-09, AMB-04"
                  value={addForm.call_sign}
                  onChange={e => setAddForm(f => ({ ...f, call_sign: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Type
                  </label>
                  <select
                    value={addForm.type}
                    onChange={e => setAddForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-none bg-white font-medium"
                  >
                    {UNIT_TYPE_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Crew Size
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    required
                    value={addForm.crew_size}
                    onChange={e => setAddForm(f => ({ ...f, crew_size: e.target.value }))}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Base Station
                </label>
                <input
                  type="text"
                  placeholder="e.g. STATION-NARODA, STATION-MAIN"
                  value={addForm.station_id}
                  onChange={e => setAddForm(f => ({ ...f, station_id: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Capabilities (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="FIRE_SUPPRESSION, HAZMAT_CONTAINMENT"
                  value={addForm.capabilities}
                  onChange={e => setAddForm(f => ({ ...f, capabilities: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:border-blue-600 focus:outline-none text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="ghost"
                  size="compact"
                  onClick={() => setShowAddModal(false)}
                  className="text-xs text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="compact"
                  disabled={addingUnit}
                  className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl"
                >
                  {addingUnit ? 'Creating...' : 'Register Apparatus'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
