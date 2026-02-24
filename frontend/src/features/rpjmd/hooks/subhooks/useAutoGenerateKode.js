// subhooks/useAutoGenerateKode.js
import { useEffect } from "react";
import api from "@/services/api";

export default function useAutoGenerateKode(
  isEdit,
  kegiatanData,
  setKegiatanData,
  programs
) {
  useEffect(() => {
    if (isEdit || !kegiatanData.program_id) return;
    const sel = programs.find((p) => p.id === Number(kegiatanData.program_id));
    if (!sel) return;
    api
      .get("/kegiatan/count-by-program", { params: { program_id: sel.id } })
      .then((res) => {
        const seq = Number(res.data.count ?? 0) + 1;
        setKegiatanData((prev) => ({
          ...prev,
          kode_kegiatan: `${sel.kode_program}.1.${String(seq).padStart(
            2,
            "0"
          )}`,
        }));
      })
      .catch(() => {
        setKegiatanData((prev) => ({
          ...prev,
          kode_kegiatan: `${sel.kode_program}.1.01`,
        }));
      });
  }, [kegiatanData.program_id, programs, isEdit]);
}
