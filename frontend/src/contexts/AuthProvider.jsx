// src/contexts/AuthProvider.jsx
import React, { useCallback, useEffect, useState } from "react";
import api from "../services/api";
import AuthContext from "./authContext";
import { getCurrentUser, logoutServer, refreshToken } from "../services/authService";
import { normalizeRole } from "../utils/roleUtils";
import { ACTIVE_TENANT_LS_KEY } from "../constants/tenantStorage";
import { useDokumen } from "../hooks/useDokumen";

// httpOnly cookie tidak dapat diperiksa secara sinkron oleh JavaScript.
// Consumer harus menggunakan `loading` dan `userReady` dari AuthContext.
export const checkAuthStatus = () => false;

const SIGAP_TO_EPELARA_ROLE = {
  super_admin: "superadmin",
  kepala_dinas: "admin",
  gubernur: "admin",
  sekretaris: "admin",
  kepala_bidang: "admin",
  kepala_uptd: "admin",
  kasubbag: "editor",
  kasubbag_umum: "editor",
  kasubbag_kepegawaian: "editor",
  kasubbag_perencanaan: "editor",
  kasi_uptd: "editor",
  kasubbag_tu_uptd: "editor",
  kasi_mutu_uptd: "editor",
  kasi_teknis_uptd: "editor",
  fungsional: "editor",
  fungsional_perencana: "editor",
  fungsional_analis: "editor",
  pelaksana: "viewer",
  guest: "viewer",
};

const AuthProvider = ({
  children,
  onLoginResetDokumen,
  onLogoutResetDokumen,
}) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userReady, setUserReady] = useState(false);
  const { setDokumen, setTahun } = useDokumen();

  const buildUser = useCallback((rawUser) => {
    const rawRole = rawUser?.role || rawUser?.roleName || "";
    const normalizedRole =
      SIGAP_TO_EPELARA_ROLE[String(rawRole).toLowerCase()] || normalizeRole(rawRole);
    const jenis_dokumen =
      rawUser?.jenis_dokumen || sessionStorage.getItem("dokumenTujuan");
    const tahun = rawUser?.tahun || sessionStorage.getItem("tahun");
    const periode_id =
      rawUser?.periode_id || sessionStorage.getItem("periode_id");
    return {
      ...rawUser,
      role: normalizedRole,
      role_original: rawRole,
      jenis_dokumen,
      tahun,
      periode_id,
    };
  }, []);

  const login = (userData) => {
    return new Promise((resolve) => {
      if (onLoginResetDokumen) onLoginResetDokumen();

      const rawUser = userData?.user;
      if (!rawUser) throw new Error("Respons login tidak memuat identitas user.");
      const userFinal = buildUser(rawUser);
      const { jenis_dokumen, tahun, periode_id } = userFinal;

      if (jenis_dokumen) sessionStorage.setItem("dokumenTujuan", jenis_dokumen);
      if (tahun) sessionStorage.setItem("tahun", tahun);
      if (periode_id) sessionStorage.setItem("periode_id", periode_id);

      setUser(userFinal);
      setUserReady(true);
      setDokumen(jenis_dokumen);
      setTahun(tahun);

      resolve();
    });
  };

  const logout = useCallback(() => {
    void logoutServer();
    localStorage.removeItem(ACTIVE_TENANT_LS_KEY);
    sessionStorage.removeItem("dokumenTujuan");
    sessionStorage.removeItem("tahun");
    sessionStorage.removeItem("periode_id");

    delete api.defaults.headers.common["Authorization"];

    setUser(null);
    setUserReady(false);

    if (onLogoutResetDokumen) onLogoutResetDokumen();
  }, [onLogoutResetDokumen]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const sessionRes = await getCurrentUser();
        const userFinal = buildUser(sessionRes?.data?.user);
        const { jenis_dokumen, tahun, periode_id } = userFinal;

        if (jenis_dokumen) sessionStorage.setItem("dokumenTujuan", jenis_dokumen);
        if (tahun) sessionStorage.setItem("tahun", tahun);
        if (periode_id) sessionStorage.setItem("periode_id", periode_id);

        setUser(userFinal);
        setUserReady(true);
        setDokumen(jenis_dokumen);
        setTahun(tahun);
      } catch (error) {
        setUser(null);
        setUserReady(false);
        if (error.response?.status && ![401, 403].includes(error.response.status)) {
          console.error("Gagal memuat sesi cookie:", error.message);
        }
      } finally {
        setLoading(false);
      }
    };

    void initAuth();
  }, [buildUser, setDokumen, setTahun]);

  useEffect(() => {
    let interval;

    const startAutoRefresh = () => {
      interval = setInterval(
        async () => {
          try {
            const refreshRes = await refreshToken();
            if (refreshRes?.data?.user) {
              setUser((prev) =>
                prev ? { ...prev, ...refreshRes.data.user } : prev,
              );
            }
            
          } catch (err) {
            console.warn("[Auto Refresh] Gagal refresh, logout...");
            logout();
          }
        },
        55 * 60 * 1000,
      ); // 55 menit
    };

    if (user) {
      startAutoRefresh();
    }

    return () => clearInterval(interval);
  }, [user, logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        loading,
        userReady,
        setUser,
        checkAuthStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
