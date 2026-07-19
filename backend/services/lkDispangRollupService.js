"use strict";

/**
 * Rollup lk_dispang dari dpa (satu baris lk_dispang per baris DPA aktif per tahun).
 * Dipanggil SETELAH recalcDpaRealisasi supaya dpa.realisasi sudah up to date.
 * Idempotent: upsert berdasarkan dpa_id (bukan tambah baris baru tiap dipanggil).
 */

async function recalcLkDispang(models, tahunAnggaran) {
  const { Dpa, LkDispang } = models;
  const tahunStr = String(tahunAnggaran);

  const dpaRows = await Dpa.findAll({
    where: { tahun: tahunStr, is_active_version: true },
  });

  const hasil = [];
  for (const dpa of dpaRows) {
    const anggaran = Number(dpa.anggaran) || 0;
    const realisasi = Number(dpa.realisasi) || 0;
    const sisa = anggaran - realisasi;
    const persen = anggaran > 0 ? Math.round((realisasi / anggaran) * 10000) / 100 : 0;

    const payload = {
      tahun: tahunStr,
      periode_id: dpa.periode_id,
      program: dpa.program,
      kegiatan: dpa.kegiatan,
      sub_kegiatan: dpa.sub_kegiatan,
      akun_belanja: dpa.kode_rekening || null,
      anggaran,
      realisasi,
      sisa,
      persen_realisasi: persen,
      jenis_dokumen: dpa.jenis_dokumen || "DPA",
      dpa_id: dpa.id,
    };

    const existing = await LkDispang.findOne({ where: { dpa_id: dpa.id, tahun: tahunStr } });
    if (existing) {
      await existing.update(payload);
      hasil.push({ id: existing.id, dpa_id: dpa.id, action: "updated" });
    } else {
      const created = await LkDispang.create(payload);
      hasil.push({ id: created.id, dpa_id: dpa.id, action: "created" });
    }
  }

  return hasil;
}

module.exports = { recalcLkDispang };
