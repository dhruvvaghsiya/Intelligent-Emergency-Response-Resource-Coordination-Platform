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

const USE_MOCKS = import.meta.env?.VITE_USE_MOCKS !== 'false';

function loadStoredUser() {
  try {
    const raw = localStorage.getItem('resilio.user') || localStorage.getItem('prahari.user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function loadStoredReportedIncidents() {
  try {
    const raw = localStorage.getItem('resilio.reported_incidents');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadStoredTimelineEvents() {
  try {
    const raw = localStorage.getItem('resilio.reported_timeline_events');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function pushFeed(state, { type, text, severity = 'INFO' }) {
  const entry = { id: `feed_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, type, text, severity, ts: new Date().toISOString() };
  return [entry, ...state.liveFeed].slice(0, 100);
}

// Rolling log of {source_type, ts} — capped, windowed by the reading component (e.g. "last 60s"
// per source) rather than pruned here, so there's a single place that decides the window size.
function bumpSourceActivity(log, sourceType) {
  if (!sourceType) return log;
  return [{ source_type: sourceType, ts: Date.now() }, ...log].slice(0, 300);
}

function upsertById(list, item) {
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx === -1) return [item, ...list];
  const next = list.slice();
  next[idx] = { ...next[idx], ...item };
  return next;
}

export const DEMO_USERS = [
  { id: 'usr_commander', email: 'commander@prahari.in', name: 'Cdr. Arjun Shah',   role: 'COMMANDER',  password: 'prahari123' },
  { id: 'usr_dispatcher', email: 'dispatch@prahari.in',  name: 'Disp. Priya Mehta', role: 'DISPATCHER', password: 'prahari123' },
  { id: 'usr_analyst',    email: 'analyst@prahari.in',   name: 'Anl. Ravi Kumar',   role: 'ANALYST',    password: 'prahari123' },
  { id: 'usr_unit07',     email: 'unit07@prahari.in',    name: 'FO Ketan Patel',    role: 'FIELD_UNIT', password: 'prahari123' },
  { id: 'usr_admin',      email: 'admin@prahari.in',     name: 'System Admin',       role: 'ADMIN',      password: 'prahari123' },
];

export const useStore = create((set, get) => ({
  // ——— Auth ———
  user: loadStoredUser(),
  token: getStoredToken(),
  isAuthenticated: Boolean(getStoredToken()),
  authLoading: false,
  authError: null,

  login: async (email, password) => {
    set({ authLoading: true, authError: null });
    const cleanEmail = (email || '').trim().toLowerCase();
    try {
      const data = await authApi.login(cleanEmail, password);
      storeTokens(data);
      localStorage.setItem('resilio.user', JSON.stringify(data.user));
      localStorage.setItem('prahari.user', JSON.stringify(data.user));
      set({ user: data.user, token: data.access_token, isAuthenticated: true, authLoading: false });
      get().connectRealtime();
      get().fetchAll();
      return { ok: true };
    } catch (err) {
      // Offline / network failure fallback — seeded demo accounts only. Permissions are left
      // empty (fail-closed): without the backend reachable there's no authority to grant them,
      // so every gated action stays hidden until a real session is established.
      const matched = DEMO_USERS.find(u => u.email.toLowerCase() === cleanEmail);

      if (matched && (matched.password === password || password === 'prahari123')) {
        const fallbackUser = {
          id: matched.id || `user_${matched.role.toLowerCase()}`,
          email: matched.email,
          name: matched.name,
          role: matched.role,
          station_id: matched.station_id || null,
          permissions: [],
        };
        const fallbackToken = 'mock_jwt_' + btoa(JSON.stringify(fallbackUser));
        storeTokens({ access_token: fallbackToken, refresh_token: fallbackToken });
        localStorage.setItem('resilio.user', JSON.stringify(fallbackUser));
        localStorage.setItem('prahari.user', JSON.stringify(fallbackUser));
        set({ user: fallbackUser, token: fallbackToken, isAuthenticated: true, authLoading: false });
        get().fetchAll();
        return { ok: true };
      }

      const message = err?.response?.data?.error?.message || 'Invalid credentials. Please verify your email and password.';
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
      localStorage.removeItem('resilio.user');
      localStorage.removeItem('prahari.user');
      set({ user: null, token: null, isAuthenticated: false });
    }
  },

  logout: () => {
    clearTokens();
    localStorage.removeItem('resilio.user');
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

    socket.on('incident.created', (evt) => {
      upsertIncidentEvent('New incident')(evt);
      if (evt.payload) {
        const storeEvt = {
          event_id: `evt_sock_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          seq: evt.seq || Date.now(),
          incident_id: evt.payload.id || evt.payload.incident_id,
          room: 'incidents',
          type: 'INCIDENT_REPORTED',
          category: 'incident',
          ts: evt.ts || new Date().toISOString(),
          entity: { kind: 'incident', id: evt.payload.id },
          actor: evt.actor || { kind: 'SYSTEM', name: 'Emergency Ingest' },
          summary: `Citizen Emergency Ingest: ${evt.payload.title || evt.payload.code || 'Incident Ingested'}`,
          payload: evt.payload,
        };
        set(s => {
          const updated = [...(s.timelineEvents || []), storeEvt];
          try { localStorage.setItem('resilio.reported_timeline_events', JSON.stringify(updated)); } catch {}
          return { timelineEvents: updated };
        });
      }
    });
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

    // Live World Engine feed — fires the instant a multi-source report lands, ahead of the
    // pipeline finishing. `notable` reports (director-spawned incident clusters, hospital strain)
    // surface in the Event Stream; routine ambient sensor/CCTV hum only updates the source tally
    // so the feed doesn't get flooded with "sensor nominal" lines.
    socket.on('report.ingested', (evt) => set((state) => {
      const storeEvt = {
        event_id: `evt_rep_sock_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        seq: evt.seq || Date.now(),
        incident_id: evt.payload?.incident_id || 'inc_live',
        room: 'incidents',
        type: 'INCIDENT_REPORTED',
        category: 'incident',
        ts: evt.ts || new Date().toISOString(),
        entity: { kind: 'report', id: evt.payload?.id },
        actor: { kind: 'CITIZEN_APP', name: evt.payload?.source_label || 'Citizen Report' },
        summary: `Citizen Report Ingested: ${evt.payload?.headline || evt.payload?.text || 'Emergency call'}`,
        payload: evt.payload,
      };
      const updatedEvents = [...(state.timelineEvents || []), storeEvt];
      try { localStorage.setItem('resilio.reported_timeline_events', JSON.stringify(updatedEvents)); } catch {}
      return {
        lastEventAt: evt.ts,
        timelineEvents: updatedEvents,
        sourceActivityLog: bumpSourceActivity(state.sourceActivityLog, evt.payload?.source_type),
        ...(evt.payload?.notable ? {
          liveFeed: pushFeed(state, { type: evt.type, text: `${evt.payload.source_label}: ${evt.payload.headline || 'new report'}`, severity: 'INFO' }),
        } : {}),
      };
    }));
    socket.on('hospital.updated', (evt) => set((state) => ({
      hospitals: upsertById(state.hospitals, evt.payload),
      lastEventAt: evt.ts,
    })));
  },

  // ——— Incidents (live overlay) ———
  incidents: loadStoredReportedIncidents(),
  reportedIncidents: loadStoredReportedIncidents(),
  timelineEvents: loadStoredTimelineEvents(),
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
      const reported = get().reportedIncidents || [];
      const existingIds = new Set((data || []).map(d => d.id));
      const unsubmitted = reported.filter(r => !existingIds.has(r.id));
      set({ incidents: [...unsubmitted, ...(data || [])] });
    } catch (err) {
      if (USE_MOCKS) {
        console.warn('fetchIncidents failed, using mock data', err);
        const reported = get().reportedIncidents || [];
        set({ incidents: [...reported, ...MOCK_INCIDENTS] });
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
  patchHospitalCapacity: async (id, body) => {
    const updated = await hospitalsApi.patchCapacity(id, body);
    set(state => ({ hospitals: upsertById(state.hospitals, updated) }));
    return updated;
  },

  addReport: (reportPayload) => {
    const state = get();
    const newId = `RPT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const newIncCode = `INC-2026-${Math.floor(100 + Math.random() * 900)}`;
    const newIncId = `inc_${Date.now().toString(36)}`;
    const nowIso = new Date().toISOString();

    const newIncident = {
      id: newIncId,
      code: newIncCode,
      type: reportPayload.structured?.type || 'UNKNOWN',
      status: 'TRIAGED',
      priority: 'HIGH',
      severity_score: 75,
      title: `${(reportPayload.structured?.type || 'EMERGENCY').replace(/_/g, ' ')} — ${reportPayload.text ? reportPayload.text.slice(0, 40) : 'Citizen Report'}`,
      description: reportPayload.text,
      location: reportPayload.location || { lat: 23.0258, lng: 72.5714 },
      reported_at: nowIso,
      occurred_at: nowIso,
      units_required: 2,
      assigned_unit_count: 0,
      report_count: 1,
      required_capabilities: reportPayload.structured?.type === 'FIRE_INDUSTRIAL' ? ['FIRE_SUPPRESSION', 'HAZMAT_CONTAINMENT']
        : reportPayload.structured?.type === 'FLOOD' ? ['WATER_RESCUE', 'CROWD_CONTROL']
        : ['MEDICAL_BASIC', 'FIRE_SUPPRESSION'],
      assignments: [],
      reports: [{
        id: newId,
        source_type: reportPayload.source_type || 'CITIZEN_APP',
        source_label: reportPayload.source_label || 'Citizen Report',
        text: reportPayload.text,
        location: reportPayload.location || { lat: 23.0258, lng: 72.5714 },
        occurred_at: nowIso,
        received_at: nowIso,
        processing_status: 'PROCESSED',
      }],
      is_simulated: false,
    };

    const newTimelineEvent = {
      event_id: `evt_rep_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      seq: (state.timelineEvents?.length || 0) + 1,
      incident_id: newIncId,
      room: 'incidents',
      type: 'INCIDENT_REPORTED',
      category: 'incident',
      ts: nowIso,
      entity: { kind: 'incident', id: newIncId },
      actor: { kind: 'CITIZEN_APP', id: 'usr_citizen', name: reportPayload.source_label || 'Citizen Reporter' },
      summary: `Citizen Emergency Report: ${reportPayload.text || newIncident.title}`,
      payload: {
        incident_id: newIncId,
        code: newIncCode,
        type: newIncident.type,
        description: reportPayload.text,
        location: reportPayload.location,
        status: 'INGESTED',
        report_id: newId,
      },
    };

    const triageTimelineEvent = {
      event_id: `evt_triage_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      seq: (state.timelineEvents?.length || 0) + 2,
      incident_id: newIncId,
      room: 'incidents',
      type: 'AI_TRIAGE_COMPLETE',
      category: 'ai',
      ts: new Date(Date.now() + 2000).toISOString(),
      entity: { kind: 'incident', id: newIncId },
      actor: { kind: 'AI_AGENT', name: 'Llama-3.3-70B Ingest Core' },
      summary: `Automated Belief Fusion: Severity ${newIncident.priority} (${newIncident.severity_score}/100)`,
      payload: {
        incident_id: newIncId,
        severity: newIncident.priority,
        severity_score: newIncident.severity_score,
        required_capabilities: newIncident.required_capabilities,
      },
    };

    const updatedIncidents = [newIncident, ...state.incidents.filter(i => i.id !== newIncId)];
    const updatedReported = [newIncident, ...(state.reportedIncidents || []).filter(i => i.id !== newIncId)];
    const updatedTimelineEvents = [...(state.timelineEvents || []), newTimelineEvent, triageTimelineEvent];

    try {
      localStorage.setItem('resilio.reported_incidents', JSON.stringify(updatedReported));
      localStorage.setItem('resilio.reported_timeline_events', JSON.stringify(updatedTimelineEvents));
    } catch {}

    set({
      incidents: updatedIncidents,
      reportedIncidents: updatedReported,
      timelineEvents: updatedTimelineEvents,
      liveFeed: pushFeed(state, { type: 'report.created', text: `New Citizen Report: ${newIncCode}`, severity: 'HIGH' }),
    });

    return { report_id: newId, incident_id: newIncId, code: newIncCode, incident: newIncident };
  },

  syncReportedFromStorage: () => {
    const reported = loadStoredReportedIncidents();
    const timeline = loadStoredTimelineEvents();
    set(state => {
      const existingIds = new Set(state.incidents.map(i => i.id));
      const newItems = reported.filter(r => !existingIds.has(r.id));
      return {
        reportedIncidents: reported,
        timelineEvents: timeline,
        incidents: [...newItems, ...state.incidents],
      };
    });
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
  sourceActivityLog: [], // rolling {source_type, ts} log fed by the report.ingested socket event

  // ——— Right rail state ———
  rightRailTab: 'overview', // 'overview' | 'evidence' | 'response' | 'related' | 'timeline'
  setRightRailTab: (tab) => set({ rightRailTab: tab }),

  // ——— Sidebar state ———
  sidebarOpen: false, // Hidden by default; opens via hamburger menu toggle
  toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // ——— Simulation ———
  simStatus: { running: false, scenario: null, speed: 1, clock: null },
}));

setOnAuthFailure(() => {
  useStore.getState().logout();
});
