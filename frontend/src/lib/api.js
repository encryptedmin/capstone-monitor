import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

export const api = axios.create({ baseURL: API_URL });

// --- token storage -----------------------------------------------------
const ACCESS_KEY = "capstone_access";
const REFRESH_KEY = "capstone_refresh";

export const tokenStore = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(access, refresh) {
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
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
        tokenStore.set(data.access);
        config.headers.Authorization = `Bearer ${data.access}`;
        return api(config);
      } catch {
        tokenStore.clear();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// --- endpoint helpers ----------------------------------------------------

export const authApi = {
  login: (username, password) => api.post("/auth/login/", { username, password }),
  me: () => api.get("/auth/me/"),
};

export const usersApi = {
  list: (role) => api.get("/users/", { params: role ? { role } : {} }),
  create: (payload) => api.post("/users/", payload),
  update: (id, payload) => api.patch(`/users/${id}/`, payload),
  remove: (id) => api.delete(`/users/${id}/`),
};

export const groupsApi = {
  list: () => api.get("/groups/"),
  get: (id) => api.get(`/groups/${id}/`),
  create: (payload) => api.post("/groups/", payload),
  update: (id, payload) => api.patch(`/groups/${id}/`, payload),
  remove: (id) => api.delete(`/groups/${id}/`),
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
  giveFeedback: (payload) => api.post("/feedback/", payload),
};

export const notificationsApi = {
  list: (unreadOnly) =>
    api.get("/notifications/", { params: unreadOnly ? { is_read: false } : {} }),
  markRead: (id) => api.post(`/notifications/${id}/mark_read/`),
  markAllRead: () => api.post("/notifications/mark-all-read/"),
};

export const reportsApi = {
  analytics: () => api.get("/reports/analytics/"),
  // Auth is via Bearer header, so the PDF has to be fetched as a blob
  // rather than linked to directly.
  downloadPdf: async () => {
    const res = await api.get("/reports/pdf/", { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "capstone_progress_report.pdf");
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
