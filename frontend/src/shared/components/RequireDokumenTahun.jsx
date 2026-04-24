import React from "react";
import { Spinner } from "react-bootstrap";
import { useDokumen } from "../../hooks/useDokumen";
import GlobalDokumenTahunPickerModal from "./GlobalDokumenTahunPickerModal";
import { usePeriodeAktif } from "../../features/rpjmd/hooks/usePeriodeAktif";
import { isDokumenLevelPeriode } from "../../utils/planningDokumenUtils";

/**
 * Wrapper agar setiap dashboard tidak bisa diakses
 * sebelum user memilih dokumen & tahun (tahun tidak wajib dipilih manual untuk RPJMD/Renstra).
 */
export default function RequireDokumenTahun({ children }) {
  const { dokumen, tahun } = useDokumen();
  const { loading: periodeLoading } = usePeriodeAktif();

  if (!dokumen) {
    return (
      <div
        style={{
          minHeight: 300,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <GlobalDokumenTahunPickerModal forceOpen />
      </div>
    );
  }

  if (isDokumenLevelPeriode(dokumen)) {
    if (!tahun) {
      return periodeLoading ? (
        <div className="text-center py-5">
          <Spinner animation="border" size="sm" />
        </div>
      ) : (
        <div
          style={{
            minHeight: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <GlobalDokumenTahunPickerModal forceOpen />
        </div>
      );
    }
    return children;
  }

  if (!tahun) {
    return (
      <div
        style={{
          minHeight: 300,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <GlobalDokumenTahunPickerModal forceOpen />
      </div>
    );
  }

  return children;
}
