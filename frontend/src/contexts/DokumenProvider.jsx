import React, { useState, useCallback } from "react";
import { DokumenContext } from "./DokumenContext";

export function DokumenProvider({ children }) {
  // Jika ada ?token= di URL → ini sesi SSO baru → jangan restore dokumen/tahun lama.
  // (AuthProvider akan clear URL setelah menyimpan token, state ini sudah di-set)
  const isFreshSsoSession = !!new URLSearchParams(window.location.search).get(
    "token",
  );

  const initialDokumen = isFreshSsoSession
    ? ""
    : sessionStorage.getItem("dokumenTujuan") ||
      localStorage.getItem("dokumen") ||
      "";
  const initialTahun = isFreshSsoSession
    ? ""
    : sessionStorage.getItem("tahun") || localStorage.getItem("tahun") || "";

  const [dokumen, setDokumen] = useState(initialDokumen);
  const [tahun, setTahun] = useState(initialTahun);

  const setDokumenGlobal = useCallback((dok) => {
    const value = dok?.toLowerCase() || "";
    setDokumen(value);
    if (value) {
      sessionStorage.setItem("dokumenTujuan", value);
      localStorage.setItem("dokumen", value);
    } else {
      sessionStorage.removeItem("dokumenTujuan");
      localStorage.removeItem("dokumen");
    }
  }, []);

  const setTahunGlobal = useCallback((th) => {
    setTahun(th);
    if (th) {
      sessionStorage.setItem("tahun", th);
      localStorage.setItem("tahun", th);
    } else {
      sessionStorage.removeItem("tahun");
      localStorage.removeItem("tahun");
    }
  }, []);

  const resetDokumen = () => {
    setDokumen("");
    setTahun("");
    sessionStorage.removeItem("dokumenTujuan");
    sessionStorage.removeItem("tahun");
    localStorage.removeItem("dokumen");
    localStorage.removeItem("tahun");
  };

  return (
    <DokumenContext.Provider
      value={{
        dokumen,
        tahun,
        setDokumen: setDokumenGlobal,
        setTahun: setTahunGlobal,
        resetDokumen,
      }}
    >
      {children}
    </DokumenContext.Provider>
  );
}
