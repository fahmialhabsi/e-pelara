// src/features/rpjmd/hooks/subhooks/useInitSubKegiatan.js
import api from "@/services/api";

export default async function initSubKegiatan(
  existingData,
  init,
  setFormData,
  handleProgramChange
) {
  if (!existingData) return;

  console.group("📦 initSubKegiatan");
  console.log("🔍 existingData:", existingData);
  console.log("📌 init:", init);

  let filled = { ...init };

  // Cek dan lengkapi data program_id jika belum ada
  if (!filled.program_id && filled.kegiatan_id) {
    try {
      const res = await api.get(`/kegiatan/${filled.kegiatan_id}`);
      const kegiatan = res.data?.data;

      if (kegiatan) {
        filled.program_id = kegiatan.program_id;

        filled.nama_opd =
          kegiatan.program?.opd_penanggung_jawab ||
          kegiatan.opd_penanggung_jawab ||
          filled.nama_opd;

        filled.nama_bidang_opd =
          kegiatan.bidang_opd_penanggung_jawab || filled.nama_bidang_opd;

        console.log("🧩 filled setelah ambil kegiatan:", filled);
      }
    } catch (err) {
      console.error("❌ Gagal ambil data kegiatan:", err);
    }
  }

  // Jalankan perubahan program jika ada program_id
  if (filled.program_id) {
    await handleProgramChange(filled.program_id, filled.kegiatan_id);
  }

  setFormData(filled);
  console.groupEnd();
}
