// utils/sanitizeIndikator.js
export const sanitizeIndikator = (item) => {
  console.log("🔎 sanitizing item:", item);

  const sanitizedItem = {
    kode_indikator: item.kode_indikator,
    nama_indikator: item.nama_indikator,
    tipe_indikator: item.tipe_indikator,
    jenis_indikator: item.jenis_indikator,
    jenis: item.jenis,
    tolok_ukur_kinerja: item.tolok_ukur_kinerja,
    target_kinerja: item.target_kinerja,
    kriteria_kuantitatif: item.kriteria_kuantitatif || "",
    kriteria_kualitatif: item.kriteria_kualitatif || "",
    definisi_operasional: item.definisi_operasional,
    metode_penghitungan: item.metode_penghitungan,
    baseline: item.baseline,
    target_tahun_1: item.target_tahun_1,
    target_tahun_2: item.target_tahun_2,
    target_tahun_3: item.target_tahun_3,
    target_tahun_4: item.target_tahun_4,
    target_tahun_5: item.target_tahun_5,
    capaian_tahun_1: item.capaian_tahun_1 || "",
    capaian_tahun_2: item.capaian_tahun_2 || "",
    capaian_tahun_3: item.capaian_tahun_3 || "",
    capaian_tahun_4: item.capaian_tahun_4 || "",
    capaian_tahun_5: item.capaian_tahun_5 || "",
    sumber_data: item.sumber_data,
    penanggung_jawab: item.penanggung_jawab,
    keterangan: item.keterangan || "",
    satuan: item.satuan,
    misi_id: item.misi_id ? Number(item.misi_id) : null,
    tujuan_id: item.tujuan_id ? Number(item.tujuan_id) : null,
    level_dokumen: item.level_dokumen,
    jenis_iku: item.jenis_iku,
    target_awal: item.target_awal,
    target_akhir: item.target_akhir,
    tahun_awal: item.tahun_awal,
    tahun_akhir: item.tahun_akhir,
    jenis_dokumen: item.jenis_dokumen || "RPJMD",
    tahun: item.tahun || "2025",
    rekomendasi_ai: item.rekomendasi_ai || null,
  };

  console.log("🚀 Final sanitized item:", sanitizedItem);
  return sanitizedItem;
};
