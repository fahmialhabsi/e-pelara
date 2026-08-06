"use strict";

/**
 * Sync pagu anggaran (Rp) dari Renstra -> Lakip.
 *
 * Lakip tidak punya kolom FK ke Kegiatan/Sub Kegiatan sama sekali (lihat
 * FASE8-INVESTIGASI-SYNC-SUBKEGIATAN.md §1) — relasinya cuma renstra_id
 * (= RenstraOPD.id) + kecocokan teks indikator_kinerja. `lakip.indikator_kinerja`
 * CAMPURAN 2 grain (dibuktikan lewat data nyata): sebagian diisi dari
 * IndikatorRenstra stage='kegiatan' (lihat lakipAutoGenerateService.js —
 * "Grain: 1 baris per Kegiatan"), sebagian lain dari stage='sub_kegiatan'.
 * Nama indikator di kedua stage TIDAK PERNAH tumpang tindih (dibuktikan
 * berulang di Fase 7 & 8) — 1 baris lakip cuma bisa match ke SALAH SATU stage,
 * dicoba 'kegiatan' dulu baru 'sub_kegiatan' sebagai fallback.
 *
 * ── Fase 11 — sumber data di-retarget total (Agustus 2026, lihat
 * FASE10-INVESTIGASI-INDIKATOR-RENSTRA.md & FASE11-RETARGET-SYNC-INDIKATOR-RENSTRA.md) ──
 * Sejak Fase 11, kedua cabang membaca `pagu_tahun_N` **LANGSUNG dari baris
 * `IndikatorRenstra` yang match** (baik stage 'kegiatan' maupun 'sub_kegiatan'),
 * BUKAN lagi dari `RenstraTabelSubkegiatan` (dihapus total dari file ini,
 * termasuk import-nya). Alasan: investigasi Fase 10 membuktikan
 * `renstra_tabel_subkegiatan` adalah TABEL MATI — form "Tabel Sub Kegiatan"
 * yang menulis ke situ sudah tidak dipakai operator; jalur nyata yang dipakai
 * sehari-hari adalah form "Indikator ..." (submenu dropdown "Indikator" di
 * menu Renstra) yang menulis `pagu_tahun_1..6`/`target_tahun_1..6` LANGSUNG
 * ke `indikator_renstra` itu sendiri — dibuktikan 100%+ (84/84 baris
 * sub_kegiatan, 16/16 kegiatan, 5/5 program) sudah terisi pagu > 0 untuk
 * Renstra OPD aktif, sementara `renstra_tabel_subkegiatan` tetap 0 baris.
 *
 * **Kedua cabang sekarang IDENTIK secara logika (1:1 langsung, TANPA SUM)** —
 * beda dari pola Fase 7 (SUM Sub Kegiatan per Kegiatan). Ini SENGAJA menyimpang
 * dari instruksi awal Fase 11 ("pertahankan SUM utk Kegiatan") setelah dicek
 * dengan data nyata: pagu tiap `IndikatorRenstra` (di stage manapun) ternyata
 * angka yang independen per-indikator, BUKAN pecahan/partisi dari satu pool
 * anggaran Kegiatan — SUM anak Sub Kegiatan vs pagu Kegiatan sendiri terbukti
 * TIDAK NYAMBUNG di data nyata (contoh: Kegiatan id=8 pagu sendiri Rp 25 juta,
 * SUM 7 indikator Sub Kegiatan di bawahnya Rp 484 juta — beda ~19x; pola serupa
 * di 3 Kegiatan lain yang dicek, semua rasio beda-beda tak konsisten). Memaksa
 * SUM di sini akan menghasilkan angka yang menyesatkan, bukan lebih akurat.
 * Jadi tiap baris lakip (level apapun) sekarang membaca pagu MILIKNYA SENDIRI
 * langsung dari baris IndikatorRenstra yang match — lihat detail & data
 * pembuktian di FASE11-RETARGET-SYNC-INDIKATOR-RENSTRA.md §3.
 *
 * **realisasi_anggaran (Rp) TIDAK PUNYA SUMBER LIVE sama sekali** di ekosistem
 * `indikator_renstra` — tabel itu cuma punya `target_tahun_N`/`pagu_tahun_N`,
 * TIDAK ADA kolom realisasi Rupiah. Tabel satelit `realisasi_indikator_renstra`
 * ADA, tapi `nilai_realisasi`-nya berupa angka kinerja (%, jumlah dokumen —
 * dibuktikan nilainya kecil seperti 80.00/85.00/2.00), BUKAN Rupiah — itu
 * sumber untuk `lakip.realisasi` (kinerja), bukan `lakip.realisasi_anggaran`.
 * Jadi fungsi ini SENGAJA menyetel `realisasi_anggaran = 0` eksplisit untuk
 * setiap baris yang berhasil di-update (bukan NaN/crash, bukan dibiarkan
 * kosong tanpa penjelasan) — ini GAP TERBUKA, bukan bug, dan bukan regresi
 * dari Fase 7/9 (realisasi juga selalu 0 di situ, karena `renstra_tabel_
 * subkegiatan.realisasi_tahun_N` yang jadi sumbernya waktu itu juga tidak
 * pernah terisi). Kalau nanti realisasi Rupiah per-indikator Renstra memang
 * dibutuhkan, perlu mekanisme baru — bukan salah satu dari 2 sumber yang
 * sudah dicek (indikator_renstra: tidak ada kolomnya; renstra_tabel_
 * subkegiatan: tidak dipakai siapa pun).
 *
 * ── Riwayat perbaikan ──
 * **Fase 7**: cocokkan indikator_kinerja level Kegiatan yang keliru dicek ke
 * stage='sub_kegiatan' — diperbaiki jadi cocokkan level Kegiatan + (saat itu)
 * SUM dari RenstraTabelSubkegiatan.
 * **Fase 8-9**: menambah cabang level Sub Kegiatan (1:1 langsung) untuk sisa
 * 80/97 baris, tetap dari RenstraTabelSubkegiatan.
 * **Fase 11**: retarget total — kedua cabang baca `indikator_renstra` sendiri
 * secara langsung (lihat penjelasan di atas), `RenstraTabelSubkegiatan` &
 * `renstraRealisasiAnggaranSyncService.js` tidak lagi disentuh fungsi ini sama
 * sekali. Diverifikasi dengan DATA NYATA (bukan data uji buatan) — lihat
 * FASE11-RETARGET-SYNC-INDIKATOR-RENSTRA.md.
 *
 * ── KNOWN ISSUE (masih berlaku, investigasi Fase 4, Agustus 2026 — lihat
 * FASE4-INVESTIGASI-DATA-ANGGARAN.md & FASE4B-DOKUMENTASI-KNOWN-ISSUE.md) ──
 * Kolom hasil sync ini (`lakip.pagu_anggaran`/`realisasi_anggaran`) TETAP
 * TIDAK dipakai oleh render dokumen LAKIP resmi (PDF/DOCX) — `buildHtml()`
 * di lakipGeneratorController.js mengambil angka anggaran lewat agregasi
 * LANGSUNG dari `dpa`+`penatausahaan` di `collectLakipData()`, sepenuhnya
 * independen dari service ini; itu keputusan yang TIDAK berubah oleh Fase 11
 * (kolom ini sekarang benar-benar terisi data nyata, tapi tetap bukan sumber
 * render dokumen — lihat FASE4B untuk alasannya, masih valid). Konsumen kolom
 * ini sekarang: (1) `LakipTable.jsx`/`LakipListPage.jsx` (list view) — TIDAK
 * dirouting di App.jsx, dead code; (2) `mrAutoFillAggregatorService.js`
 * (dropdown "Pilih Data LAKIP" di wizard MR) — live, dan SEKARANG nilai
 * `pagu_anggaran` yang diberikannya sudah data nyata (`realisasi_anggaran`
 * masih 0, lihat gap di atas).
 *
 * STATUS DATA (per Agustus 2026): sync membaca dari `indikator_renstra` —
 * jalur yang TERBUKTI dipakai operator sehari-hari — sudah berfungsi untuk
 * data nyata, TIDAK LAGI menunggu input manual apa pun (beda dari status Fase
 * 7/9 yang masih menunggu `renstra_tabel_subkegiatan` diisi). Sisi PAGU sudah
 * lengkap; sisi REALISASI (Rupiah) tetap 0 karena memang belum ada sumbernya
 * (lihat paragraf realisasi di atas) — itu bukan "menunggu input", tapi
 * "belum ada mekanismenya sama sekali".
 */

const { sequelize, Lakip, IndikatorRenstra, RenstraOPD } = require("../models");

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

const resolveOffsetTahun = (tahunTarget, tahunMulai) => {
  return Number(tahunTarget) - Number(tahunMulai) + 1;
};

async function syncRealisasiAnggaranLakipTahun(tahun) {
  const t = await sequelize.transaction();

  try {
    const lakipRows = await Lakip.findAll({ where: { tahun: String(tahun) }, transaction: t });

    let updated = 0;
    let skipped = 0;
    const indikatorCacheKegiatanByRenstraId = new Map();
    const indikatorCacheSubKegiatanByRenstraId = new Map();
    const tahunMulaiCacheByRenstraId = new Map();

    for (const row of lakipRows) {
      const key = String(row.indikator_kinerja || "").trim();
      if (!row.renstra_id || !key) {
        skipped++;
        continue;
      }

      // Level Kegiatan — sebagian besar lakip.indikator_kinerja diisi dari
      // IndikatorRenstra stage 'kegiatan' (lihat lakipAutoGenerateService.js).
      let byNamaKegiatan = indikatorCacheKegiatanByRenstraId.get(row.renstra_id);
      if (!byNamaKegiatan) {
        const indikatorRows = await IndikatorRenstra.findAll({
          where: { renstra_id: row.renstra_id, stage: "kegiatan" },
          transaction: t,
        });
        byNamaKegiatan = new Map(
          indikatorRows.map((r) => [String(r.nama_indikator || "").trim(), r]),
        );
        indikatorCacheKegiatanByRenstraId.set(row.renstra_id, byNamaKegiatan);
      }

      // Level Sub Kegiatan (Fase 8/9, lihat FASE8-INVESTIGASI-SYNC-SUBKEGIATAN.md
      // §1) — sisa baris lakip yang indikator_kinerja-nya diisi dari
      // IndikatorRenstra stage 'sub_kegiatan' (lebih rinci dari Kegiatan).
      // Nama indikator di kedua stage TIDAK PERNAH tumpang tindih (dibuktikan
      // di Fase 7 & 8), jadi 1 baris cuma bisa match ke SALAH SATU stage —
      // aman dicoba stage 'kegiatan' dulu, baru 'sub_kegiatan' sebagai fallback.
      let byNamaSubKegiatan = indikatorCacheSubKegiatanByRenstraId.get(row.renstra_id);
      if (!byNamaSubKegiatan) {
        const indikatorRows = await IndikatorRenstra.findAll({
          where: { renstra_id: row.renstra_id, stage: "sub_kegiatan" },
          transaction: t,
        });
        byNamaSubKegiatan = new Map(
          indikatorRows.map((r) => [String(r.nama_indikator || "").trim(), r]),
        );
        indikatorCacheSubKegiatanByRenstraId.set(row.renstra_id, byNamaSubKegiatan);
      }

      // Fase 11: kedua stage sekarang diperlakukan SAMA — baca pagu MILIK
      // baris IndikatorRenstra yang match itu sendiri, langsung, tanpa SUM
      // ke entitas lain (lihat penjelasan panjang di JSDoc atas file kenapa
      // SUM ditinggalkan — datanya terbukti tidak nyambung di data nyata).
      const ir = byNamaKegiatan.get(key) || byNamaSubKegiatan.get(key);
      if (!ir) {
        skipped++;
        continue;
      }

      let tahunMulai = tahunMulaiCacheByRenstraId.get(row.renstra_id);
      if (tahunMulai === undefined) {
        const renstraOpd = await RenstraOPD.findByPk(row.renstra_id, {
          attributes: ["id", "tahun_mulai"],
          transaction: t,
        });
        tahunMulai = renstraOpd?.tahun_mulai || null;
        tahunMulaiCacheByRenstraId.set(row.renstra_id, tahunMulai);
      }
      if (!tahunMulai) {
        skipped++;
        continue;
      }

      const offset = resolveOffsetTahun(tahun, tahunMulai);
      if (offset < 1 || offset > 6) {
        skipped++;
        continue;
      }

      // pagu_tahun_1..6 di IndikatorRenstra pakai konvensi kolom yang SAMA
      // (offset dari tahun_mulai Renstra) seperti RenstraTabelSubkegiatan
      // dulu — resolveOffsetTahun() tidak perlu diubah (dicek langsung skema
      // kolomnya, bukan asumsi — lihat FASE11 §1).
      const pagu = round2(ir[`pagu_tahun_${offset}`]);
      // realisasi_anggaran (Rp): TIDAK ADA sumber live — lihat penjelasan
      // panjang di JSDoc atas file. Disetel 0 eksplisit, bukan NaN/undefined.
      const realisasi = 0;

      await row.update(
        {
          pagu_anggaran: pagu,
          realisasi_anggaran: realisasi,
          realisasi_anggaran_synced_at: new Date(),
        },
        { transaction: t },
      );

      updated++;
    }

    await t.commit();

    return { tahun: String(tahun), updated, skipped, total: lakipRows.length };
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

module.exports = {
  syncRealisasiAnggaranLakipTahun,
  resolveOffsetTahun,
};
