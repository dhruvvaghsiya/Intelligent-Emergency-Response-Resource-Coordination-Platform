/* =========================================================================
   ZUSTAND STORE — §14.4 State Management
   Owns: socket connection, per-room lastSeq, live entity overlays,
   selection, map viewport, filters, STALE flag
   ========================================================================= */
import { create } from 'zustand';
import { MOCK_INCIDENTS, MOCK_UNITS, MOCK_ALERTS, MOCK_HOSPITALS } from '../mocks/fixtures';

export const useStore = create((set, get) => ({
  // ——— Auth ———
  user: null,
  token: null,
  isAuthenticated: false,
  login: (user, token) => set({ user, token, isAuthenticated: true }),
  logout: () => set({ user: null, token: null, isAuthenticated: false }),

  // ——— Incidents (live overlay) ———
  incidents: MOCK_INCIDENTS,
  selectedIncidentId: null,
  selectIncident: (id) => set({ selectedIncidentId: id }),
  clearSelection: () => set({ selectedIncidentId: null }),
  getSelectedIncident: () => {
    const state = get();
    return state.incidents.find(i => i.id === state.selectedIncidentId) || null;
  },

  // ——— Units (live overlay) ———
  units: MOCK_UNITS,

  // ——— Alerts ———
  alerts: MOCK_ALERTS,
  ackAlert: (alertId) => set(state => ({
    alerts: state.alerts.map(a =>
      a.id === alertId ? { ...a, acked_by: state.user?.id, acked_at: new Date().toISOString() } : a
    ),
  })),

  // ——— Hospitals ———
  hospitals: MOCK_HOSPITALS,

  // ——— Filters ———
  filters: {
    severity: [],
    status: [],
    type: [],
    search: '',
    hasConflict: false,
  },
  setFilter: (key, value) => set(state => ({
    filters: { ...state.filters, [key]: value },
  })),
  clearFilters: () => set({
    filters: { severity: [], status: [], type: [], search: '', hasConflict: false },
  }),

  // ——— Map viewport ———
  mapViewport: {
    center: [72.5714, 23.0258], // Ahmedabad center
    zoom: 12,
  },
  setMapViewport: (viewport) => set({ mapViewport: viewport }),

  // ——— Map layers ———
  mapLayers: {
    incidents: true,
    units: true,
    coverage: false,
    closures: false,
  },
  toggleMapLayer: (layer) => set(state => ({
    mapLayers: { ...state.mapLayers, [layer]: !state.mapLayers[layer] },
  })),

  // ——— Realtime / connection state ———
  connectionStatus: 'connected', // 'connected' | 'reconnecting' | 'stale' | 'disconnected'
  lastEventAt: new Date().toISOString(),
  lastSeq: {},
  setConnectionStatus: (status) => set({ connectionStatus: status }),

  // ——— Live feed ———
  liveFeed: [
    { id: 'feed_1', type: 'incident.created', text: 'New incident: INC-2026-0150 — Gas leak at Naroda GIDC', severity: 'HIGH', ts: new Date(Date.now() - 6 * 60000).toISOString() },
    { id: 'feed_2', type: 'assignment.approved', text: 'A-02 dispatched to INC-2026-0147', severity: 'CRITICAL', ts: new Date(Date.now() - 11 * 60000).toISOString() },
    { id: 'feed_3', type: 'evidence.added', text: 'Field report: FE-01 confirms active fire at INC-0147', severity: 'CRITICAL', ts: new Date(Date.now() - 7 * 60000).toISOString() },
    { id: 'feed_4', type: 'belief.conflict_detected', text: 'CONTESTED: people_trapped at INC-0147 — citizen vs sensor', severity: 'HIGH', ts: new Date(Date.now() - 12 * 60000).toISOString() },
    { id: 'feed_5', type: 'unit.status_changed', text: 'FE-01 arrived on scene at INC-2026-0147', severity: 'INFO', ts: new Date(Date.now() - 8 * 60000).toISOString() },
  ],
  liveFeedExpanded: false,
  toggleLiveFeed: () => set(state => ({ liveFeedExpanded: !state.liveFeedExpanded })),

  // ——— Right rail state ———
  rightRailTab: 'overview', // 'overview' | 'evidence' | 'response' | 'related' | 'timeline'
  setRightRailTab: (tab) => set({ rightRailTab: tab }),

  // ——— Simulation ———
  simStatus: { running: false, scenario: null, speed: 1, clock: null },
}));
