/**
 * RpjmdExcelPreviewContext.jsx
 *
 * Shared state untuk menyimpan hasil parse sheet `indikatortujuans` dari
 * file Excel yang di-upload di tab "Indikator Tujuan" pada form
 * "Data Impor Dokumen RPJMD (PDF)".
 *
 * Data yang tersimpan di sini menjadi **single source of truth** untuk
 * dropdown "Nama Indikator" di step Tujuan pada form
 * "Pengisian Indikator Spesifik RPJMD".
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

const SESSION_KEY = "rpjmd_xlsx_preview_indikatortujuans";
const LOCAL_KEY = "rpjmd_xlsx_preview_indikatortujuans";

/** Baca dari sessionStorage → localStorage → [] */
function loadFromStorage() {
  try {
    const raw =
      sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Tulis ke sessionStorage + localStorage (best-effort) */
function persistToStorage(rows) {
  try {
    const json = JSON.stringify(rows);
    sessionStorage.setItem(SESSION_KEY, json);
    localStorage.setItem(LOCAL_KEY, json);
  } catch {
    /* quota exceeded – abaikan */
  }
}

/** Hapus dari kedua storage */
function removeFromStorage() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LOCAL_KEY);
  } catch {
    /* ignore */
  }
}

const defaultCtx = {
  /** Baris lengkap dari sheet `indikatortujuans` hasil parse backend */
  indikatortujuansRows: [],
  /**
   * Simpan rows baru – otomatis persist ke storage.
   * @param {object[]} rows  Array payload baris sheet `indikatortujuans`
   */
  setIndikatortujuansRows: () => {},
  /** Hapus semua baris dan bersihkan storage */
  clearIndikatortujuansRows: () => {},
};

export const RpjmdExcelPreviewContext = createContext(defaultCtx);

export function RpjmdExcelPreviewProvider({ children }) {
  const [indikatortujuansRows, setRowsState] = useState(() =>
    loadFromStorage()
  );

  const setIndikatortujuansRows = useCallback((rows) => {
    const arr = Array.isArray(rows) ? rows : [];
    setRowsState(arr);
    persistToStorage(arr);
  }, []);

  const clearIndikatortujuansRows = useCallback(() => {
    setRowsState([]);
    removeFromStorage();
  }, []);

  const value = useMemo(
    () => ({
      indikatortujuansRows,
      setIndikatortujuansRows,
      clearIndikatortujuansRows,
    }),
    [indikatortujuansRows, setIndikatortujuansRows, clearIndikatortujuansRows]
  );

  return (
    <RpjmdExcelPreviewContext.Provider value={value}>
      {children}
    </RpjmdExcelPreviewContext.Provider>
  );
}

/** Hook shortcut */
export function useRpjmdExcelPreview() {
  return useContext(RpjmdExcelPreviewContext);
}
