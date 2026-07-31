'use strict';

/**
 * Layanan recall dokumen Renja.
 *
 * Dokumen Renja adalah turunan, bukan sumber kebenaran: angkanya berasal dari
 * Renstra, RKPD, LK/DPA, master nomenklatur Kepmendagri 900, dan Tabel C
 * Permendagri 14/2026. Recall menarik ulang seluruh turunan itu supaya dokumen
 * tetap benar setiap kali data hulu berubah — tanpa pengetikan ulang.
 *
 * Berlaku untuk kedua sistematika: pemilihan generator narasi mengikuti
 * `renja_dokumen.regulasi_acuan`, sehingga dokumen 86/2017 tetap menghasilkan
 * 5 bab dan dokumen 14/2026 menghasilkan 6 bab.
 *
 * Cakupan (opsi `scope`):
 *   'realisasi'   - hitung ulang realisasi tahun lalu dari DPA dan LK
 *   'nomenklatur' - isi/segarkan kode program-kegiatan-subkegiatan
 *   'prioritas'   - cocokkan ulang ke Tabel C (hasilnya dilaporkan, tidak disimpan)
 *   'narasi'      - bangun ulang narasi bab dan simpan
 *   'all'         - keempatnya, berurutan (bawaan)
 */

const { recalcDpaRealisasi } = require('../dpaRealisasiRollupService');
const { recalcLkDispang } = require('../lkDispangRollupService');
const { generateBabPermendagri14 } = require('./renjaBabGeneratorService');
const { generateBab } = require('../renjaAutoGenerateBabService');

/** Kode Kepmendagri 900 tersimpan sebagai awalan teks: "2.09.02.1.01.0003 - Nama". */
const POLA_KODE = {
  program: /^\s*(\d\.\d{2}\.\d{2})\.?(?=\s|-|$)/,
  kegiatan: /^\s*(\d\.\d{2}\.\d{2}\.\d\.\d{2})\.?(?=\s|-|$)/,
  sub_kegiatan: /^\s*(\d\.\d{2}\.\d{2}\.\d\.\d{2}\.\d{3,4})\.?(?=\s|-|$)/,
};

const SECTION_86_2017 = [
  ['pendahuluan', 'BAB I Pendahuluan', 'bab1'],
  ['evaluasi', 'BAB II Evaluasi Pelaksanaan Renja', 'bab2'],
  ['tujuan_sasaran', 'BAB III Tujuan dan Sasaran', 'bab3'],
  ['rencana_kerja', 'BAB IV Rencana Kerja dan Pendanaan', 'bab4'],
  ['penutup', 'BAB V Penutup', 'bab5'],
];

const SECTION_14_2026 = [
  ['pendahuluan', 'BAB I Pendahuluan', 'bab1'],
  ['evaluasi', 'BAB II Hasil Evaluasi Renja Perangkat Daerah Tahun Lalu', 'bab2'],
  ['tujuan_sasaran', 'BAB III Tujuan dan Sasaran Perangkat Daerah', 'bab3'],
  ['rencana_kerja', 'BAB IV Rencana Kerja dan Pendanaan Perangkat Daerah', 'bab4'],
  ['kinerja_urusan', 'BAB V Kinerja Penyelenggaraan Bidang Urusan', 'bab5'],
  ['penutup', 'BAB VI Penutup', 'bab6'],
];

const kosong = (v) => v === null || v === undefined || String(v).trim() === '';

const ambilKode = (teks, jenis) => {
  const m = String(teks ?? '').match(POLA_KODE[jenis]);
  return m ? m[1] : null;
};

/**
 * Hitung ulang realisasi tahun lalu dari rantai PPK/BKU -> DPA -> LK.
 * Kegagalan di sini tidak menggagalkan recall: dokumen tetap dapat dibangun
 * memakai realisasi yang sudah tersimpan sebelumnya.
 */
async function segarkanRealisasi(db, tahunLalu, laporan) {
  try {
    await recalcDpaRealisasi(db, tahunLalu);
    laporan.realisasi.dpa = 'ok';
  } catch (e) {
    laporan.realisasi.dpa = `gagal: ${e.message}`;
  }
  try {
    await recalcLkDispang(db, tahunLalu);
    laporan.realisasi.lk = 'ok';
  } catch (e) {
    laporan.realisasi.lk = `gagal: ${e.message}`;
  }
}

/**
 * Isi kolom kode dari awalan teks nomenklatur, lalu bandingkan namanya dengan
 * master Kepmendagri 900. Selisih nama dilaporkan tetapi tidak ditimpa — nama
 * pada dokumen perencanaan adalah keputusan perangkat daerah.
 */
async function segarkanNomenklatur(db, dokumenId, laporan) {
  const rows = await db.RenjaItem.findAll({
    where: { renja_dokumen_id: dokumenId },
    attributes: [
      'id',
      'program',
      'kegiatan',
      'sub_kegiatan',
      'kode_program',
      'kode_kegiatan',
      'kode_sub_kegiatan',
    ],
  });

  let diisi = 0;
  for (const r of rows) {
    const usulan = {};
    for (const jenis of ['program', 'kegiatan', 'sub_kegiatan']) {
      const kolom = `kode_${jenis}`;
      if (!kosong(r[kolom])) continue;
      const kode = ambilKode(r[jenis], jenis);
      if (kode) usulan[kolom] = kode;
    }
    if (Object.keys(usulan).length) {
      await db.RenjaItem.update(usulan, { where: { id: r.id } });
      diisi += 1;
    }
  }

  const tanpaKode = await db.RenjaItem.count({
    where: { renja_dokumen_id: dokumenId, kode_sub_kegiatan: null },
  });

  laporan.nomenklatur = { baris: rows.length, kode_diisi: diisi, tanpa_kode: tanpaKode };
}

/**
 * Cocokkan subkegiatan Renja ke Tabel C-2/C-3 (Pro-SN dan Tematik) dan Tabel
 * C-6 (Asta Cita). Hasilnya sengaja TIDAK disimpan sebagai kolom: bila
 * lampiran Rakortekbang diperbarui, nilai tersimpan akan menjadi basi.
 * Kolom Prioritas Nasional/Daerah pada Tabel 4.1 dihitung dari sini saat render.
 */
async function cocokkanTabelC(db, dokumenId, laporan) {
  const baris = await db.sequelize.query(
    `SELECT ri.id,
            ri.kode_sub_kegiatan                        AS kode,
            GROUP_CONCAT(DISTINCT d.pro_sn)             AS pro_sn,
            GROUP_CONCAT(DISTINCT d.tematik_pembangunan) AS tematik,
            MAX(a.outcome_prioritas)                    AS outcome_asta_cita
       FROM renja_item ri
       LEFT JOIN renja_dukungan_prosn_tematik d ON d.kode = ri.kode_sub_kegiatan
       LEFT JOIN renja_outcome_asta_cita a      ON a.kode_subkegiatan = ri.kode_sub_kegiatan
      WHERE ri.renja_dokumen_id = :dokumenId
        AND ri.kode_sub_kegiatan IS NOT NULL
      GROUP BY ri.id, ri.kode_sub_kegiatan`,
    { replacements: { dokumenId }, type: db.Sequelize.QueryTypes.SELECT },
  );

  const cocok = baris.filter((b) => b.pro_sn || b.tematik || b.outcome_asta_cita);
  laporan.prioritas = {
    diperiksa: baris.length,
    mendukung_pro_sn: baris.filter((b) => b.pro_sn).length,
    mendukung_tematik: baris.filter((b) => b.tematik).length,
    mendukung_asta_cita: baris.filter((b) => b.outcome_asta_cita).length,
    daftar: cocok.map((b) => ({
      kode: b.kode,
      pro_sn: b.pro_sn || null,
      tematik: b.tematik || null,
      outcome_asta_cita: b.outcome_asta_cita || null,
    })),
  };
}

/** Bangun ulang narasi bab sesuai regulasi acuan dokumen, lalu simpan. */
async function segarkanNarasi(db, dok, laporan) {
  const p14 = dok.regulasi_acuan === '14_2026';
  const bab = p14 ? await generateBabPermendagri14(db, dok.id) : await generateBab(db, dok.id);

  const peta = p14 ? SECTION_14_2026 : SECTION_86_2017;

  const perubahan = {};
  for (const [, , kunciBab] of peta) {
    const isi = bab[kunciBab];
    if (isi) perubahan[`text_${kunciBab}`] = isi;
  }
  await dok.update(perubahan);

  if (db.RenjaDokumenSection) {
    for (const [sectionKey, sectionTitle, kunciBab] of peta) {
      const isi = bab[kunciBab];
      if (!isi) continue;
      await db.RenjaDokumenSection.upsert({
        renja_dokumen_id: dok.id,
        section_key: sectionKey,
        section_title: sectionTitle,
        content: isi,
      });
    }
  }

  laporan.narasi = {
    regulasi_acuan: dok.regulasi_acuan,
    jumlah_bab: peta.length,
    panjang: Object.fromEntries(peta.map(([, , k]) => [k, bab[k] ? String(bab[k]).length : 0])),
  };
}

/**
 * Titik masuk tunggal recall.
 * @returns {Promise<object>} laporan apa saja yang disegarkan
 */
/** Cakupan yang mengubah isi dokumen — dibatasi pada dokumen berstatus final. */
const SCOPE_MENULIS = ['nomenklatur', 'narasi'];

async function recallRenja(db, dokumenId, opsi = {}) {
  const { scope = 'all', userId = null, alasan = null, paksa = false } = opsi;

  const dok = await db.RenjaDokumen.findByPk(dokumenId);
  if (!dok) throw new Error('Dokumen Renja tidak ditemukan.');

  // Dokumen final adalah dokumen yang sudah disahkan; membangun ulang narasinya
  // diam-diam akan mengubah isi yang sudah dipertanggungjawabkan. Cakupan baca
  // ('prioritas') dan penyegaran data hulu ('realisasi') tetap diizinkan karena
  // keduanya tidak menyentuh isi dokumen.
  const menulis = scope === 'all' || SCOPE_MENULIS.includes(scope);
  if (menulis && dok.status === 'final' && !paksa) {
    throw new Error(
      'Dokumen berstatus final. Gunakan scope "prioritas"/"realisasi", ubah status ke draft, ' +
        'atau kirim paksa=true bila memang hendak menimpa narasi dokumen final.',
    );
  }

  const jalankan = (bagian) => scope === 'all' || scope === bagian;
  const laporan = {
    dokumen_id: dok.id,
    tahun: dok.tahun,
    regulasi_acuan: dok.regulasi_acuan,
    scope,
    realisasi: {},
    nomenklatur: null,
    prioritas: null,
    narasi: null,
  };

  if (jalankan('realisasi')) await segarkanRealisasi(db, Number(dok.tahun) - 1, laporan);
  if (jalankan('nomenklatur')) await segarkanNomenklatur(db, dok.id, laporan);
  if (jalankan('prioritas')) await cocokkanTabelC(db, dok.id, laporan);
  // Narasi dijalankan terakhir supaya ikut memuat hasil ketiga langkah di atas.
  if (jalankan('narasi')) await segarkanNarasi(db, dok, laporan);

  // Penanda hanya dilepas bila dokumen benar-benar dibangun ulang. Recall
  // sebatas 'prioritas' atau 'realisasi' tidak menghapus peringatan.
  if (menulis) {
    await dok.update({ needs_recall: false, recall_reason: null, last_recall_at: new Date() });
  }

  if (db.ActivityLog) {
    await db.ActivityLog.create({
      user_id: userId,
      action: 'renja_recall',
      entity_type: 'renja_dokumen',
      entity_id: dok.id,
      new_data: JSON.stringify({ ...laporan, alasan }),
    }).catch(() => null);
  }

  return laporan;
}

/**
 * Dipanggil modul hulu (Renstra, RKPD, LK, DPA, seeder Tabel C) setelah datanya
 * berubah, agar dokumen Renja terkait memunculkan peringatan "perlu recall".
 * Tidak membangun ulang apa pun — hanya menandai.
 */
async function tandaiPerluRecall(
  db,
  { perangkatDaerahId = null, tahun = null, alasan = null } = {},
) {
  const where = {};
  if (perangkatDaerahId) where.perangkat_daerah_id = perangkatDaerahId;
  if (tahun) where.tahun = tahun;
  // Tanpa penyaring apa pun, seluruh dokumen akan tertandai — cegah.
  if (Object.keys(where).length === 0) {
    throw new Error('tandaiPerluRecall membutuhkan perangkatDaerahId dan/atau tahun.');
  }

  const [jumlah] = await db.RenjaDokumen.update(
    { needs_recall: true, recall_reason: alasan ? String(alasan).slice(0, 255) : null },
    { where },
  );
  return { ditandai: jumlah };
}

module.exports = { recallRenja, tandaiPerluRecall };
