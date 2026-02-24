// src/services/authService.js
import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

// 🔍 Debug: cek apakah baseURL sudah sesuai dari .env
console.log("✅ Axios baseURL:", API.defaults.baseURL);

// POST: Register user baru
export const register = async (formData) => {
  const res = await API.post("/auth/register", formData);
  return res.data;
};

// POST: Login user
export const login = async (formData) => {
  const res = await API.post("/auth/login", formData);
  console.log("✅ Response login:", res.data);
  return {
    ...res.data,
    role: String(res.data.user?.role),
    username: res.data.user?.username,
  };
};

// GET: Cek super admin
export const checkSuperAdmin = async () => {
  const res = await API.get("/check-superadmin");
  return res.data;
};

// POST: Refresh token
export const refreshToken = async () => {
  const res = await API.post("/auth/refresh-token", {});
  const newToken = res.data?.accessToken;
  if (newToken) {
    localStorage.setItem("token", newToken);
    axios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
  }
  return res;
};

// POST: Logout
export const logoutServer = async () => {
  try {
    await API.post("/auth/logout", {});
  } catch (err) {
    console.warn("Gagal logout server");
  }
};
