/* =========================================================================
   ZUSTAND STORE — §14.4 State Management
   Owns: auth, socket connection, per-room lastSeq, live entity overlays,
   selection, map viewport, filters, STALE flag
   ========================================================================= */
import { create } from 'zustand';
import {
  authApi, incidentsApi, unitsApi, hospitalsApi, alertsApi,
  storeTokens, clearTokens, getStoredToken, setOnAuthFailure,
} from './api';
import { connectSocket, disconnectSocket } from './socket';
import { MOCK_INCIDENTS, MOCK_UNITS, MOCK_ALERTS, MOCK_HOSPITALS } from '../mocks/fixtures';

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

function loadStoredUser() {
  try {
    const raw = localStorage.getItem('prahari.user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function pushFeed(state, { type, text, severity = 'INFO' }) {
  const entry = { id: `feed_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, type, text, severity, ts: new Date().toISOString() };
  return [entry, ...state.liveFeed].slice(0, 100);
}

function upsertById(list, item) {
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx === -1) return [item, ...list];
  const next = list.slice();
  next[idx] = { ...next[idx], ...item };
  return next;
}

export const useStore = create((set, get) => ({
  // ——— Auth ———
  user: loadStoredUser(),
  token: getStoredToken(),
  isAuthenticated: Boolean(getStoredToken()),
  authLoading: false,
  authError: null,

  login: async (email, password) => {
    set({ authLoading: true, authError: null });
    try {
      const data = await authApi.login(email, password);
      storeTokens(data);
      localStorage.setItem('prahari.user', JSON.stringify(data.user));
      set({ user: data.user, token: data.access_token, isAuthenticated: true, authLoading: false });
      get().connectRealtime();
      get().fetchAll();
      return { ok: true };
    } catch (err) {
      const message = err?.response?.data?.error?.message || 'Invalid credentials';
      set({ authLoading: false, authError: message });
      return { ok: false, error: message };
    }
  },

  restoreSession: async () => {
    const token = getStoredToken();
    if (!token) return;
    try {
      const user = await authApi.me();
      set({ user, token, isAuthenticated: true });
      get().connectRealtime();
      get().fetchAll();
    } catch {
      clearTokens();
      localStorage.removeItem('prahari.user');
      set({ user: null, token: null, isAuthenticated: false });
    }
  },

  logout: () => {
    clearTokens();
    localStorage.removeItem('prahari.user');
    disconnectSocket();
    set({ user: null, token: null, isAuthenticated: false });
  },

  // ——— Realtime ———
  connectRealtime: () => {
    const token = getStoredToken();
    if (!token) return;
    const socket = connectSocket(token);

    socket.on('heartbeat', () => set({ connectionStatus: 'connected', lastEventAt: new Date().toISOString() }));
    socket.on('connect', () => set({ connectionStatus: 'connected' }));
    socket.on('disconnect', () => set({ connectionStatus: 'reconnecting' }));
    socket.on('connect_error', () => set({ connectionStatus: 'reconnecting' }));

    const upsertIncidentEvent = (label) => (evt) => set((state) => ({
      incidents: upsertById(state.incidents, evt.payload),
      lastEventAt: evt.ts,
      liveFeed: pushFeed(state, { type: evt.type, text: `${label}: ${evt.payload?.code || evt.payload?.id}`, severity: evt.payload?.severity || 'INFO' }),
    }));

    socket.on('incident.created', upsertIncidentEvent('New incident'));
    socket.on('incident.updated', upsertIncidentEvent('Incident updated'));
    socket.on('incident.status_changed', upsertIncidentEvent('Status changed'));
    socket.on('incident.severity_changed', upsertIncidentEvent('Severity changed'));

    socket.on('unit.status_changed', (evt) => set((state) => ({
      units: upsertById(state.units, evt.payload),
      lastEventAt: evt.ts,
      liveFeed: pushFeed(state, { type: evt.type, text: `${evt.payload?.call_sign} status: ${evt.payload?.status}`, severity: 'INFO' }),
    })));
    socket.on('unit.location', (evt) => set((state) => ({
      units: upsertById(state.units, evt.payload),
      lastEventAt: evt.ts,
    })));

    socket.on('assignment.approved', (evt) => set((state) => ({
      lastEventAt: evt.ts,
      liveFeed: pushFeed(state, { type: evt.type, text: `Assignment approved: ${evt.payload?.unit_call_sign || evt.payload?.id}`, severity: 'HIGH' }),
    })));
    socket.on('assignment.status_changed', (evt) => set((state) => ({
      lastEventAt: evt.ts,
      liveFeed: pushFeed(state, { type: evt.type, text: `Assignment ${evt.payload?.status}`, severity: 'INFO' }),
    })));

    socket.on('evidence.added', (evt) => set((state) => ({
      lastEventAt: evt.ts,
      liveFeed: pushFeed(state, { type: evt.type, text: `New evidence on ${evt.entity?.id}`, severity: 'INFO' }),
    })));
    socket.on('belief.updated', (evt) => set({ lastEventAt: evt.ts }));
    socket.on('belief.conflict_detected', (evt) => set((state) => ({
      lastEventAt: evt.ts,
      liveFeed: pushFeed(state, { type: evt.type, text: `CONTESTED: ${evt.payload?.attribute || ''} at ${evt.entity?.id}`, severity: 'HIGH' }),
    })));

    socket.on('alert.raised', (evt) => set((state) => ({
      alerts: upsertById(state.alerts, evt.payload),
      lastEventAt: evt.ts,
      liveFeed: pushFeed(state, { type: evt.type, text: evt.payload?.title, severity: evt.payload?.severity || 'INFO' }),
    })));
    socket.on('alert.acked', (evt) => set((state) => ({
      alerts: upsertById(state.alerts, evt.payload),
      lastEventAt: evt.ts,
    })));

    socket.on('cascade.effect_applied', (evt) => set((state) => ({
      lastEventAt: evt.ts,
      liveFeed: pushFeed(state, { type: evt.type, text: 'Cascade effect applied', severity: 'MODERATE' }),
    })));
    socket.on('dispatch.plan_generated', (evt) => set((state) => ({
      lastEventAt: evt.ts,
      liveFeed: pushFeed(state, { type: evt.type, text: `Dispatch plans generated for ${evt.entity?.id}`, severity: 'INFO' }),
    })));
  },

  // ——— Incidents (live overlay) ———
  incidents: [],
  selectedIncidentId: null,
  selectIncident: (id) => {
    set({ selectedIncidentId: id });
    get().fetchIncidentDetail(id);
  },
  clearSelection: () => set({ selectedIncidentId: null }),
  getSelectedIncident: () => {
    const state = get();
    return state.incidents.find(i => i.id === state.selectedIncidentId) || null;
  },
  fetchIncidentDetail: async (id) => {
    try {
      const detail = await incidentsApi.get(id);
      set(state => ({ incidents: upsertById(state.incidents, detail) }));
    } catch (err) {
      console.warn('fetchIncidentDetail failed', err);
    }
  },
  fetchIncidents: async () => {
    try {
      const data = await incidentsApi.list();
      set({ incidents: data });
    } catch (err) {
      if (USE_MOCKS) {
        console.warn('fetchIncidents failed, using mock data', err);
        set({ incidents: MOCK_INCIDENTS });
      } else {
        console.warn('fetchIncidents failed', err);
      }
    }
  },

  // ——— Units (live overlay) ———
  units: [],
  fetchUnits: async () => {
    try {
      const data = await unitsApi.list();
      set({ units: data });
    } catch (err) {
      if (USE_MOCKS) {
        console.warn('fetchUnits failed, using mock data', err);
        set({ units: MOCK_UNITS });
      } else {
        console.warn('fetchUnits failed', err);
      }
    }
  },

  // ——— Alerts ———
  alerts: [],
  fetchAlerts: async () => {
    try {
      const data = await alertsApi.list();
      set({ alerts: data });
    } catch (err) {
      if (USE_MOCKS) {
        console.warn('fetchAlerts failed, using mock data', err);
        set({ alerts: MOCK_ALERTS });
      } else {
        console.warn('fetchAlerts failed', err);
      }
    }
  },
  ackAlert: async (alertId) => {
    const prev = get().alerts;
    set(state => ({
      alerts: state.alerts.map(a =>
        a.id === alertId ? { ...a, acked_by: state.user?.id, acked_at: new Date().toISOString() } : a
      ),
    }));
    try {
      await alertsApi.ack(alertId);
    } catch (err) {
      console.warn('ackAlert failed, reverting', err);
      set({ alerts: prev });
    }
  },

  // ——— Hospitals ———
  hospitals: [],
  fetchHospitals: async () => {
    try {
      const data = await hospitalsApi.list();
      set({ hospitals: data });
    } catch (err) {
      if (USE_MOCKS) {
        console.warn('fetchHospitals failed, using mock data', err);
        set({ hospitals: MOCK_HOSPITALS });
      } else {
        console.warn('fetchHospitals failed', err);
      }
    }
  },

  fetchAll: () => {
    get().fetchIncidents();
    get().fetchUnits();
    get().fetchAlerts();
    get().fetchHospitals();
  },

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
  connectionStatus: 'disconnected', // 'connected' | 'reconnecting' | 'stale' | 'disconnected'
  lastEventAt: new Date().toISOString(),
  lastSeq: {},
  setConnectionStatus: (status) => set({ connectionStatus: status }),

  // ——— Live feed ———
  liveFeed: [],
  liveFeedExpanded: false,
  toggleLiveFeed: () => set(state => ({ liveFeedExpanded: !state.liveFeedExpanded })),

  // ——— Right rail state ———
  rightRailTab: 'overview', // 'overview' | 'evidence' | 'response' | 'related' | 'timeline'
  setRightRailTab: (tab) => set({ rightRailTab: tab }),

  // ——— Simulation ———
  simStatus: { running: false, scenario: null, speed: 1, clock: null },
}));

setOnAuthFailure(() => {
  useStore.getState().logout();
});
