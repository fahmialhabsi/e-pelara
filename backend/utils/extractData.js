// utils/extractData.js
const toInt = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};

function extractSubkegiatanData(body) {
  return {
    program_id: toInt(body.program_id),
    kegiatan_id: toInt(body.kegiatan_id),
    subkegiatan_id: toInt(body.subkegiatan_id),
    sub_bidang_penanggung_jawab: body.sub_bidang_penanggung_jawab ?? null,
    nama_subkegiatan: body.nama_subkegiatan ?? null,
    kode_subkegiatan: body.kode_subkegiatan ?? null,
    lokasi: body.lokasi ?? null,
    baseline: body.baseline != null ? Number(body.baseline) : null,
    renstra_opd_id: toInt(body.renstra_opd_id) ?? null,
    target_akhir_renstra: body.target_akhir_renstra ?? null,
    pagu_akhir_renstra: body.pagu_akhir_renstra ?? null,
    target_tahun_1: body.target_tahun_1 ?? null,
    target_tahun_2: body.target_tahun_2 ?? null,
    target_tahun_3: body.target_tahun_3 ?? null,
    target_tahun_4: body.target_tahun_4 ?? null,
    target_tahun_5: body.target_tahun_5 ?? null,
    target_tahun_6: body.target_tahun_6 ?? null,
    pagu_tahun_1: body.pagu_tahun_1 ?? null,
    pagu_tahun_2: body.pagu_tahun_2 ?? null,
    pagu_tahun_3: body.pagu_tahun_3 ?? null,
    pagu_tahun_4: body.pagu_tahun_4 ?? null,
    pagu_tahun_5: body.pagu_tahun_5 ?? null,
    pagu_tahun_6: body.pagu_tahun_6 ?? null,
    indikator_manual: body.indikator_manual ?? null,
    satuan_target: body.satuan_target ?? null,
  };
}

module.exports = { extractSubkegiatanData };
