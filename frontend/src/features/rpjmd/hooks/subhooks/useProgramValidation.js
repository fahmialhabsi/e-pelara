// src/features/rpjmd/hooks/subhooks/useProgramValidation.js
import { usePeriode } from "@/contexts/PeriodeContext";

const normalize = (val) =>
  typeof val === "string" ? val.trim().replace(/\s+/g, " ") : val;

const error = (msg) => ({ error: true, message: msg });
export default function useProgramValidation(
  programData,
  allPrograms,
  programId,
  isEdit
) {
  const { id: periode_id } = usePeriode();

  const validateForm = () => {
    const {
      kode_program,
      nama_program,
      misi_id,
      tujuan_id,
      sasaran_id,
      prioritas,
      opd_penanggung_jawab,
      bidang_opd,
      rpjmd_id,
    } = programData;

    // Normalisasi awal
    const kodeNorm = normalize(kode_program);
    const namaNorm = normalize(nama_program);
    const opdNorm = normalize(opd_penanggung_jawab);

    // Validasi presence dan panjang
    if (!kodeNorm) return error("Kode Program tidak boleh kosong.");
    if (kodeNorm.length > 50)
      return error("Kode Program maksimal 50 karakter.");

    if (!namaNorm) return error("Nama Program tidak boleh kosong.");
    if (namaNorm.length > 255)
      return error("Nama Program maksimal 255 karakter.");

    if (!misi_id || !tujuan_id || !sasaran_id)
      return error("Misi, Tujuan, dan Sasaran harus dipilih.");

    const validPrioritas = ["Tinggi", "Sedang", "Rendah"];
    if (!prioritas || !validPrioritas.includes(prioritas))
      return error("Prioritas harus dipilih (Tinggi, Sedang, atau Rendah).");

    if (!opdNorm) return error("OPD Penanggung Jawab harus dipilih.");

    if (!Array.isArray(bidang_opd) || bidang_opd.length === 0)
      return error("Minimal satu bidang OPD harus dipilih.");

    if (!rpjmd_id) return error("RPJMD belum ditentukan.");
    if (!periode_id) return error("Periode aktif tidak tersedia.");

    // Duplikasi
    const isKodeUsed = allPrograms.some(
      (p) =>
        normalize(p.kode_program) === kodeNorm &&
        String(p.id) !== String(programId)
    );

    if (isKodeUsed) return error("Kode Program sudah digunakan.");

    const isNamaUsed = allPrograms.some(
      (p) =>
        normalize(p.nama_program) === namaNorm &&
        String(p.id) !== String(programId)
    );

    if (isNamaUsed) return error("Nama Program sudah digunakan.");

    // Final payload
    return {
      error: false,
      payload: {
        ...programData,
        kode_program: kodeNorm,
        nama_program: namaNorm,
        opd_penanggung_jawab: opdNorm,
        bidang_opd_penanggung_jawab: bidang_opd.map((b) => b.value).join(","),
        periode_id,
      },
    };
  };

  return { validateForm };
}
