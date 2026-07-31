'use strict';

/**
 * Hitung ulang dpa.realisasi dari DUA sumber:
 *   1. BKU (bku.pengeluaran) — data dari Modul LK/Akuntansi
 *   2. Penatausahaan (penatausahaan.jumlah) — data dari Modul PPK Dispang
 *
 * Matching diprioritaskan:
 *   PRIORITAS 1 — BKU dengan dpa_id langsung (jalur utama)
 *   PRIORITAS 2 — Penatausahaan dengan dpa_id langsung (jalur PPK)
 *   PRIORITAS 3 — BKU tanpa dpa_id, match by kode_rekening (legacy fallback)
 *   PRIORITAS 4 — Fallback single DPA row
 *
 * PENTING: Jika dpa sudah matched via BKU dpa_id, penatausahaan TIDAK ditambahkan
 * lagi untuk menghindari double counting. Jika dpa TIDAK matched via BKU,
 * penatausahaan digunakan sebagai sumber realisasi.
 *
 * Total realisasi = BKU (by dpa_id) + Penatausahaan (by dpa_id, hanya jika BKU kosong)
 *                   + BKU legacy fallback (by kode_rekening)
 */

async function recalcDpaRealisasi(models, tahunAnggaran) {
  const { Dpa, RkaRincianBelanja, Penatausahaan, sequelize } = models;
  const tahunStr = String(tahunAnggaran);

  // ── PRIORITAS 1: BKU dengan dpa_id ──────────────────────────────────────────
  const [bkuByDpaId] = await sequelize.query(
    `SELECT dpa_id, SUM(pengeluaran) AS total
     FROM bku
     WHERE tahun_anggaran = :tahun AND dpa_id IS NOT NULL
     GROUP BY dpa_id`,
    { replacements: { tahun: Number(tahunAnggaran) } },
  );
  const bkuTotalByDpaId = new Map(bkuByDpaId.map((r) => [Number(r.dpa_id), Number(r.total) || 0]));

  // ── PRIORITAS 2: Penatausahaan (PPK) dengan dpa_id ─────────────────────────
  const [ppkByDpaId] = await sequelize.query(
    `SELECT dpa_id, SUM(jumlah) AS total
     FROM penatausahaan
     WHERE tahun = :tahun AND dpa_id IS NOT NULL
     GROUP BY dpa_id`,
    { replacements: { tahun: tahunStr } },
  );
  const ppkTotalByDpaId = new Map(ppkByDpaId.map((r) => [Number(r.dpa_id), Number(r.total) || 0]));

  // ── PRIORITAS 3: BKU tanpa dpa_id (legacy) ─────────────────────────────────
  const [bkuByKode] = await sequelize.query(
    `SELECT kode_akun, SUM(pengeluaran) AS total
     FROM bku
     WHERE tahun_anggaran = :tahun AND kode_akun IS NOT NULL AND dpa_id IS NULL
     GROUP BY kode_akun`,
    { replacements: { tahun: Number(tahunAnggaran) } },
  );
  const bkuTotalByKode = new Map(bkuByKode.map((r) => [r.kode_akun, Number(r.total) || 0]));

  // ── Ambil semua DPA aktif ──────────────────────────────────────────────────
  const dpaRows = await Dpa.findAll({
    where: { tahun: tahunStr, is_active_version: true },
  });

  const usedKode = new Set();
  const hasil = [];

  for (const dpa of dpaRows) {
    let realisasi = 0;
    let matchedVia = '';

    // Cek BKU via dpa_id
    if (bkuTotalByDpaId.has(dpa.id)) {
      realisasi = bkuTotalByDpaId.get(dpa.id);
      matchedVia = 'bku_dpa_id';
      // Cek juga apakah ada data penatausahaan yang belum ter-cover oleh BKU
      // Jika ada penatausahaan, tambahkan selisihnya (hindari double count)
      if (ppkTotalByDpaId.has(dpa.id)) {
        const ppkTotal = ppkTotalByDpaId.get(dpa.id);
        // Jika BKU sudah cover, gunakan yang terbesar (tidak double count)
        realisasi = Math.max(realisasi, ppkTotal);
      }
      await dpa.update({ realisasi });
      hasil.push({ dpa_id: dpa.id, realisasi, matched_via: matchedVia });
      continue;
    }

    // Cek Penatausahaan via dpa_id (PPK module source)
    if (ppkTotalByDpaId.has(dpa.id)) {
      realisasi = ppkTotalByDpaId.get(dpa.id);
      matchedVia = 'penatausahaan_dpa_id';
      await dpa.update({ realisasi });
      hasil.push({ dpa_id: dpa.id, realisasi, matched_via: matchedVia });
      continue;
    }

    // Fallback: BKU tanpa dpa_id, match by kode_rekening
    let kodeList = [];
    if (dpa.kode_rekening) {
      kodeList = [dpa.kode_rekening];
    } else if (dpa.rka_id) {
      const rincian = await RkaRincianBelanja.findAll({
        where: { rka_id: dpa.rka_id },
        attributes: ['kode_rekening'],
      });
      kodeList = rincian.map((r) => r.kode_rekening).filter(Boolean);
    }

    for (const kode of kodeList) {
      realisasi += bkuTotalByKode.get(kode) || 0;
      usedKode.add(kode);
    }

    matchedVia = kodeList.length ? 'bku_kode_rekening' : 'belum_ada_sumber';
    await dpa.update({ realisasi });
    hasil.push({ dpa_id: dpa.id, realisasi, matched_via: matchedVia });
  }

  // Fallback terakhir: kalau satu OPD/tahun cuma 1 baris DPA aktif
  if (dpaRows.length === 1 && hasil[0].matched_via === 'belum_ada_sumber') {
    const unmatchedTotal = [...bkuTotalByKode.entries()]
      .filter(([kode]) => !usedKode.has(kode))
      .reduce((s, [, v]) => s + v, 0);
    // Juga cek penatausahaan tanpa dpa_id
    const [ppkWithoutDpa] = await sequelize.query(
      `SELECT SUM(jumlah) AS total
       FROM penatausahaan
       WHERE tahun = :tahun AND dpa_id IS NULL`,
      { replacements: { tahun: tahunStr } },
    );
    const ppkWithoutDpaTotal = Number(ppkWithoutDpa[0]?.total) || 0;

    if (unmatchedTotal > 0 || ppkWithoutDpaTotal > 0) {
      const only = dpaRows[0];
      const realisasiBaru = Number(only.realisasi) + unmatchedTotal + ppkWithoutDpaTotal;
      await only.update({ realisasi: realisasiBaru });
      hasil[0].realisasi = realisasiBaru;
      hasil[0].matched_via = 'fallback_single_dpa_row';
    }
  }

  return hasil;
}

module.exports = { recalcDpaRealisasi };
