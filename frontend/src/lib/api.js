/* =========================================================================
   API CLIENT — axios instance + typed helpers per resource
   Auth: Authorization: Bearer <access_token>, refreshed on 401 via /auth/refresh
   ========================================================================= */
import axios from 'axios';

const TOKEN_KEY = 'prahari.token';
const REFRESH_KEY = 'prahari.refresh_token';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

export function storeTokens({ access_token, refresh_token }) {
  if (access_token) localStorage.setItem(TOKEN_KEY, access_token);
  if (refresh_token) localStorage.setItem(REFRESH_KEY, refresh_token);
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export const api = axios.create({
  baseURL: import.meta.env?.VITE_API_URL || '/api/v1',
});

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let onAuthFailure = () => {};
export function setOnAuthFailure(fn) {
  onAuthFailure = fn;
}

let refreshPromise = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error;
    if (response?.status === 401 && !config._retried) {
      config._retried = true;
      const refreshToken = getStoredRefreshToken();
      if (refreshToken) {
        try {
          if (!refreshPromise) {
            refreshPromise = axios
              .post(`${api.defaults.baseURL}/auth/refresh`, { refresh_token: refreshToken })
              .finally(() => { refreshPromise = null; });
          }
          const { data } = await refreshPromise;
          storeTokens(data.data);
          config.headers.Authorization = `Bearer ${data.data.access_token}`;
          return api(config);
        } catch {
          clearTokens();
          onAuthFailure();
          return Promise.reject(error);
        }
      }
      clearTokens();
      onAuthFailure();
    }
    return Promise.reject(error);
  }
);

const unwrap = (res) => res.data.data;

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }).then(unwrap),
  refresh: (refresh_token) => api.post('/auth/refresh', { refresh_token }).then(unwrap),
  me: () => api.get('/auth/me').then(unwrap),
};

export const incidentsApi = {
  list: (params) => api.get('/incidents', { params }).then(unwrap),
  geojson: (params) => api.get('/incidents/geojson', { params }).then(unwrap),
  get: (id) => api.get(`/incidents/${id}`).then(unwrap),
  create: (body) => api.post('/incidents', body).then(unwrap),
  patch: (id, body) => api.patch(`/incidents/${id}`, body).then(unwrap),
  timeline: (id) => api.get(`/incidents/${id}/timeline`).then(unwrap),
  candidates: (id) => api.get(`/incidents/${id}/candidates`).then(unwrap),
  merge: (id, source_incident_ids, reason) => api.post(`/incidents/${id}/merge`, { source_incident_ids, reason }).then(unwrap),
  unmerge: (id, child_incident_ids) => api.post(`/incidents/${id}/unmerge`, { child_incident_ids }).then(unwrap),
  addLink: (id, to_incident_id, relation, note) => api.post(`/incidents/${id}/links`, { to_incident_id, relation, note }).then(unwrap),
  removeLink: (id, linkId) => api.delete(`/incidents/${id}/links/${linkId}`),
};

export const evidenceApi = {
  get: (incidentId) => api.get(`/incidents/${incidentId}/evidence`).then(unwrap),
  supersede: (incidentId, evidenceId, reason) =>
    api.post(`/incidents/${incidentId}/evidence/${evidenceId}/supersede`, { reason }).then(unwrap),
};

export const severityApi = {
  get: (incidentId) => api.get(`/incidents/${incidentId}/severity`).then(unwrap),
  override: (incidentId, severity, reason) =>
    api.post(`/incidents/${incidentId}/severity/override`, { severity, reason }).then(unwrap),
};

export const unitsApi = {
  list: (params) => api.get('/units', { params }).then(unwrap),
  patch: (id, body) => api.patch(`/units/${id}`, body).then(unwrap),
  postLocation: (id, body) => api.post(`/units/${id}/location`, body).then(unwrap),
};

export const hospitalsApi = {
  list: () => api.get('/hospitals').then(unwrap),
  patchCapacity: (id, body) => api.patch(`/hospitals/${id}/capacity`, body).then(unwrap),
};

export const dispatchApi = {
  plans: (incidentId) => api.get(`/incidents/${incidentId}/dispatch/plans`).then(unwrap),
  compare: (incidentId) => api.get(`/incidents/${incidentId}/dispatch/compare`).then(unwrap),
  approvePlan: (planId) => api.post(`/dispatch/plans/${planId}/approve`, {}, {
    headers: { 'Idempotency-Key': planId },
  }).then(unwrap),
  createAssignment: (incident_id, unit_id) => api.post('/assignments', { incident_id, unit_id }).then(unwrap),
  patchAssignment: (id, status, version) => api.patch(`/assignments/${id}`, { status, version }).then(unwrap),
  cancelAssignment: (id, reason) => api.post(`/assignments/${id}/cancel`, { reason }).then(unwrap),
  hospitalRanking: (incidentId) => api.get(`/incidents/${incidentId}/hospitals/ranking`).then(unwrap),
};

export const coverageApi = {
  get: (params) => api.get('/coverage', { params }).then(unwrap),
  repositioning: () => api.get('/coverage/repositioning').then(unwrap),
};

export const alertsApi = {
  list: (params) => api.get('/alerts', { params }).then(unwrap),
  ack: (id) => api.post(`/alerts/${id}/ack`).then(unwrap),
};

export const analyticsApi = {
  overview: () => api.get('/analytics/overview').then(unwrap),
  responseTimes: () => api.get('/analytics/response-times').then(unwrap),
  utilization: () => api.get('/analytics/utilization').then(unwrap),
  shortages: () => api.get('/analytics/shortages').then(unwrap),
  recommendations: () => api.get('/analytics/recommendations').then(unwrap),
};

export const syncApi = {
  get: (room, sinceSeq) => api.get('/sync', { params: { room, since_seq: sinceSeq } }).then(unwrap),
};

export const replayApi = {
  list: (params) => api.get('/replay', { params }).then((res) => res.data),
};

export const reportsApi = {
  submit: (body) => api.post('/reports', body).then(unwrap),
  list: (params) => api.get('/reports', { params }).then(unwrap),
  get: (id) => api.get(`/reports/${id}`).then(unwrap),
};

export const fieldApi = {
  sync: (body) => api.post('/field/sync', body).then(unwrap),
};

export const adminApi = {
  startScenario: (name, speed) => api.post(`/sim/scenarios/${name}/start`, { speed }).then(unwrap),
  stopSim: () => api.post('/sim/stop').then(unwrap),
  simStatus: () => api.get('/sim/status').then(unwrap),
  aiHealth: () => api.get('/ai/health').then(unwrap),
  aiEval: () => api.get('/ai/eval').then(unwrap),
};

export const healthApi = {
  get: () => axios.get('/health').then((res) => res.data.data),
};
