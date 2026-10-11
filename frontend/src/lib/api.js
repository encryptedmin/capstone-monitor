import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

export const api = axios.create({ baseURL: API_URL });

// --- token storage -----------------------------------------------------
const ACCESS_KEY = "capstone_access";
const REFRESH_KEY = "capstone_refresh";
const DEVICE_KEY = "capstone_device_id";

const getStorage = () => window.sessionStorage;
const getDeviceStorage = () => window.localStorage;

export const tokenStore = {
  get access() {
    return getStorage().getItem(ACCESS_KEY);
  },
  get refresh() {
    return getStorage().getItem(REFRESH_KEY);
  },
  get deviceId() {
    let deviceId = getDeviceStorage().getItem(DEVICE_KEY);
    if (!deviceId) {
      deviceId =
        window.crypto?.randomUUID?.() ||
        `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      getDeviceStorage().setItem(DEVICE_KEY, deviceId);
    }
    return deviceId;
  },
  set(access, refresh) {
    getStorage().setItem(ACCESS_KEY, access);
    if (refresh) getStorage().setItem(REFRESH_KEY, refresh);
  },
  clear() {
    getStorage().removeItem(ACCESS_KEY);
    getStorage().removeItem(REFRESH_KEY);
  },
};

export const terminateSession = () => {
  const refresh = tokenStore.refresh;
  if (!refresh) return;

  const body = JSON.stringify({ refresh });
  if (navigator.sendBeacon) {
    const payload = new Blob([body], { type: "text/plain" });
    navigator.sendBeacon(`${API_URL}/auth/logout/`, payload);
  } else {
    fetch(`${API_URL}/auth/logout/`, {
      method: "POST",
      body,
      keepalive: true,
      headers: { "Content-Type": "text/plain" },
    }).catch(() => {});
  }
};

api.interceptors.request.use((config) => {
  const token = tokenStore.access;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh the access token once on a 401, then retry the request.
let refreshPromise = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { response, config } = error;
    if (response?.status === 401 && !config._retried && tokenStore.refresh) {
      config._retried = true;
      try {
        refreshPromise =
          refreshPromise ||
          axios.post(`${API_URL}/auth/refresh/`, { refresh: tokenStore.refresh });
        const { data } = await refreshPromise;
        refreshPromise = null;
        tokenStore.set(data.access, data.refresh);
        config.headers.Authorization = `Bearer ${data.access}`;
        return api(config);
      } catch {
        refreshPromise = null;
        tokenStore.clear();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// --- endpoint helpers ----------------------------------------------------

export const authApi = {
  login: (username, password) =>
    api.post("/auth/login/", { username, password, device_id: tokenStore.deviceId }),
  logout: (refresh) => api.post("/auth/logout/", { refresh }),
  register: (payload) => api.post("/auth/register/", payload),
  me: () => api.get("/auth/me/"),
};

export const usersApi = {
  list: (role, params = {}) => api.get("/users/", { params: role ? { role, ...params } : params }),
  create: (payload) => api.post("/users/", payload),
  update: (id, payload) => api.patch(`/users/${id}/`, payload),
  remove: (id) => api.delete(`/users/${id}/`),
  setActive: (id, isActive) => api.post(`/users/${id}/set-active/`, { is_active: isActive }),
  setAdviserCapacity: (id, capacityOverride) =>
    api.post(`/users/${id}/set-adviser-capacity/`, { capacity_override: capacityOverride }),
};

export const schoolYearsApi = {
  list: () => api.get("/school-years/"),
  create: (payload) => api.post("/school-years/", payload),
  update: (id, payload) => api.patch(`/school-years/${id}/`, payload),
  remove: (id) => api.delete(`/school-years/${id}/`),
};

export const settingsApi = {
  get: () => api.get("/settings/"),
  update: (payload) => api.patch("/settings/", payload),
};

export const advisersApi = {
  directory: (params = {}) => api.get("/advisers/directory/", { params }),
};

export const groupsApi = {
  list: (params = {}) => api.get("/groups/", { params }),
  adviserStatus: (params = {}) => api.get("/groups/adviser-status/", { params }),
  get: (id) => api.get(`/groups/${id}/`),
  create: (payload) => api.post("/groups/", payload),
  // Student's "pick an adviser + upload title document" request -- multipart
  // because of the file, used instead of create() from ChooseAdviser.
  requestTitle: (formData) =>
    api.post("/groups/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  update: (id, payload) => api.patch(`/groups/${id}/`, payload),
  remove: (id) => api.delete(`/groups/${id}/`),
  accept: (id) => api.post(`/groups/${id}/accept/`),
  reject: (id, rejectionReason) => api.post(`/groups/${id}/reject/`, { rejection_reason: rejectionReason }),
  addMember: (payload) => api.post("/group-members/", payload),
  removeMember: (id) => api.delete(`/group-members/${id}/`),
};

export const milestonesApi = {
  list: () => api.get("/milestones/"),
  create: (payload) => api.post("/milestones/", payload),
  update: (id, payload) => api.patch(`/milestones/${id}/`, payload),
  remove: (id) => api.delete(`/milestones/${id}/`),
};

export const submissionsApi = {
  list: () => api.get("/submissions/"),
  create: (formData) =>
    api.post("/submissions/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  update: (id, payload) => api.patch(`/submissions/${id}/`, payload),
  resubmit: (id, formData) =>
    api.post(`/submissions/${id}/resubmit/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  giveFeedback: (payload) => api.post("/feedback/", payload),
};

export const notificationsApi = {
  list: (unreadOnly) =>
    api.get("/notifications/", { params: unreadOnly ? { is_read: false } : {} }),
  markRead: (id) => api.post(`/notifications/${id}/mark_read/`),
  markAllRead: () => api.post("/notifications/mark-all-read/"),
};

export const announcementsApi = {
  list: () => api.get("/announcements/"),
  create: (payload) => api.post("/announcements/", payload),
  update: (id, payload) => api.patch(`/announcements/${id}/`, payload),
  remove: (id) => api.delete(`/announcements/${id}/`),
};

export const templatesApi = {
  list: () => api.get("/document-templates/"),
  create: (formData) =>
    api.post("/document-templates/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  remove: (id) => api.delete(`/document-templates/${id}/`),
};

export const reportsApi = {
  analytics: (schoolYear) =>
    api.get("/reports/analytics/", {
      params: schoolYear ? { school_year: schoolYear } : {},
    }),
  pdf: (schoolYear) =>
    api.get("/reports/pdf/", {
      params: schoolYear ? { school_year: schoolYear } : {},
      responseType: "arraybuffer",
    }),
};

export const pdfApi = {
  fetch: (url) => api.get(url, { responseType: "arraybuffer" }),
};
