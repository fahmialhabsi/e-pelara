"use strict";

/**
 * Hitung ulang dpa.realisasi dari BKU (cross-check LRA — lihat komentar kolom
 * di models/dpaModel.js: "utama dari BKU"). Matching per kode_rekening:
 *   1. Kalau dpa.kode_rekening diisi -> match langsung ke bku.kode_akun.
 *   2. Kalau tidak, cari rincian di rka_rincian_belanja (via dpa.rka_id) dan
 *      jumlahkan bku yang kode_akun-nya ada di daftar kode_rekening rincian itu.
 *   3. Fallback: kalau satu OPD/tahun cuma punya 1 baris DPA aktif tanpa rincian
 *      sama sekali, sisa BKU yang belum ter-match ditotal ke baris itu (tidak
 *      ambigu karena tidak ada baris lain yang bisa jadi kandidat).
 */

async function recalcDpaRealisasi(models, tahunAnggaran) {
  const { Dpa, RkaRincianBelanja, sequelize } = models;
  const tahunStr = String(tahunAnggaran);

  const [bkuTotals] = await sequelize.query(
    `SELECT kode_akun, SUM(pengeluaran) AS total
     FROM bku
     WHERE tahun_anggaran = :tahun AND kode_akun IS NOT NULL
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
