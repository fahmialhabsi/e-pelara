import axios from "axios";
import { API_BASE_URL } from "../config/runtimeConfig";

const API = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export const register = async (formData) => {
  const res = await API.post("/auth/register", formData);
  return res.data;
};

export const login = async (formData) => {
  const res = await API.post("/auth/login", formData);
  return {
    ...res.data,
    role: String(res.data.user?.role),
    username: res.data.user?.username,
  };
};

export const requestPasswordReset = async (email) => {
  const res = await API.post("/auth/forgot-password", { email });
  return res.data;
};

export const resetPasswordWithToken = async ({ email, token, password }) => {
  const res = await API.post("/auth/reset-password", {
    email,
    token,
    password,
  });
  return res.data;
};

export const checkSuperAdmin = async () => {
  const res = await API.get("/check-superadmin");
  return res.data;
};

export const refreshToken = async () => {
  const res = await API.post("/auth/refresh-token", {});
  const newToken = res.data?.accessToken;
  if (newToken) {
    localStorage.setItem("token", newToken);
    axios.defaults.headers.common.Authorization = `Bearer ${newToken}`;
  }
  return res;
};

export const logoutServer = async () => {
  try {
    await API.post("/auth/logout", {});
  } catch (err) {
    console.warn("Gagal logout server");
  }
};
