import React, { useEffect } from "react";
import { useDokumen } from "../../contexts/DokumenContext";
import GlobalDokumenTahunPickerModal from "./GlobalDokumenTahunPickerModal";

/**
 * Wrapper agar setiap dashboard tidak bisa diakses
 * sebelum user memilih dokumen & tahun.
 */
export default function RequireDokumenTahun({ children }) {
  const { dokumen, tahun, resetDokumen } = useDokumen();

  if (!dokumen || !tahun) {
    // Pakai modal: user harus pilih dulu dokumen & tahun
    return (
      <div
        style={{
          minHeight: 300,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <GlobalDokumenTahunPickerModal forceShow />
      </div>
    );
  }

  return children;
}
