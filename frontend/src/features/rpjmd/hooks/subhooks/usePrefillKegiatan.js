// subhooks/usePrefillKegiatan.js
import { useEffect } from "react";

export default function usePrefillKegiatan(
  isEdit,
  existingData,
  setKegiatanData
) {
  // ✅ Validasi fungsi sebelum effect berjalan
  if (typeof setKegiatanData !== "function") {
    console.warn("setKegiatanData is not a function");
    return;
  }

  useEffect(() => {
    if (existingData) {
      setKegiatanData({
        program_id: existingData.program_id || "",
        nama_kegiatan: existingData.nama_kegiatan,
        kode_kegiatan: existingData.kode_kegiatan,
        jenis_dokumen: existingData.jenis_dokumen || "RPJMD",
        tahun: existingData.tahun || "2025",
        opd_penanggung_jawab: existingData.opd_penanggung_jawab || "",
        bidang_opd_penanggung_jawab:
          existingData.bidang_opd_penanggung_jawab || "",
      });
    }
  }, [existingData, isEdit, setKegiatanData]);
}
