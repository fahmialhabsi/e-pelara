// subhooks/useKegiatanByProgram.js
import { useState, useCallback } from "react";
import api from "@/services/api";

export default function useKegiatanByProgram(
  programList,
  formData,
  setFormData
) {
  const [kegiatanList, setKegiatanList] = useState([]);

  const handleProgramChange = useCallback(
    async (e, prefilledKegiatanId = "") => {
      const program_id =
        typeof e === "string" || typeof e === "number"
          ? e
          : e?.target?.value || "";

      if (!program_id) {
        setKegiatanList([]);
        return;
      }

      const selectedProgram = Array.isArray(programList)
        ? programList.find((p) => String(p.id) === String(program_id))
        : null;

      setFormData((d) => ({
        ...d,
        program_id,
        kegiatan_id: prefilledKegiatanId || "",
        nama_opd: selectedProgram?.opd_penanggung_jawab || d.nama_opd || "",
      }));

      try {
        const res = await api.get(`/kegiatan/by-program/${program_id}`);
        setKegiatanList(res?.data?.data || []);
      } catch (err) {
        setKegiatanList([]);
        console.error("Gagal mengambil kegiatan:", err);
      }
    },
    [programList, setFormData]
  );

  return { kegiatanList, setKegiatanList, handleProgramChange };
}
