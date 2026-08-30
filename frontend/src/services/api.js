// src/services/api.js
import axios from "axios";
import { refreshToken } from "./authService";
import { toast } from "react-toastify";
import { API_BASE_URL } from "../config/runtimeConfig";
import { ACTIVE_TENANT_LS_KEY } from "../constants/tenantStorage";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Sprint 3 — S3-2: baca cookie csrfToken (non-httpOnly, diset backend saat
// login/register/refresh) untuk dikirim ulang di header X-CSRF-Token.
// Diperlukan HANYA sebagai defense-in-depth pada request yang (karena alasan
// apa pun) jadi cookie-authenticated di backend — request Bearer normal
// tidak pernah diperiksa CSRF-nya oleh backend, header ini aman dikirim
// selalu (no-op jika tidak diperlukan).
function readCsrfCookie() {
  const match = document.cookie.match(/(?:^|; )csrfToken=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// Authentication uses the httpOnly session cookie. The active tenant selector is
// only a routing hint; verifyToken authorizes tenant switching server-side.
api.interceptors.request.use(
  (config) => {
    const pick = localStorage.getItem(ACTIVE_TENANT_LS_KEY);
    if (pick != null && String(pick).trim() !== "") {
      config.headers["X-Tenant-Id"] = String(pick).trim();
    }
    const csrfToken = readCsrfCookie();
    if (csrfToken) {
      config.headers["X-CSRF-Token"] = csrfToken;
    }
    const method = String(config.method || "get").toLowerCase();
    if (method === "get" && config.params !== false) {
      const cur = config.params;
      const base =
        cur !== null && cur !== undefined && typeof cur === "object" && !Array.isArray(cur) ? cur : {};
      config.params = { ...base, _nf: Date.now() };
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Flag to avoid infinite loop
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await refreshToken();
        if (res.status >= 200 && res.status < 300 && res.data?.authenticated) {
          processQueue(null);
          delete originalRequest.headers?.Authorization;
          return api(originalRequest);
        }

        throw new Error("Sesi cookie tidak dapat diperbarui");
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        delete api.defaults.headers.common["Authorization"];
        toast.error("Sesi berakhir. Silakan login kembali.");
        window.location.href = "/login";
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    // --- GLOBAL ERROR HANDLING ---
    const status = error.response?.status;
    const message = error.response?.data?.message;

    if (status === 403) {
      toast.error(message || "Akses ditolak.");
    } else if (status === 401) {
      toast.error("Sesi login berakhir. Silakan login ulang.");
    } else if (status >= 500) {
      toast.error("Terjadi kesalahan di server. Coba beberapa saat lagi.");
    }

    return Promise.reject(error);
  }
);

export default api;
