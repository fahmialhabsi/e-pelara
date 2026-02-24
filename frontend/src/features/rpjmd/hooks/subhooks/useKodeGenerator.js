// src/features/rpjmd/hooks/subhooks/useKodeGenerator.js
import { useEffect } from "react";
import api from "@/services/api";

export default function useKodeGenerator(
  kegiatanData,
  setKegiatanData,
  isEdit,
  programs
) {
  useEffect(() => {
    if (isEdit || !kegiatanData.program_id) return;

    const selectedProgram = programs.find(
      (p) => String(p.id) === String(kegiatanData.program_id)
    );
    if (!selectedProgram) return;

    const fetchKode = async () => {
      try {
        const res = await api.get("/kegiatan/count-by-program", {
          params: { program_id: selectedProgram.id },
        });
        const seq = Number(res.data.count ?? 0) + 1;
        const kode = `${selectedProgram.kode_program}.1.${String(seq).padStart(
          2,
          "0"
        )}`;
        setKegiatanData((prev) => ({ ...prev, kode_kegiatan: kode }));
      } catch (err) {
        console.error("Gagal generate kode:", err);
        const fallback = `${selectedProgram.kode_program}.1.01`;
        setKegiatanData((prev) => ({ ...prev, kode_kegiatan: fallback }));
      }
    };

    fetchKode();
  }, [kegiatanData.program_id, isEdit, programs, setKegiatanData]);
}
