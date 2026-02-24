// src/services/api.js
import axios from "axios";
import { refreshToken } from "./authService";
import { toast } from "react-toastify";

const api = axios.create({
  baseURL: "http://localhost:3000/api",
  withCredentials: true,
});

// Attach token on every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
