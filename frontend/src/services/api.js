// src/services/api.js
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { refreshToken } from "./authService";
import { toast } from "react-toastify";
import { API_BASE_URL } from "../config/runtimeConfig";
import { normalizeRole } from "../utils/roleUtils";
import { ACTIVE_TENANT_LS_KEY } from "../constants/tenantStorage";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Attach token on every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      try {
        const decoded = jwtDecode(token);
        if (normalizeRole(decoded.role) === "SUPER_ADMIN") {
          const pick = localStorage.getItem(ACTIVE_TENANT_LS_KEY);
          if (pick != null && String(pick).trim() !== "") {
            config.headers["X-Tenant-Id"] = String(pick).trim();
          }
        }
      } catch {
        /* ignore */
      }
    }
    const method = String(config.method || "get").toLowerCase();
    if (method === "get" && config.params !== false) {
      const cur = config.params;
      const base =
        cur != null && typeof cur === "object" && !Array.isArray(cur) ? cur : {};
      config.params = { ...base, _nf: Date.now() };
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Flag to avoid infinite loop
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
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
          .then((token) => {
            originalRequest.headers["Authorization"] = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await refreshToken(); // should return { accessToken }
        const newToken = res.data?.accessToken;

        if (newToken) {
          localStorage.setItem("token", newToken);
          api.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
          processQueue(null, newToken);
          originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
          return api(originalRequest);
        }

        throw new Error("Token baru tidak tersedia");
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem("token");
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
