import React, { useState, useEffect } from "react";
import { DokumenContext } from "./DokumenContext";

export function DokumenProvider({ children }) {
  const initialDokumen =
    sessionStorage.getItem("dokumenTujuan") ||
    localStorage.getItem("dokumen") ||
    "";
  const initialTahun =
    sessionStorage.getItem("tahun") || localStorage.getItem("tahun") || "";

  const [dokumen, setDokumen] = useState(initialDokumen);
  const [tahun, setTahun] = useState(initialTahun);

  const setDokumenGlobal = (dok) => {
    const value = dok?.toLowerCase() || "";
    setDokumen(value);
    if (value) {
      sessionStorage.setItem("dokumenTujuan", value);
      localStorage.setItem("dokumen", value);
    } else {
      sessionStorage.removeItem("dokumenTujuan");
      localStorage.removeItem("dokumen");
    }
  };

  const setTahunGlobal = (th) => {
    setTahun(th);
    if (th) {
      sessionStorage.setItem("tahun", th);
      localStorage.setItem("tahun", th);
    } else {
      sessionStorage.removeItem("tahun");
      localStorage.removeItem("tahun");
    }
  };

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
