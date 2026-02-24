// src/services/apiAI.js
import axios from "axios";
import { toast } from "react-toastify";

const apiAI = axios.create({
  baseURL: "http://localhost:3000/api",
  withCredentials: true,
});

apiAI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiAI.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message;

    if (status === 403) {
      toast.error(message || "Akses ditolak.");
    }

    if (status === 401) {
      toast.error("Sesi login berakhir. Silakan login ulang.");
    }

    if (status >= 500) {
      toast.error("Terjadi kesalahan di server. Coba beberapa saat lagi.");
    }

    return Promise.reject(error);
  }
);

export default apiAI;
