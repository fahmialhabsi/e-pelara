// src/contexts/AuthProvider.jsx
import React, { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import api from "../services/api";
import AuthContext from "./authContext";
import { refreshToken } from "../services/authService";
import { normalizeRole } from "../utils/roleUtils";
import { useDokumen } from "../hooks/useDokumen";

// Cek status token (valid atau tidak)
export const checkAuthStatus = () => {
  const token = localStorage.getItem("token");
  if (!token) return false;

  try {
    const decoded = jwtDecode(token);
    const now = Date.now() / 1000;
    return decoded.exp > now;
  } catch {
    return false;
  }
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

  // --- Proses token SSO dari URL secara SINKRON (sebelum render pertama) ---
  // Menggunakan sessionStorage sebagai flag SSO agar bertahan saat React StrictMode
  // melakukan double-mount (isSSOSession ref akan reset, sessionStorage tidak)
  const [,] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get("token");
    if (urlToken) {
      sessionStorage.setItem("_epelara_sso", "1");
      localStorage.setItem("token", urlToken);
      api.defaults.headers.common["Authorization"] = `Bearer ${urlToken}`;
      window.history.replaceState({}, "", window.location.pathname);
    }
    return null;
  });

  const login = (userData) => {
    return new Promise((resolve) => {
      if (onLoginResetDokumen) onLoginResetDokumen();

      const rawUser = userData.user;
      const normalizedRole = normalizeRole(rawUser.role);

      const jenis_dokumen =
        rawUser.jenis_dokumen || sessionStorage.getItem("dokumenTujuan");
      const tahun = rawUser.tahun || sessionStorage.getItem("tahun");
      const periode_id =
        rawUser.periode_id || sessionStorage.getItem("periode_id");

      const userFinal = {
        ...rawUser,
        token: userData.token,
        role: normalizedRole,
        jenis_dokumen,
        tahun,
        periode_id,
      };

      localStorage.setItem("token", userData.token);
      api.defaults.headers.common["Authorization"] = `Bearer ${userData.token}`;

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

  const logout = () => {
    localStorage.removeItem("token");
    sessionStorage.removeItem("dokumenTujuan");
    sessionStorage.removeItem("tahun");
    sessionStorage.removeItem("periode_id");
    sessionStorage.removeItem("_epelara_sso"); // bersihkan flag SSO saat logout

    delete api.defaults.headers.common["Authorization"];

    setUser(null);
    setUserReady(false);

    if (onLogoutResetDokumen) onLogoutResetDokumen();
  };

  // Mapping role SIGAP → role e-Pelara (P23/P24 SSO)
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

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("token");

      if (token) {
        try {
          const decoded = jwtDecode(token);
          const now = Date.now() / 1000;

          if (decoded.exp && decoded.exp > now) {
            // P24: Terjemahkan role SIGAP ke role e-Pelara jika perlu
            const rawRole = decoded.role || decoded.roleName || "";
            const normalizedRole =
              SIGAP_TO_EPELARA_ROLE[rawRole] || normalizeRole(rawRole);

            const jenis_dokumen =
              decoded.jenis_dokumen || sessionStorage.getItem("dokumenTujuan");
            const tahun = decoded.tahun || sessionStorage.getItem("tahun");
            const periode_id =
              decoded.periode_id || sessionStorage.getItem("periode_id");

            api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
            setUser({
              ...decoded,
              token,
              role: normalizedRole,
              role_original: rawRole,
              jenis_dokumen,
              tahun,
              periode_id,
            });
            setUserReady(true);

            // Skip refreshToken untuk sesi SSO — token SIGAP tidak bisa di-refresh di e-Pelara
            // Gunakan sessionStorage sebagai flag agar tahan React StrictMode double-mount
            const isSSO = !!sessionStorage.getItem("_epelara_sso");
            if (!isSSO) {
              try {
                await refreshToken();
              } catch {
                console.warn("Refresh token gagal, logout otomatis...");
                logout();
              }
            }
          } else {
            console.warn("Token expired, logout otomatis...");
            logout();
          }
        } catch (e) {
          console.error("Gagal decode token, logout...", e);
          logout();
        }
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  useEffect(() => {
    let interval;

    const startAutoRefresh = () => {
      interval = setInterval(
        async () => {
          // Skip auto-refresh untuk sesi SSO
          if (sessionStorage.getItem("_epelara_sso")) return;
          try {
            await refreshToken();
            console.log("[Auto Refresh] Token berhasil diperbarui");
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
  }, [user]);

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
