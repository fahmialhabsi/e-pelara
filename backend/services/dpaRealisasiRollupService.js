"use strict";

/**
 * Hitung ulang dpa.realisasi dari BKU (cross-check LRA — lihat komentar kolom
 * di models/dpaModel.js: "utama dari BKU"). Matching diprioritaskan:
 *   1. `bku.dpa_id` langsung (diisi sigapSpjSyncService.js saat sync — TIDAK
 *      ambigu, satu baris BKU cuma bisa milik satu DPA). Ini jalur UTAMA untuk
 *      data baru.
 *   2. Fallback LEGACY (baris bku tanpa dpa_id, mis. data lama sebelum dpa_id
 *      diisi otomatis) — match by kode_rekening:
 *      a. Kalau dpa.kode_rekening diisi -> match langsung ke bku.kode_akun.
 *      b. Kalau tidak, cari rincian di rka_rincian_belanja (via dpa.rka_id) dan
 *         jumlahkan bku yang kode_akun-nya ada di daftar kode_rekening rincian itu.
 *      c. Fallback lebih jauh: kalau satu OPD/tahun cuma punya 1 baris DPA aktif
 *         tanpa rincian sama sekali, sisa BKU LEGACY yang belum ter-match ditotal
 *         ke baris itu (tidak ambigu karena tidak ada baris lain yang bisa jadi
 *         kandidat).
 *
 * PENTING: fallback (2) HANYA dihitung dari baris bku TANPA dpa_id — kalau
 * tercampur dengan baris yang sudah py dpa_id, realisasi bisa dihitung DUA KALI
 * (sekali via dpa_id, sekali lagi via kode_rekening/fallback).
 */

async function recalcDpaRealisasi(models, tahunAnggaran) {
  const { Dpa, RkaRincianBelanja, sequelize } = models;
  const tahunStr = String(tahunAnggaran);

  const [dpaIdTotals] = await sequelize.query(
    `SELECT dpa_id, SUM(pengeluaran) AS total
     FROM bku
     WHERE tahun_anggaran = :tahun AND dpa_id IS NOT NULL
     GROUP BY dpa_id`,
    { replacements: { tahun: Number(tahunAnggaran) } },
  );
  const totalByDpaId = new Map(dpaIdTotals.map((r) => [Number(r.dpa_id), Number(r.total) || 0]));

  const [bkuTotals] = await sequelize.query(
    `SELECT kode_akun, SUM(pengeluaran) AS total
     FROM bku
     WHERE tahun_anggaran = :tahun AND kode_akun IS NOT NULL AND dpa_id IS NULL
     GROUP BY kode_akun`,
    { replacements: { tahun: Number(tahunAnggaran) } },
  );
  const totalByKode = new Map(bkuTotals.map((r) => [r.kode_akun, Number(r.total) || 0]));

  const dpaRows = await Dpa.findAll({
    where: { tahun: tahunStr, is_active_version: true },
  });

  const usedKode = new Set();
  const hasil = [];

  for (const dpa of dpaRows) {
    if (totalByDpaId.has(dpa.id)) {
      const realisasi = totalByDpaId.get(dpa.id);
      await dpa.update({ realisasi });
      hasil.push({ dpa_id: dpa.id, realisasi, matched_via: "dpa_id" });
      continue;
    }

    let kodeList = [];
    if (dpa.kode_rekening) {
      kodeList = [dpa.kode_rekening];
    } else if (dpa.rka_id) {
      const rincian = await RkaRincianBelanja.findAll({
        where: { rka_id: dpa.rka_id },
        attributes: ["kode_rekening"],
      });
      kodeList = rincian.map((r) => r.kode_rekening).filter(Boolean);
    }

    let realisasi = 0;
    for (const kode of kodeList) {
      realisasi += totalByKode.get(kode) || 0;
      usedKode.add(kode);
    }

    await dpa.update({ realisasi });
    hasil.push({ dpa_id: dpa.id, realisasi, matched_via: kodeList.length ? "kode_rekening" : "belum_ada_rincian" });
  }

  // Fallback hanya kalau satu OPD/tahun cuma 1 baris DPA aktif — tidak ambigu.
  // Hanya berlaku utk baris legacy (dpa_id null); kalau dpa itu sendiri sudah
  // matched via dpa_id di atas, `continue` di atas sudah melewati baris ini.
  if (dpaRows.length === 1 && hasil[0].matched_via === "belum_ada_rincian") {
    const unmatchedTotal = [...totalByKode.entries()]
      .filter(([kode]) => !usedKode.has(kode))
      .reduce((s, [, v]) => s + v, 0);
    if (unmatchedTotal > 0) {
      const only = dpaRows[0];
      const realisasiBaru = Number(only.realisasi) + unmatchedTotal;
      await only.update({ realisasi: realisasiBaru });
      hasil[0].realisasi = realisasiBaru;
      hasil[0].matched_via = "fallback_single_dpa_row";
    }
  }

  return hasil;
}

module.exports = { recalcDpaRealisasi };
