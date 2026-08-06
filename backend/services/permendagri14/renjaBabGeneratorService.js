'use strict';

/**
 * Auto-generate narasi BAB I s/d VI dokumen Renja Perangkat Daerah menurut
 * sistematika Peraturan Menteri Dalam Negeri Nomor 14 Tahun 2026 (Lampiran
 * angka II.A.3).
 *
 * Modul ini TERPISAH dari renjaAutoGenerateBabService.js (Permendagri 86/2017)
 * dan tidak menggantikannya — dipilih lewat kolom RenjaDokumen.regulasi_acuan.
 *
 * Sistematika yang diikuti (Lampiran hal. 96-97):
 *   BAB I   Pendahuluan                     1.1 Latar Belakang, 1.2 Landasan Hukum,
 *                                           1.3 Maksud dan Tujuan, 1.4 Sistematika
 *   BAB II  Hasil Evaluasi Renja Tahun Lalu 2.1 Evaluasi Capaian Kinerja (IKU & IKK),
 *                                           2.2 Evaluasi SPM (bagi urusan terkait),
 *                                           2.3 Rumusan Permasalahan & Isu Strategis,
 *                                           2.4 Telaah Pokok-Pokok Pikiran DPRD,
 *                                           2.5 Inovasi Bidang Urusan,
 *                                           2.6 Rekomendasi & Catatan Strategis*
 *   BAB III Tujuan dan Sasaran              3.1 Tujuan & Sasaran, 3.2 Arah Kebijakan
 *   BAB IV  Rencana Kerja dan Pendanaan     pengantar + Tabel 4.1 (18 kolom)
 *   BAB V   Kinerja Penyelenggaraan Urusan  5.1 IKU, 5.2 IKK
 *   BAB VI  Penutup
 *
 * *) Subbab 2.6 bukan perintah Permendagri, melainkan tambahan yang lazim pada
 *    dokumen acuan. Permendagri memakai frasa "paling sedikit", sehingga
 *    penambahan subbab diperbolehkan; pengurangan tidak.
 *
 * Prinsip: seluruh angka ditarik dari modul lain (Renstra, RKPD, LK/DPA, Tabel C
 * Permendagri 14/2026, master Kepmendagri 900). Yang tertulis di berkas ini
 * hanya kerangka kalimat, bukan data.
 */

const { pilihTargetTahun } = require('../lakipBridgeService');
const { buildTabel21Rows } = require('../renjaTabel21HierarkiService');
const { buildTabel41 } = require('./renjaTabel41Service');
const {
  ambilCapaianIkuIkk,
  formatAngkaIndikator,
  narasiFaktorPendorongPenghambat,
} = require('../renstraIkuIkkService');

const rupiah = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

const sanitizeCell = (val) =>
  String(val ?? '......')
    .replace(/\r?\n/g, ' ')
    .replace(/\|/g, '/')
    .trim();

const angkaId = (v) =>
  v === null || v === undefined || v === ''
    ? '......'
    : String(v).replace('.', ',');

/** Ambil paragraf pertama saja dari field metodologi indikator_renstra (mis.
 * definisi_operasional) yang sering berisi beberapa paragraf/rumus panjang —
 * dikutip sebagai narasi ringkas, bukan seluruh isinya, supaya paragraf
 * narasi bab tidak jadi satu blok teks raksasa. Kalau paragraf pertama masih
 * melebihi batas, potongannya diprioritaskan pada akhir KALIMAT (titik)
 * terdekat, baru turun ke akhir KATA — supaya tidak berhenti di tengah kata
 * (mis. "...tingkat wil…" yang ternyata cuma terpotong dari "wilayah"). */
function ringkasParagraf(teks, maxLen = 700) {
  const paragrafPertama = String(teks ?? '')
    .split(/\r?\n\s*\r?\n/)[0]
    .replace(/\r?\n/g, ' ')
    .trim();
  if (paragrafPertama.length <= maxLen) return paragrafPertama;
  const potongan = paragrafPertama.slice(0, maxLen);
  const batasKalimat = potongan.lastIndexOf('. ');
  if (batasKalimat > maxLen * 0.5) return potongan.slice(0, batasKalimat + 1).trim();
  const batasKata = potongan.lastIndexOf(' ');
  const bersih = (batasKata > 0 ? potongan.slice(0, batasKata) : potongan).trim();
  return `${bersih}…`;
}

/**
 * Enam bidang urusan wajib pelayanan dasar menurut Peraturan Pemerintah Nomor 2
 * Tahun 2018. Hanya bidang urusan inilah yang wajib menyajikan evaluasi SPM
 * pada subbab 2.2 — Permendagri 14/2026 menuliskannya sebagai "bagi bidang
 * urusan terkait". Ditentukan dari kode, bukan dari nama perangkat daerah.
 */
const BIDANG_URUSAN_SPM = {
  '1.01': 'Pendidikan',
  '1.02': 'Kesehatan',
  '1.03': 'Pekerjaan Umum dan Penataan Ruang',
  '1.04': 'Perumahan Rakyat dan Kawasan Permukiman',
  '1.05': 'Ketenteraman, Ketertiban Umum, dan Perlindungan Masyarakat',
  '1.06': 'Sosial',
};

/** Nama bidang urusan NON-SPM yang dipakai modul ini — dipakai untuk menulis
 * "bidang urusan <Nama> dengan Kode <kode>" pada narasi subbab Evaluasi SPM
 * (permintaan Bappeda 2026-08-01), supaya tidak hanya menyebut kodenya saja.
 * Baru berisi Pangan karena modul ini ditulis khusus Dinas Pangan; tambahkan
 * entri lain kalau modul dipakai OPD non-SPM lain. */
const NAMA_BIDANG_URUSAN_UMUM = { '2.09': 'Pangan' };

/**
 * Skala interpretasi capaian kinerja Permendagri 86/2017 (Lampiran, tata cara
 * evaluasi). Dipakai untuk mengisi kolom Predikat pada Tabel 2.1 supaya
 * penilaiannya konsisten dan tidak ditulis manual per dokumen.
 */
function predikatCapaian(persen) {
  if (persen === null || persen === undefined || Number.isNaN(persen)) return '......';
  if (persen >= 91) return 'Sangat Tinggi';
  if (persen >= 76) return 'Tinggi';
  if (persen >= 66) return 'Sedang';
  if (persen >= 51) return 'Rendah';
  return 'Sangat Rendah';
}

/**
 * Terbilang untuk penulisan resmi "5 (lima) program". Cukup sampai puluhan —
 * jumlah program/kegiatan sebuah perangkat daerah tidak pernah lebih dari itu;
 * di atas 99 angkanya dikembalikan apa adanya.
 */
const SATUAN_TERBILANG = [
  'nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan',
  'sembilan', 'sepuluh', 'sebelas',
];

function terbilang(n) {
  const x = Number(n);
  if (!Number.isFinite(x) || x < 0) return String(n);
  if (x < 12) return SATUAN_TERBILANG[x];
  if (x < 20) return `${SATUAN_TERBILANG[x - 10]} belas`;
  if (x < 100) {
    const puluh = Math.floor(x / 10);
    const sisa = x % 10;
    return `${SATUAN_TERBILANG[puluh]} puluh${sisa ? ` ${SATUAN_TERBILANG[sisa]}` : ''}`;
  }
  return String(x);
}

// ===========================================================================

// Sakelar tampil/sembunyi subbab & tabel Bab II — atas permintaan Bappeda
// (2026-08-01): awalnya Tabel 2.3 lama, subbab Evaluasi SPM, dan subbab
// Rekomendasi & Catatan Strategis disembunyikan, TAPI query/perhitungan
// datanya tetap dijalankan (tidak dihapus dari sistem). Pada putaran review
// berikutnya (2026-08-01, catatan susulan) Bappeda meminta subbab Evaluasi
// SPM DITAMPILKAN KEMBALI sebagai "2.2 Evaluasi Capaian SPM ... (bagi bidang
// urusan terkait)" — flag di bawah dibalik ke true untuk itu; Tabel 2.3 lama
// & subbab Rekomendasi tetap disembunyikan sampai ada permintaan sebaliknya.
const TAMPILKAN_TABEL_2_3_CAPAIAN_PROGRAM = false;
const TAMPILKAN_SUBBAB_EVALUASI_SPM = true;
const TAMPILKAN_SUBBAB_REKOMENDASI_CATATAN = false;

/**
 * Indeks Ketahanan Pangan (IKP) 10 kabupaten/kota se-Provinsi Maluku Utara —
 * permintaan Bappeda (2026-08-01) agar capaian IKK ketahanan pangan dirinci
 * per kabupaten/kota, bukan cuma level provinsi/OPD.
 *
 * Sumber: Badan Pangan Nasional (Bapanas), publikasi "Indeks Ketahanan Pangan
 * Tahun 2023" (data.badanpangan.go.id), tabel komposit & sub-indeks kabupaten/
 * kota halaman 45 dan tabel kota halaman 54, dengan kolom tahun 2022 & 2023
 * berdampingan pada sumber aslinya. Peringkat nasional dihitung dari 416
 * kabupaten (kategori kabupaten) dan 98 kota (kategori kota) se-Indonesia.
 * Kategori "kota" (Ternate, Tidore Kepulauan) tidak memiliki sub-indeks
 * Ketersediaan pada publikasi Bapanas — wilayah kota lazimnya bukan sentra
 * produksi pangan sehingga dimensi ini tidak diukur terpisah untuk kategori
 * kota, konsisten dengan metodologi Bapanas.
 *
 * CATATAN KEJUJURAN DATA: ini bukan data internal Dinas Pangan, melainkan
 * indikator eksternal (bukan salah satu baris IKK resmi Renstra OPD),
 * disajikan sebagai KONTEKS KEWILAYAHAN untuk memperkuat narasi faktor
 * pendorong/penghambat capaian IKK ketahanan pangan pada Tabel 2.2 — bukan
 * pengganti/tambahan baris IKK resmi. Kalau publikasi tahun lebih baru
 * (2024/2025) sudah terbit di data.badanpangan.go.id, angka ini perlu
 * dimutakhirkan.
 *
 * Kolom `ipm2023` (Indeks Pembangunan Manusia) — sumber BPS Provinsi Maluku
 * Utara (data 2023/2024), disertakan HANYA sebagai konteks korelasi wilayah
 * rentan (bukan sub-indeks IKP itu sendiri, dan bukan IKK Dinas Pangan) —
 * dicek user (2026-08-01) dari dokumenEPelara/Laporan_IKK_Malut.md. Angka
 * EKPPD pada file yang sama SENGAJA TIDAK dipakai di sini karena itu skor
 * tata kelola LPPD umum (Permendagri 18/2020), bukan indikator ketahanan
 * pangan — akan menyesatkan kalau dicampur sebagai "capaian IKK".
 */
const IKP_KABUPATEN_KOTA_MALUT = [
  { nama: 'Kota Ternate', kategori: 'kota', peringkat: 18, dari: 98, ketersediaan2023: null, keterjangkauan2023: 97.30, pemanfaatan2023: 83.14, komposit2023: 89.51, komposit2022: 81.32, ipm2023: 81.25 },
  { nama: 'Kota Tidore Kepulauan', kategori: 'kota', peringkat: 94, dari: 98, ketersediaan2023: null, keterjangkauan2023: 90.76, pemanfaatan2023: 45.43, komposit2023: 65.83, komposit2022: 55.94, ipm2023: 73.00 },
  { nama: 'Halmahera Utara', kategori: 'kabupaten', peringkat: 140, dari: 416, ketersediaan2023: 78.69, keterjangkauan2023: 93.02, pemanfaatan2023: 74.21, komposit2023: 81.20, komposit2022: 63.43, ipm2023: 71.25 },
  { nama: 'Halmahera Timur', kategori: 'kabupaten', peringkat: 229, dari: 416, ketersediaan2023: 84.00, keterjangkauan2023: 80.98, pemanfaatan2023: 66.55, komposit2023: 76.12, komposit2022: 72.38, ipm2023: 71.11 },
  { nama: 'Pulau Morotai', kategori: 'kabupaten', peringkat: 369, dari: 416, ketersediaan2023: 0.00, keterjangkauan2023: 90.16, pemanfaatan2023: 66.63, komposit2023: 53.70, komposit2022: 59.62, ipm2023: 64.73 },
  { nama: 'Kepulauan Sula', kategori: 'kabupaten', peringkat: 371, dari: 416, ketersediaan2023: 11.34, keterjangkauan2023: 87.08, pemanfaatan2023: 59.38, komposit2023: 53.28, komposit2022: 50.64, ipm2023: 68.89 },
  { nama: 'Halmahera Barat', kategori: 'kabupaten', peringkat: 373, dari: 416, ketersediaan2023: 0.00, keterjangkauan2023: 87.61, pemanfaatan2023: 66.38, komposit2023: 52.84, komposit2022: 52.05, ipm2023: 69.75 },
  { nama: 'Halmahera Selatan', kategori: 'kabupaten', peringkat: 376, dari: 416, ketersediaan2023: 0.00, keterjangkauan2023: 89.86, pemanfaatan2023: 63.61, komposit2023: 52.40, komposit2022: 53.42, ipm2023: 69.05 },
  { nama: 'Halmahera Tengah', kategori: 'kabupaten', peringkat: 381, dari: 416, ketersediaan2023: 1.85, keterjangkauan2023: 87.04, pemanfaatan2023: 60.02, komposit2023: 50.67, komposit2022: 50.67, ipm2023: 71.57 },
  { nama: 'Pulau Taliabu', kategori: 'kabupaten', peringkat: 386, dari: 416, ketersediaan2023: 0.00, keterjangkauan2023: 79.58, pemanfaatan2023: 59.98, komposit2023: 47.87, komposit2022: 44.39, ipm2023: 64.31 },
];

async function generateBabPermendagri14(db, dokumenId) {
  const {
    RenjaDokumen,
    RenjaItem,
    RkpdDokumen,
    RenstraPdDokumen,
    PerangkatDaerah,
    PeriodeRpjmd,
    LkDispang,
    RenstraSasaran,
    RenstraTujuan,
    RenstraProgram,
    PrioritasNasional,
    PrioritasDaerah,
    PrioritasGubernur,
    IndikatorRenstra,
    RealisasiIndikatorRenstra,
    RenjaPokirDprd,
    RenjaInovasiBidangUrusan,
    RenjaLandasanHukum,
  } = db;

  const dok = await RenjaDokumen.findByPk(dokumenId, {
    include: [
      { model: RkpdDokumen, as: 'rkpdDokumen', required: false },
      { model: RenstraPdDokumen, as: 'renstraPdDokumen', required: false },
      { model: PerangkatDaerah, as: 'perangkatDaerah', required: false },
      { model: PeriodeRpjmd, as: 'periode', required: false },
    ],
  });
  if (!dok) throw new Error('Dokumen Renja tidak ditemukan.');

  const namaOpd = dok.perangkatDaerah?.nama || 'Perangkat Daerah';
  const tahun = Number(dok.tahun);
  // Saat Renja disusun, tahun-1 masih berjalan; tahun terakhir yang realisasinya
  // lengkap adalah tahun-2 (Renja 2027 mengevaluasi Tahun 2025).
  const tahunEvaluasi = tahun - 2;
  const periode = dok.periode;
  const tahunAwal = periode?.tahun_awal || tahun;
  const tahunAkhir = periode?.tahun_akhir || tahun + 4;
  const perangkatDaerahId = dok.perangkat_daerah_id;
  const renstraOpdId = dok.renstraPdDokumen?.renstra_opd_id || 0;

  const renjaItems = await RenjaItem.findAll({
    where: { renja_dokumen_id: dokumenId },
    order: [['urutan', 'ASC']],
  });

  // Bidang urusan diturunkan dari kode program yang benar-benar dipakai OPD.
  const kodeBidangUrusan =
    [...new Set(renjaItems.map((i) => (i.kode_program || '').slice(0, 4)).filter(Boolean))][0] ||
    null;
  const urusanSpm = kodeBidangUrusan ? BIDANG_URUSAN_SPM[kodeBidangUrusan] : null;

  // ---- Tabel 4.1 dipakai ulang untuk angka agregat Bab IV dan Bab VI --------
  let tabel41 = null;
  try {
    tabel41 = await buildTabel41(db, dokumenId);
  } catch {
    tabel41 = null;
  }

  // ---- Landasan hukum (Bab I.2) -------------------------------------------
  let landasanHukum = [];
  if (RenjaLandasanHukum) {
    const rows = await RenjaLandasanHukum.findAll({
      where: { aktif: true },
      order: [
        ['urutan', 'ASC'],
        ['id', 'ASC'],
      ],
    }).catch(() => []);
    landasanHukum = rows.filter(
      (r) => !r.kode_bidang_urusan || r.kode_bidang_urusan === kodeBidangUrusan,
    );
  }

  // ---- IKU & IKK Perangkat Daerah (level OPD, dari modul Renstra) ---------
  // Sumber utama subbab 2.1 ("Evaluasi Capaian Kinerja (IKU & IKK)") dan Bab V
  // ("Kinerja Penyelenggaraan Bidang Urusan") — menggantikan proksi lama yang
  // dulu memakai indikator sasaran/program karena stage='iku'/'ikk' belum ada.
  const { iku: capaianIkuBaru, ikk: capaianIkk } = await ambilCapaianIkuIkk(db, renstraOpdId, {
    tahunEvaluasi,
    tahunAwal,
  });

  // ---- Program Prioritas Nasional/Daerah/Gubernur (level Program Renstra) --
  // Dipakai Tabel 4.2 Bab IV — Dukungan Program terhadap Prioritas Berjenjang.
  // Sempat digabung jadi kolom tambahan Tabel 4.1, lalu atas catatan Bappeda
  // (Tabel 4.1 dinilai kepanjangan sehingga kolom Prioritas terasa terpisah)
  // dikembalikan sebagai tabel tersendiri, TETAP di Bab IV (bukan balik ke
  // Bab V seperti Tabel 5.3 semula) sehingga langsung mengikuti Tabel 4.1.
  // Belum wajib diisi (kolomnya baru ditambahkan), jadi banyak Program bisa
  // saja belum menopang satu pun — itu ditampilkan apa adanya, bukan error.
  const programPrioritas =
    RenstraProgram && renstraOpdId
      ? await RenstraProgram.findAll({
          where: { renstra_id: renstraOpdId },
          include: [
            { model: PrioritasNasional, as: 'prioritasNasional', required: false },
            { model: PrioritasDaerah, as: 'prioritasDaerah', required: false },
            { model: PrioritasGubernur, as: 'prioritasGubernur', required: false },
          ],
          order: [['kode_program', 'ASC']],
        }).catch(() => [])
      : [];
  const programBerprioritas = programPrioritas.filter(
    (p) => p.prioritasNasional || p.prioritasDaerah || p.prioritasGubernur,
  );

  // ---- Indikator Renstra & realisasinya ------------------------------------
  const indikatorSasaran =
    IndikatorRenstra && renstraOpdId
      ? await IndikatorRenstra.findAll({
          where: { renstra_id: renstraOpdId, stage: 'sasaran' },
        }).catch(() => [])
      : [];

  const indikatorProgram = renstraOpdId
    ? await db.sequelize
        .query(
          `SELECT ir.*, p.kode_program, p.nama_program
             FROM indikator_renstra ir
             JOIN renstra_program p ON p.id = ir.ref_id
            WHERE ir.renstra_id = :rid AND ir.stage = 'program'
            ORDER BY p.kode_program ASC`,
          { replacements: { rid: renstraOpdId }, type: db.Sequelize.QueryTypes.SELECT },
        )
        .catch(() => [])
    : [];

  const ambilRealisasi = async (indikatorId, thn) => {
    if (!RealisasiIndikatorRenstra) return null;
    const r = await RealisasiIndikatorRenstra.findOne({
      where: { indikator_renstra_id: indikatorId, tahun: String(thn) },
    }).catch(() => null);
    return r ? r.nilai_realisasi : null;
  };

  const sasaranRows = await RenstraSasaran.findAll({
    where: { renstra_id: renstraOpdId },
    limit: 20,
  }).catch(() => []);
  const tujuanRows = await RenstraTujuan.findAll({
    where: { renstra_id: renstraOpdId },
    limit: 20,
  }).catch(() => []);

  const indikatorTujuanRows = await db.sequelize
    .query(
      `SELECT id, ref_id, nama_indikator, satuan, target_tahun_1, target_tahun_2,
              target_tahun_3, target_tahun_4, target_tahun_5, target_tahun_6
         FROM indikator_renstra WHERE stage='tujuan' AND renstra_id=:rid`,
      { replacements: { rid: renstraOpdId }, type: db.Sequelize.QueryTypes.SELECT },
    )
    .catch(() => []);
  const indikatorSasaranRows = await db.sequelize
    .query(
      `SELECT id, ref_id, nama_indikator, satuan, target_tahun_1, target_tahun_2,
              target_tahun_3, target_tahun_4, target_tahun_5, target_tahun_6
         FROM indikator_renstra WHERE stage='sasaran' AND renstra_id=:rid`,
      { replacements: { rid: renstraOpdId }, type: db.Sequelize.QueryTypes.SELECT },
    )
    .catch(() => []);

  const indikatorByTujuan = {};
  indikatorTujuanRows.forEach((ir) => {
    (indikatorByTujuan[ir.ref_id] ||= []).push(ir);
  });
  const indikatorBySasaran = {};
  indikatorSasaranRows.forEach((ir) => {
    (indikatorBySasaran[ir.ref_id] ||= []).push(ir);
  });

  // ---- Tabel C: outcome prioritas nasional untuk bidang urusan ini ----------
  const outcomeAstaCita = kodeBidangUrusan
    ? await db.sequelize
        .query(
          `SELECT DISTINCT asta_cita, outcome_prioritas, indikator, satuan
             FROM renja_outcome_asta_cita
            WHERE kode_bidang_urusan = :bu AND sumber = 'rakortekbang_2026'`,
          { replacements: { bu: kodeBidangUrusan }, type: db.Sequelize.QueryTypes.SELECT },
        )
        .catch(() => [])
    : [];

  const dukunganProSn = kodeBidangUrusan
    ? await db.sequelize
        .query(
          `SELECT jenis, pro_sn, tematik_pembangunan, proyek_kegiatan, outcome,
                  indikator_outcome, satuan, kode, sub_kegiatan
             FROM renja_dukungan_prosn_tematik
            WHERE kode_bidang_urusan = :bu AND sumber = 'rakortekbang_2026'
            ORDER BY jenis, urutan`,
          { replacements: { bu: kodeBidangUrusan }, type: db.Sequelize.QueryTypes.SELECT },
        )
        .catch(() => [])
    : [];

  // Subkegiatan Renja yang benar-benar mendukung prioritas nasional.
  const kodeRenja = new Set(renjaItems.map((i) => i.kode_sub_kegiatan).filter(Boolean));
  const dukunganTerakomodasi = dukunganProSn.filter((d) => kodeRenja.has(d.kode));


  // ---- Data pendukung tahunan per OPD --------------------------------------
  const pokirRows = RenjaPokirDprd
    ? await RenjaPokirDprd.findAll({
        where: { tahun: String(tahun), perangkat_daerah_id: perangkatDaerahId },
        order: [['urutan', 'ASC']],
      }).catch(() => [])
    : [];

  const inovasiRows = RenjaInovasiBidangUrusan
    ? await RenjaInovasiBidangUrusan.findAll({
        where: { tahun: String(tahun), perangkat_daerah_id: perangkatDaerahId },
        order: [['urutan', 'ASC']],
      }).catch(() => [])
    : [];

  const lkRows = await LkDispang.findAll({
    where: { tahun: String(tahunEvaluasi) },
    order: [['program', 'ASC']],
  }).catch(() => []);

  // =========================================================================
  // BAB I — PENDAHULUAN
  // =========================================================================
  let bab1 = `1.1 Latar Belakang\n\n`;
  bab1 += `Rencana Kerja (Renja) Perangkat Daerah adalah dokumen perencanaan Perangkat Daerah untuk periode 1 (satu) tahun yang memuat program, kegiatan, dan subkegiatan beserta indikator kinerja, kelompok sasaran, lokasi, dan pagu indikatif. Renja ${namaOpd} Tahun ${tahun} merupakan penjabaran tahunan dari Rencana Strategis (Renstra) ${namaOpd} Tahun ${tahunAwal}–${tahunAkhir} sekaligus mengacu pada Rencana Kerja Pemerintah Daerah (RKPD) Provinsi Maluku Utara Tahun ${tahun}.\n\n`;
  bab1 += `Nilai strategis dokumen ini terletak pada kedudukannya sebagai jembatan antara perencanaan jangka menengah dan penganggaran tahunan: Renja menjadi dasar penyusunan Rencana Kerja dan Anggaran (RKA) dalam rangka penetapan Anggaran Pendapatan dan Belanja Daerah Tahun ${tahun}, sekaligus menjadi instrumen pengendalian dan evaluasi kinerja tahunan ${namaOpd}.\n\n`;
  bab1 += `Penyusunan Renja Tahun ${tahun} berpedoman pada Peraturan Menteri Dalam Negeri Nomor 14 Tahun 2026 tentang Pedoman Penyusunan Rencana Kerja Pemerintah Daerah Tahun 2027, yang menetapkan sistematika Renja Perangkat Daerah paling sedikit terdiri atas 6 (enam) bab. Proses penyusunannya memperhatikan hasil evaluasi pelaksanaan Renja Tahun ${tahunEvaluasi}, kesepakatan Rapat Koordinasi Teknis Perencanaan Pembangunan (Rakortekbang) Tahun 2026, serta dinamika lingkungan strategis yang dihadapi ${namaOpd}. Penyusunan program, kegiatan, dan subkegiatan dalam dokumen ini juga telah disesuaikan dengan Keputusan Menteri Dalam Negeri Nomor 900.1-861 Tahun 2026 tentang Perubahan Keempat atas Keputusan Menteri Dalam Negeri Nomor 050-5889 Tahun 2021 tentang Hasil Verifikasi, Validasi, dan Inventarisasi Pemutakhiran Klasifikasi, Kodefikasi, dan Nomenklatur Perencanaan Pembangunan dan Keuangan Daerah.\n\n`;

  // Konteks sektoral — HANYA untuk urusan Pangan (2.09), supaya modul ini
  // tetap generik/aman dipakai OPD lain dgn regulasi_acuan 14_2026. Kalau
  // bidang urusannya beda, jatuh ke kalimat generik biasa di bawah.
  if (kodeBidangUrusan === '2.09') {
    bab1 += `Ketahanan pangan mempunyai peranan yang sangat penting dalam pembangunan bangsa karena pemenuhan pangan merupakan hak asasi setiap manusia. Selain itu, ketahanan pangan juga merupakan salah satu pilar ketahanan nasional suatu bangsa dan menunjukkan eksistensi kedaulatan bangsa. Ketahanan pangan tidak dapat terwujud hanya dengan melibatkan satu komponen bangsa, tetapi harus melibatkan seluruh komponen bangsa, baik pemerintah maupun masyarakat, secara sinergi.\n\n`;
    bab1 += `Hal ini dijabarkan dalam Undang-Undang Nomor 18 Tahun 2012 tentang Pangan, yang merumuskan ketahanan pangan sebagai kondisi terpenuhinya pangan bagi rumah tangga yang tercermin dari tersedianya pangan yang cukup, baik jumlah maupun mutunya, aman, halal, merata, dan terjangkau, serta menjadi tanggung jawab bersama antara pemerintah dan masyarakat. Amanat tersebut kemudian diperkuat melalui berbagai peraturan pelaksana, antara lain Peraturan Pemerintah Nomor 68 Tahun 2002 tentang Ketahanan Pangan dan Peraturan Pemerintah Nomor 17 Tahun 2015 tentang Ketahanan Pangan dan Gizi.\n\n`;
    bab1 += `Pada tataran nasional, kebijakan pembangunan periode 2025–2029 diarahkan melalui visi Presiden "Bersama Indonesia Maju, Menuju Indonesia Emas 2045", yang dijabarkan ke dalam delapan misi (Asta Cita). Pada sektor pembangunan ketahanan pangan, Asta Cita menitikberatkan pemantapan sistem pertahanan keamanan negara dan mendorong kemandirian bangsa melalui swasembada pangan, energi, air, ekonomi kreatif, ekonomi hijau, dan ekonomi biru. Renja ${namaOpd} Tahun ${tahun} disusun untuk turut menjabarkan arah kebijakan tersebut ke dalam program dan kegiatan operasional di Provinsi Maluku Utara.\n\n`;
  }

  bab1 += `1.2 Dasar Hukum\n\n`;
  bab1 += `Penyusunan Renja ${namaOpd} Tahun ${tahun} berlandaskan pada peraturan perundang-undangan sebagai berikut:\n\n`;
  if (landasanHukum.length > 0) {
    landasanHukum.forEach((r, i) => {
      const tanda = r.perlu_verifikasi ? ' [perlu verifikasi]' : '';
      bab1 += `${i + 1}. ${r.teksCetak()};${tanda}\n`;
    });
  } else {
    bab1 += `1. ......\n`;
    bab1 += `\nCatatan: daftar dasar hukum belum tersedia. Isi tabel renja_landasan_hukum lalu lakukan recall.\n`;
  }
  bab1 += `\n`;

  bab1 += `1.3 Maksud dan Tujuan\n\n`;
  bab1 += `Penyusunan Renja ${namaOpd} Tahun ${tahun} dimaksudkan sebagai pedoman operasional pelaksanaan program, kegiatan, dan subkegiatan ${namaOpd} pada Tahun ${tahun}, sekaligus sebagai instrumen pengendalian dan evaluasi kinerja serta media pertanggungjawaban publik atas perencanaan pembangunan bidang urusan yang menjadi kewenangan ${namaOpd}.\n\n`;
  bab1 += `Adapun tujuan penyusunan Renja ini adalah:\n`;
  bab1 += `1. Menyediakan dokumen perencanaan tahunan yang selaras dengan Renstra ${namaOpd} Tahun ${tahunAwal}–${tahunAkhir} dan RKPD Provinsi Maluku Utara Tahun ${tahun};\n`;
  bab1 += `2. Menetapkan target kinerja tahunan yang terukur sebagai dasar pengendalian dan evaluasi pelaksanaan program;\n`;
  bab1 += `3. Menjadi dasar penyusunan Rencana Kerja dan Anggaran (RKA) ${namaOpd} Tahun ${tahun};\n`;
  bab1 += `4. Menjamin kontribusi ${namaOpd} terhadap pencapaian prioritas pembangunan daerah dan nasional sesuai kesepakatan Rakortekbang Tahun 2026;\n`;
  bab1 += `5. Mengakomodasi aspirasi pemangku kepentingan melalui mekanisme musyawarah perencanaan pembangunan.\n\n`;

  bab1 += `1.4 Sistematika Penulisan\n\n`;
  bab1 += `Renja ${namaOpd} Tahun ${tahun} disusun dengan sistematika sebagai berikut:\n\n`;
  bab1 += `BAB I PENDAHULUAN, memuat latar belakang, dasar hukum, maksud dan tujuan, serta sistematika penulisan.\n\n`;
  bab1 += `BAB II HASIL EVALUASI RENJA PERANGKAT DAERAH TAHUN LALU, memuat evaluasi capaian kinerja bidang urusan berupa Indikator Kinerja Utama dan Indikator Kinerja Kunci Tahun ${tahunEvaluasi}, evaluasi capaian Standar Pelayanan Minimal (bagi bidang urusan terkait), rumusan permasalahan dan isu strategis Tahun ${tahun}, telaah pokok-pokok pikiran DPRD, serta inovasi bidang urusan.\n\n`;
  bab1 += `BAB III TUJUAN DAN SASARAN PERANGKAT DAERAH, memuat tujuan dan sasaran Renja Tahun ${tahun} yang selaras dengan Renstra, serta arah kebijakan.\n\n`;
  bab1 += `BAB IV RENCANA KERJA DAN PENDANAAN PERANGKAT DAERAH, memuat rencana program, kegiatan, dan subkegiatan Tahun ${tahun} beserta indikator, target, pagu indikatif, dan prakiraan maju.\n\n`;
  bab1 += `BAB V KINERJA PENYELENGGARAAN BIDANG URUSAN, memuat target Indikator Kinerja Utama dan Indikator Kinerja Kunci Tahun ${tahun}.\n\n`;
  bab1 += `BAB VI PENUTUP, memuat catatan penting, kaidah pelaksanaan, dan rencana tindak lanjut.\n`;

  // =========================================================================
  // BAB II — HASIL EVALUASI RENJA PERANGKAT DAERAH TAHUN LALU
  // =========================================================================
  let bab2 = `2.1 Evaluasi Capaian Kinerja Bidang Urusan Tahun ${tahunEvaluasi}\n\n`;
  bab2 += `Evaluasi capaian kinerja Tahun ${tahunEvaluasi} merupakan penilaian atas pelaksanaan Renja ${namaOpd} Tahun ${tahunEvaluasi} sekaligus capaian tahun pertama Renstra ${namaOpd} Tahun ${tahunAwal}–${tahunAkhir}. Pengukuran difokuskan pada Indikator Kinerja Utama (IKU) sebagai ukuran keberhasilan organisasi dan Indikator Kinerja Program sebagai penghubung antara capaian operasional dengan sasaran strategis.\n\n`;

  // --- Tabel 2.1 Capaian IKU (indikator level OPD, stage='iku') ---
  // Kolom Kode TIDAK DIHAPUS dari query/data (c.kode tetap dihitung di
  // ambilCapaianIkuIkk/renstraIkuIkkService.js), atas permintaan Bappeda
  // (2026-08-01) hanya disembunyikan dari tampilan generate PDF/Word — sama
  // seperti Tabel 2.2 IKK di bawah.
  bab2 += `Tabel 2.1 Capaian Indikator Kinerja Utama (IKU) ${namaOpd} Tahun ${tahunEvaluasi}\n\n`;
  bab2 += `| No | Indikator Kinerja Utama | Satuan | Target | Realisasi | Capaian (%) | Status |\n`;
  bab2 += `|---|---|---|---|---|---|---|\n`;
  if (capaianIkuBaru.length > 0) {
    capaianIkuBaru.forEach((c, i) => {
      bab2 += `| ${i + 1} | ${sanitizeCell(c.nama)} | ${sanitizeCell(c.satuan)} | ${c.targetFmt ?? '......'} | ${c.realisasiFmt ?? '......'} | ${c.pct === null ? '......' : c.pct} | ${c.status || '......'} |\n`;
    });
  } else {
    bab2 += `| 1 | ...... | ...... | ...... | ...... | ...... | ...... |\n`;
  }
  bab2 += `\nSumber: ${namaOpd} Tahun ${tahunEvaluasi}.\n\n`;
  if (capaianIkuBaru.length > 0) {
    bab2 += capaianIkuBaru.map((c) => c.narasi).join('\n\n');
    bab2 += '\n\n';
    const contohIku = capaianIkuBaru[0];
    if (contohIku?.definisiOperasional) {
      const kutipan = ringkasParagraf(contohIku.definisiOperasional);
      const akhiran = /[.!?…]$/.test(kutipan) ? '' : '.';
      bab2 += `Sebagai acuan metodologi pengukuran, indikator ${sanitizeCell(contohIku.nama)} didefinisikan sebagai ${kutipan}${akhiran}\n\n`;
    }
  }

  // --- Tabel 2.2 Capaian IKK (indikator level OPD, stage='ikk') ---
  // Kolom Kode TIDAK DIHAPUS dari query/data (c.kode tetap dihitung di
  // ambilCapaianIkuIkk/renstraIkuIkkService.js), atas permintaan Bappeda
  // (2026-08-01) hanya disembunyikan dari tampilan generate PDF/Word —
  // sama seperti pola TAMPILKAN_* lain di file ini.
  bab2 += `Tabel 2.2 Capaian Indikator Kinerja Kunci (IKK) ${namaOpd} Tahun ${tahunEvaluasi}\n\n`;
  bab2 += `| No | Indikator Kinerja Kunci | Satuan | Target | Realisasi | Capaian (%) | Status |\n`;
  bab2 += `|---|---|---|---|---|---|---|\n`;
  if (capaianIkk.length > 0) {
    capaianIkk.forEach((c, i) => {
      bab2 += `| ${i + 1} | ${sanitizeCell(c.nama)} | ${sanitizeCell(c.satuan)} | ${c.targetFmt ?? '......'} | ${c.realisasiFmt ?? '......'} | ${c.pct === null ? '......' : c.pct} | ${c.status || '......'} |\n`;
    });
  } else {
    bab2 += `| 1 | ...... | ...... | ...... | ...... | ...... | ...... |\n`;
  }
  bab2 += `\nSumber: ${namaOpd} Tahun ${tahunEvaluasi}.\n\n`;
  if (capaianIkk.length > 0) {
    bab2 += capaianIkk.map((c) => c.narasi).join('\n\n');
    bab2 += '\n\n';
  }

  // --- Tabel 2.3 Indeks Ketahanan Pangan (IKP) per Kabupaten/Kota — rincian
  // kewilayahan permintaan Bappeda (2026-08-01), lihat komentar konstanta
  // IKP_KABUPATEN_KOTA_MALUT. Hanya tampil untuk bidang urusan Pangan (2.09)
  // karena datanya spesifik ketahanan pangan — CATATAN: karena tabel ini
  // bernomor tetap "2.3" (bukan dihitung dinamis), dokumen untuk bidang
  // urusan LAIN yang memakai modul generik ini (kodeBidangUrusan !== '2.09')
  // akan meloncat dari Tabel 2.2 langsung ke Tabel 2.4 (Rekapitulasi Evaluasi)
  // tanpa Tabel 2.3 — modul ini saat ditulis (2026-08-01) memang khusus
  // dipakai Dinas Pangan; kalau kelak dipakai OPD lain, nomor tabel Bab II
  // perlu dihitung dinamis (counter), bukan string statis seperti sekarang.
  if (kodeBidangUrusan === '2.09') {
    bab2 += `Tabel 2.3 Indeks Ketahanan Pangan (IKP) Kabupaten/Kota se-Provinsi Maluku Utara Tahun 2022–2023\n\n`;
    bab2 += `| No | Kabupaten/Kota | Ketersediaan 2023 | Keterjangkauan 2023 | Pemanfaatan 2023 | Komposit 2022 | Komposit 2023 | Peringkat Nasional |\n`;
    bab2 += `|---|---|---|---|---|---|---|---|\n`;
    IKP_KABUPATEN_KOTA_MALUT.forEach((k, i) => {
      const ket = k.ketersediaan2023 === null ? '–' : k.ketersediaan2023.toFixed(2).replace('.', ',');
      bab2 += `| ${i + 1} | ${k.nama} | ${ket} | ${k.keterjangkauan2023.toFixed(2).replace('.', ',')} | ${k.pemanfaatan2023.toFixed(2).replace('.', ',')} | ${k.komposit2022.toFixed(2).replace('.', ',')} | ${k.komposit2023.toFixed(2).replace('.', ',')} | ${k.peringkat} dari ${k.dari} ${k.kategori} |\n`;
    });
    bab2 += `\nSumber: Badan Pangan Nasional (Bapanas), publikasi Indeks Ketahanan Pangan Tahun 2023 (data.badanpangan.go.id). Kategori kota (Ternate, Tidore Kepulauan) tidak memiliki sub-indeks Ketersediaan karena wilayah kota bukan sentra produksi pangan sesuai metodologi Bapanas. Data ini merupakan indikator eksternal yang bersifat kewilayahan, bukan salah satu baris IKK resmi Renstra ${namaOpd}, dan disajikan untuk memperkuat konteks analisis faktor pendorong dan faktor penghambat pada Tabel 2.2.\n\n`;

    const rendah = IKP_KABUPATEN_KOTA_MALUT.filter((k) => k.komposit2023 < 60);
    const tinggi = IKP_KABUPATEN_KOTA_MALUT.filter((k) => k.komposit2023 >= 75);
    bab2 += `Dari 10 kabupaten/kota se-Provinsi Maluku Utara, ${tinggi.length} wilayah (${tinggi.map((k) => k.nama).join(', ')}) mencatatkan IKP komposit relatif tinggi (≥ 75), sedangkan ${rendah.length} wilayah (${rendah.map((k) => k.nama).join(', ')}) masih berada pada kategori rentan (skor komposit di bawah 60), dengan sub-indeks Ketersediaan sebagai komponen utama yang tertinggal di sebagian besar kabupaten kepulauan. Kesenjangan antarwilayah ini memperkuat identifikasi faktor penghambat pada capaian IKK ketahanan pangan Tahun ${tahunEvaluasi} di atas, terutama terkait kendala produksi dan distribusi pangan pada wilayah kepulauan yang secara geografis lebih terisolasi, dan menjadi salah satu dasar penajaman lokasi intervensi program/kegiatan ${namaOpd} pada tahun berikutnya.\n\n`;

    const ipmRendah = [...IKP_KABUPATEN_KOTA_MALUT].sort((a, b) => a.ipm2023 - b.ipm2023).slice(0, 3);
    bab2 += `Sebagai konteks tambahan, data Indeks Pembangunan Manusia (IPM) BPS Provinsi Maluku Utara Tahun 2023 menunjukkan bahwa 3 wilayah dengan IPM terendah (${ipmRendah.map((k) => `${k.nama} ${k.ipm2023.toFixed(2).replace('.', ',')}`).join(', ')}) sebagian besar juga termasuk wilayah dengan IKP komposit rendah pada Tabel di atas, mengindikasikan keterkaitan antara kondisi sosial-ekonomi wilayah dengan ketahanan pangan setempat. Data IPM ini bersifat makro-sosial (bukan sub-indeks IKP maupun IKK resmi Dinas Pangan) dan disajikan semata sebagai konteks pendukung analisis kewilayahan.\n\n`;
  }

  // --- Ringkasan capaian IKU+IKK, dipakai jadi dasar 2.3 Isu Strategis & 2.6 Rekomendasi ---
  const semuaCapaian = [...capaianIkuBaru, ...capaianIkk];
  const gagal = semuaCapaian.filter((c) => c.status === 'Belum Tercapai');
  const lampaui = semuaCapaian.filter((c) => c.pct !== null && c.pct > 100);
  const tercapai = semuaCapaian.filter((c) => c.status === 'Tercapai' && c.pct <= 100);
  if (semuaCapaian.length > 0) {
    bab2 += `Secara ringkas, dari ${semuaCapaian.length} Indikator Kinerja Utama dan Kunci yang dievaluasi, ${lampaui.length} indikator melampaui target, ${tercapai.length} indikator tepat mencapai target, ${semuaCapaian.filter((c) => c.status === 'Hampir Tercapai').length} indikator hampir mencapai target, dan ${gagal.length} indikator belum mencapai target — rincian sebab-akibat per indikator diuraikan pada narasi masing-masing tabel di atas.\n\n`;
    bab2 += narasiFaktorPendorongPenghambat(semuaCapaian);

    // --- Implikasi terhadap Penyusunan Renja — pola sama seperti Faktor
    // Pendukung/Penghambat di atas: mengikuti gaya dokumen Renja Badan
    // Pendapatan Daerah yang dijadikan acuan Bappeda (2026-08-01). ---
    const rataPct = (list) => {
      const ada = list.filter((c) => c.pct !== null && c.pct !== undefined);
      return ada.length > 0 ? Math.round(ada.reduce((s, c) => s + c.pct, 0) / ada.length) : null;
    };
    const rataIku = rataPct(capaianIkuBaru);
    const rataIkk = rataPct(capaianIkk);
    const belumHampir = gagal.length + semuaCapaian.filter((c) => c.status === 'Hampir Tercapai').length;

    bab2 += `Implikasi terhadap Penyusunan Renja Tahun ${tahun}\n\n`;
    bab2 += `Hasil evaluasi capaian kinerja Tahun ${tahunEvaluasi} menjadi dasar penyusunan kebijakan dan program prioritas dalam Renja Tahun ${tahun}. Arah kebijakan difokuskan pada:\n`;
    bab2 += `1. Percepatan pencapaian ${belumHampir} indikator yang belum atau hampir mencapai target melalui penguatan monitoring dan evaluasi pelaksanaan program;\n`;
    bab2 += `2. Mempertahankan efektivitas pelaksanaan pada ${tercapai.length + lampaui.length} indikator yang telah mencapai atau melampaui target sebagai modal keberlanjutan kinerja;\n`;
    bab2 += kodeBidangUrusan === '2.09'
      ? `3. Penguatan koordinasi dengan kabupaten/kota, khususnya wilayah dengan Indeks Ketahanan Pangan relatif rendah sebagaimana Tabel 2.3, dalam rangka pemerataan ketahanan pangan antarwilayah;\n4. Penguatan kualitas data dan pelaporan kinerja sebagai dasar perencanaan berbasis bukti.\n\n`
      : `3. Penguatan kualitas data dan pelaporan kinerja sebagai dasar perencanaan berbasis bukti.\n\n`;
    if (rataIku !== null || rataIkk !== null) {
      bab2 += `Dengan capaian IKU rata-rata sebesar ${rataIku !== null ? `${rataIku}%` : 'belum tersedia'} dan capaian IKK rata-rata sebesar ${rataIkk !== null ? `${rataIkk}%` : 'belum tersedia'} terhadap target Tahun ${tahunEvaluasi}, hasil evaluasi ini menjadi dasar penyusunan target dan pendanaan program pada Renja Tahun ${tahun}.\n\n`;
    }
  }

  // --- Tabel 2.3 Capaian Indikator Program (disembunyikan atas permintaan
  // Bappeda 2026-08-01, lihat TAMPILKAN_TABEL_2_3_CAPAIAN_PROGRAM). PERHATIAN
  // kalau flag ini diaktifkan kembali: nomornya akan bentrok dengan Tabel 2.3
  // Indeks Ketahanan Pangan kab/kota (di atas, khusus bidang urusan Pangan) —
  // beri nomor lain (mis. 2.3b atau geser ke 2.9) sebelum mengaktifkan lagi. ---
  if (TAMPILKAN_TABEL_2_3_CAPAIAN_PROGRAM) {
    bab2 += `Tabel 2.3 Capaian Indikator Kinerja Program ${namaOpd} Tahun ${tahunEvaluasi}\n\n`;
    bab2 += `| No | Program | Indikator Kinerja Program (outcome) | Satuan | Target ${tahunEvaluasi} | Realisasi ${tahunEvaluasi} |\n`;
    bab2 += `|---|---|---|---|---|---|\n`;
    const capaianProgram = [];
    if (indikatorProgram.length > 0) {
      for (let i = 0; i < indikatorProgram.length; i++) {
        const ir = indikatorProgram[i];
        const target = pilihTargetTahun(ir, tahunEvaluasi, tahunAwal);
        const realisasi = await ambilRealisasi(ir.id, tahunEvaluasi);
        capaianProgram.push({ program: ir.nama_program, realisasi });
        bab2 += `| ${i + 1} | ${sanitizeCell(ir.nama_program)} | ${sanitizeCell(ir.nama_indikator)} | ${sanitizeCell(ir.satuan)} | ${angkaId(target)} | ${angkaId(realisasi)} |\n`;
      }
    } else {
      bab2 += `| 1 | ...... | ...... | ...... | ...... | ...... |\n`;
    }
    bab2 += `\nSumber: ${namaOpd} Tahun ${tahunEvaluasi}.\n\n`;
    if (capaianProgram.length > 0) {
      const adaRealisasi = capaianProgram.filter((c) => c.realisasi !== null).length;
      bab2 += `Dari ${capaianProgram.length} indikator kinerja program yang dipantau, sebanyak ${adaRealisasi} indikator telah memiliki data realisasi Tahun ${tahunEvaluasi}`;
      bab2 += adaRealisasi < capaianProgram.length
        ? `, sedangkan ${capaianProgram.length - adaRealisasi} indikator lainnya belum terlaporkan sehingga perlu menjadi perhatian dalam penguatan sistem pelaporan kinerja program.\n\n`
        : `, sehingga seluruh indikator kinerja program telah terpantau lengkap pada tahun evaluasi ini.\n\n`;
    }
  }

  // --- Tabel 2.4 Rekapitulasi Evaluasi (T-C.29, 11 kolom) — nomor lama 2.4→2.3
  // (Capaian Indikator Program disembunyikan), lalu →2.4 lagi setelah Tabel 2.3
  // Indeks Ketahanan Pangan kab/kota disisipkan (khusus bidang urusan Pangan) ---
  bab2 += `Tabel 2.4 Rekapitulasi Evaluasi Hasil Pelaksanaan Renja ${namaOpd}\n\n`;
  try {
    const t23 = await buildTabel21Rows(db, dokumenId);
    bab2 += `| Kode | Urusan/Bidang Urusan/Program/Kegiatan | Indikator Kinerja | Target Renstra ${tahun} | Realisasi s/d ${t23.tahunN3} | Target Renja ${t23.tahunN2} | Realisasi Renja ${t23.tahunN2} | Tingkat Realisasi (%) | Target Renja ${t23.tahunN1} | Realisasi s/d Tahun Berjalan | Tingkat Capaian Renstra (%) |\n`;
    bab2 += `|---|---|---|---|---|---|---|---|---|---|---|\n`;
    for (const r of t23.rows) {
      bab2 += `| ${sanitizeCell(r.kode)} | ${sanitizeCell(r.nama)} | ${sanitizeCell(r.indikator)} | ${sanitizeCell(r.targetRenstra)} | ${sanitizeCell(r.realisasiN3)} | ${sanitizeCell(r.targetN2)} | ${sanitizeCell(r.realisasiN2)} | ${sanitizeCell(r.tingkatRealisasi)} | ${sanitizeCell(r.targetN1)} | ${sanitizeCell(r.realisasiCapaianN1)} | ${sanitizeCell(r.tingkatCapaianRenstra)} |\n`;
    }
    bab2 += `\nSumber: ${namaOpd} Tahun ${t23.tahunN2}–${t23.tahunN1}.\n\n`;
    bab2 += `Tabel di atas menyajikan ${t23.rows.length} baris hierarki Urusan/Program/Kegiatan yang menautkan target Renstra dengan realisasi tahun berjalan secara berjenjang, sehingga tingkat realisasi tiap tingkatan dapat ditelusuri konsistensinya terhadap capaian Tahun ${t23.tahunN2} dan proyeksi Tahun ${t23.tahunN1}. Ketidaksesuaian tingkat realisasi antartingkat, bila ditemukan, menjadi indikasi perlunya pemutakhiran data pada tingkat yang bersangkutan.\n\n`;
  } catch {
    bab2 += `| ...... | ...... | ...... | ...... | ...... | ...... | ...... | ...... | ...... | ...... | ...... |\n`;
    bab2 += `\nSumber: ${namaOpd} Tahun ${tahun}.\n\n`;
  }

  // --- Tabel 2.5 Pencapaian Kinerja Pelayanan (SPM & IKK melebur), nomor lama 2.4 ---
  bab2 += `Tabel 2.5 Pencapaian Kinerja Pelayanan ${namaOpd}\n\n`;
  const thnKolom = [tahunAwal, tahunAwal + 1, tahunAwal + 2, tahunAwal + 3, tahunAwal + 4];
  bab2 += `| No | Indikator | SPM/Standar Nasional | IKK | ${thnKolom.map((t) => `Target ${t}`).join(' | ')} | ${thnKolom.slice(0, 4).map((t) => `Realisasi/Proyeksi ${t}`).join(' | ')} | Catatan Analisis |\n`;
  bab2 += `|${'---|'.repeat(4 + thnKolom.length + 4 + 1)}\n`;
  if (indikatorSasaran.length > 0) {
    for (let i = 0; i < indikatorSasaran.length; i++) {
      const ir = indikatorSasaran[i];
      const targets = thnKolom.map((t) => angkaId(pilihTargetTahun(ir, t, tahunAwal)));
      const realisasi = [];
      for (const t of thnKolom.slice(0, 4)) {
        const r = await ambilRealisasi(ir.id, t);
        realisasi.push(r === null ? angkaId(pilihTargetTahun(ir, t, tahunAwal)) : angkaId(r));
      }
      bab2 += `| ${i + 1} | ${sanitizeCell(ir.nama_indikator)} | ${urusanSpm ? 'Ya' : '–'} | ${sanitizeCell(ir.nama_indikator)} | ${targets.join(' | ')} | ${realisasi.join(' | ')} | Sesuai Renstra |\n`;
    }
  } else {
    const kosongKolom = Array(thnKolom.length + 4).fill('......').join(' | ');
    bab2 += `| 1 | ...... | ${urusanSpm ? 'Ya' : '–'} | ...... | ${kosongKolom} | ...... |\n`;
  }
  bab2 += `\nSumber: ${namaOpd} Tahun ${tahunAwal}–${tahunAwal + 3}.\n\n`;
  // Penjelasan kolom SPM ("Ya"/"–") DIPINDAHKAN ke subbab 2.2 Evaluasi Capaian
  // SPM di bawah (permintaan Bappeda 2026-08-01) supaya tidak terpisah jadi
  // catatan kaki pendek di sini — pembahasannya sekarang lebih lengkap di sana.

  // --- Realisasi anggaran tahun evaluasi ---
  if (lkRows.length > 0) {
    const programMap = new Map();
    lkRows.forEach((row) => {
      const key = row.program || '......';
      const cur = programMap.get(key) || { anggaran: 0, realisasi: 0 };
      cur.anggaran += Number(row.anggaran) || 0;
      cur.realisasi += Number(row.realisasi) || 0;
      programMap.set(key, cur);
    });
    const agg = [...programMap.entries()].map(([program, v]) => ({
      program,
      ...v,
      pct: v.anggaran > 0 ? ((v.realisasi / v.anggaran) * 100).toFixed(2) : '0.00',
    }));
    const totA = agg.reduce((s, r) => s + r.anggaran, 0);
    const totR = agg.reduce((s, r) => s + r.realisasi, 0);

    bab2 += `Tabel 2.6 Realisasi Anggaran ${namaOpd} Tahun ${tahunEvaluasi}\n\n`;
    bab2 += `| No | Program | Anggaran (Rp) | Realisasi (Rp) | % | Sisa (Rp) |\n`;
    bab2 += `|---|---|---|---|---|---|\n`;
    agg.forEach((r, i) => {
      bab2 += `| ${i + 1} | ${sanitizeCell(r.program)} | ${rupiah(r.anggaran)} | ${rupiah(r.realisasi)} | ${r.pct}% | ${rupiah(r.anggaran - r.realisasi)} |\n`;
    });
    const pctTotal = totA > 0 ? (totR / totA) * 100 : 0;
    bab2 += `| | Total | ${rupiah(totA)} | ${rupiah(totR)} | ${pctTotal.toFixed(2)}% | ${rupiah(totA - totR)} |\n\n`;
    bab2 += `Sumber: ${namaOpd} Tahun ${tahunEvaluasi}.\n\n`;

    const urutRealisasi = [...agg].sort((a, b) => Number(b.pct) - Number(a.pct));
    const tertinggi = urutRealisasi[0];
    const terendah = urutRealisasi[urutRealisasi.length - 1];
    bab2 += `Secara keseluruhan, realisasi anggaran ${namaOpd} Tahun ${tahunEvaluasi} mencapai ${pctTotal.toFixed(2)} persen dari total pagu ${rupiah(totA)}, dengan sisa anggaran sebesar ${rupiah(totA - totR)}.`;
    if (agg.length > 1 && tertinggi && terendah && tertinggi.program !== terendah.program) {
      bab2 += ` Realisasi tertinggi dicapai oleh program ${sanitizeCell(tertinggi.program)} (${tertinggi.pct}%), sedangkan realisasi terendah pada program ${sanitizeCell(terendah.program)} (${terendah.pct}%), yang perlu ditelaah penyebabnya sebagai bahan perbaikan pelaksanaan Tahun ${tahun}.\n\n`;
    } else {
      bab2 += '\n\n';
    }
  }

  // --- 2.2 Evaluasi Capaian SPM — sempat disembunyikan atas permintaan
  // Bappeda 2026-08-01 (lihat TAMPILKAN_SUBBAB_EVALUASI_SPM), DIMINTA
  // DITAMPILKAN KEMBALI oleh Bappeda pada putaran review berikutnya
  // (2026-08-01, catatan susulan) dengan judul mengikuti format Permendagri
  // 14/2026 "(bagi bidang urusan terkait)". Narasi kolom SPM "Ya"/"–" yang
  // dulu jadi catatan kaki di bawah Tabel 2.5 kini dipindah & diperluas ke
  // sini sesuai permintaan Bappeda. ---
  if (TAMPILKAN_SUBBAB_EVALUASI_SPM) {
    bab2 += `2.2 Evaluasi Capaian SPM Tahun ${tahun - 4}–${tahunEvaluasi} (bagi bidang urusan terkait)\n\n`;
    if (urusanSpm) {
      bab2 += `Bidang urusan ${urusanSpm} termasuk urusan pemerintahan wajib yang berkaitan dengan pelayanan dasar sebagaimana Peraturan Pemerintah Nomor 2 Tahun 2018 tentang Standar Pelayanan Minimal (SPM), sehingga ${namaOpd} wajib menyajikan evaluasi capaian SPM Tahun ${tahun - 4}–${tahunEvaluasi}. Kolom SPM diisi "Ya" pada Tabel 2.5 Pencapaian Kinerja Pelayanan sebagaimana diuraikan pada subbab 2.1, karena capaian kinerja pelayanan pada tabel tersebut turut menjadi acuan evaluasi capaian SPM.\n\n`;
      bab2 += `| No | Jenis Pelayanan Dasar | Indikator SPM | Satuan | Target | Realisasi ${tahun - 4} | Realisasi ${tahun - 3} | Realisasi ${tahunEvaluasi} |\n`;
      bab2 += `|---|---|---|---|---|---|---|---|\n`;
      bab2 += `| 1 | ...... | ...... | ...... | 100% | ...... | ...... | ...... |\n\n`;
    } else {
      const namaUrusan = NAMA_BIDANG_URUSAN_UMUM[kodeBidangUrusan];
      const sebutanUrusan = namaUrusan
        ? `Bidang ${namaUrusan} dengan Kode ${kodeBidangUrusan}`
        : `bidang urusan dengan Kode ${kodeBidangUrusan || '......'}`;
      bab2 += `Peraturan Pemerintah Nomor 2 Tahun 2018 tentang Standar Pelayanan Minimal menetapkan bahwa urusan pemerintahan wajib yang berkaitan dengan pelayanan dasar dan wajib dievaluasi capaian SPM-nya mencakup 6 (enam) bidang, yaitu pendidikan, kesehatan, pekerjaan umum dan penataan ruang, perumahan rakyat dan kawasan permukiman, ketenteraman, ketertiban umum, dan perlindungan masyarakat, serta sosial. Keenam bidang tersebut ditetapkan sebagai standar minimal pelayanan dasar yang wajib dipenuhi Pemerintah Daerah kepada seluruh warga negara, dengan target capaian 100% (seratus persen) setiap tahunnya.\n\n`;
      bab2 += `${sebutanUrusan} tidak termasuk dalam keenam bidang urusan wajib pelayanan dasar tersebut, sehingga evaluasi capaian Standar Pelayanan Minimal Tahun ${tahun - 4}–${tahunEvaluasi} tidak berlaku bagi ${namaOpd}. Oleh karena itu, kolom SPM diisi "–" pada Tabel 2.5 Pencapaian Kinerja Pelayanan sebagaimana diuraikan pada subbab 2.1, sehingga proyeksi 5 (lima) tahun pada tabel tersebut semata-mata mengikuti target Renstra ${namaOpd} Tahun ${tahunAwal}–${tahunAkhir} tanpa kewajiban pemenuhan standar nasional.\n\n`;
      bab2 += `Meskipun tidak termasuk urusan wajib pelayanan dasar, pelaksanaan program dan kegiatan ${namaOpd} tetap memiliki keterkaitan tidak langsung dengan sejumlah bidang SPM di atas — misalnya kontribusi terhadap penanganan kerawanan pangan dan bantuan pangan yang beririsan dengan urusan Sosial (penanganan Penyandang Masalah Kesejahteraan Sosial), serta pemenuhan konsumsi energi dan protein per kapita yang beririsan dengan pencapaian target gizi masyarakat pada urusan Kesehatan. Keterkaitan ini bersifat mendukung (crosscutting), bukan kewajiban pelaporan SPM, sehingga akuntabilitas kinerja ${namaOpd} tetap diukur melalui capaian Indikator Kinerja Utama dan Indikator Kinerja Kunci sebagaimana diuraikan pada subbab 2.1 dan Bab V, bukan melalui standar dan indikator SPM.\n\n`;
    }
  }

  // --- 2.3 Rumusan Permasalahan dan Isu Strategis (nomor lama: 2.2, digeser
  // lagi setelah subbab 2.2 Evaluasi SPM ditampilkan kembali) ---
  bab2 += `2.3 Rumusan Permasalahan dan Isu Strategis Tahun ${tahun}\n\n`;
  bab2 += `Rumusan permasalahan dan isu strategis Tahun ${tahun} disusun berdasarkan Renstra ${namaOpd} Tahun ${tahunAwal}–${tahunAkhir}, RKPD Provinsi Maluku Utara Tahun ${tahun}, hasil evaluasi Renja Tahun ${tahunEvaluasi} sebagaimana diuraikan pada subbab 2.1, serta kondisi lingkungan strategis yang dinamis.\n\n`;

  if (gagal.length > 0) {
    bab2 += `Permasalahan utama yang teridentifikasi dari hasil evaluasi adalah belum tercapainya ${gagal.length} indikator kinerja, yaitu ${gagal.map((c) => sanitizeCell(c.nama)).join(', ')}. Permasalahan ini menjadi titik tolak perumusan isu strategis Tahun ${tahun}.\n\n`;
  }

  if (outcomeAstaCita.length > 0) {
    bab2 += `Pada tataran nasional, kesepakatan Rakortekbang Tahun 2026 menempatkan bidang urusan yang menjadi kewenangan ${namaOpd} sebagai pengampu outcome prioritas dalam mendukung Asta Cita, yaitu ${[...new Set(outcomeAstaCita.map((o) => o.outcome_prioritas).filter(Boolean))].join('; ')}, dengan indikator ${[...new Set(outcomeAstaCita.map((o) => o.indikator).filter(Boolean))].join('; ')}. Keselarasan terhadap outcome tersebut menjadi isu strategis yang harus dijawab pada Tahun ${tahun}.\n\n`;
  }

  if (dukunganProSn.length > 0) {
    const proSnNama = [...new Set(dukunganProSn.filter((d) => d.jenis === 'pro_sn').map((d) => d.pro_sn).filter(Boolean))];
    const tematikNama = [...new Set(dukunganProSn.filter((d) => d.jenis === 'tematik').map((d) => d.tematik_pembangunan).filter(Boolean))];
    if (proSnNama.length > 0) {
      bab2 += `Selain itu, ${namaOpd} berperan mendukung Program Strategis Nasional pada kelompok ${proSnNama.join(', ')} melalui ${dukunganProSn.filter((d) => d.jenis === 'pro_sn').length} subkegiatan yang tercantum dalam Tabel C-2 Lampiran Permendagri Nomor 14 Tahun 2026`;
      bab2 += dukunganTerakomodasi.length > 0
        ? `, dan sebanyak ${dukunganTerakomodasi.length} di antaranya telah diakomodasi dalam rencana kerja Tahun ${tahun}.\n\n`
        : `, yang perlu diakomodasi dalam rencana kerja Tahun ${tahun}.\n\n`;
    }
    if (tematikNama.length > 0) {
      bab2 += `${namaOpd} juga menjadi pengampu program tematik pembangunan ${tematikNama.join(', ')} sebagaimana Tabel C-3 lampiran yang sama.\n\n`;
    }
  }

  // Isu strategis struktural sektor Pangan — sama seperti konteks 1.1 di
  // atas, HANYA untuk urusan Pangan (2.09) supaya modul tetap generik utk
  // OPD lain. Enam tema ini adalah isu klasik ketahanan pangan daerah
  // kepulauan (bukan spesifik satu tahun evaluasi), melengkapi permasalahan
  // operasional dari hasil evaluasi capaian di atas.
  if (kodeBidangUrusan === '2.09') {
    bab2 += `Selain permasalahan operasional yang teridentifikasi dari hasil evaluasi capaian kinerja di atas, terdapat pula isu strategis struktural sektor ketahanan pangan yang bersifat jangka menengah-panjang dan perlu terus dikawal dalam perumusan program dan kegiatan ${namaOpd}, yaitu:\n\n`;
    bab2 += `1. Pengendalian alih fungsi lahan pertanian ke non-pertanian. Alih fungsi lahan pertanian merupakan ancaman terhadap pencapaian ketahanan dan kedaulatan pangan, dengan implikasi serius terhadap produksi pangan, lingkungan fisik, serta kesejahteraan masyarakat pertanian dan perdesaan yang kehidupannya bergantung pada lahan tersebut. Di sisi lain, pemenuhan kebutuhan pangan masyarakat yang terus meningkat seiring pertambahan penduduk memerlukan diversifikasi pemanfaatan pangan lokal sebagai pengganti pangan pokok beras.\n\n`;
    bab2 += `2. Diversifikasi pangan lokal sebagai bahan pangan alternatif. Sumber pangan lokal yang tersebar di seluruh wilayah Provinsi Maluku Utara merupakan potensi besar untuk dikelola sebagai bahan pangan alternatif, mengingat ketersediaan beras sebagai bahan pokok tidak selalu dapat mengimbangi kebutuhan masyarakat.\n\n`;
    bab2 += `3. Penanganan kerawanan pangan pada wilayah kepulauan. Kondisi kepulauan Maluku Utara, ditambah kemiskinan, keterbatasan infrastruktur dasar perdesaan, dan potensi bencana alam, meningkatkan risiko kerawanan pangan pada sejumlah kabupaten/kota. Penanganannya memerlukan ketersediaan cadangan pangan pemerintah provinsi/kabupaten/kota yang memadai, serta memperhatikan perbedaan aspirasi, kebutuhan, dan permasalahan antara perempuan dan laki-laki agar kesenjangan akses terhadap program penanganan kerawanan pangan dapat dikurangi.\n\n`;
    bab2 += `4. Stabilisasi pasokan, harga, dan distribusi pangan antarpulau. Stabilitas pasokan dan harga merupakan indikator kinerja sistem distribusi. Karakteristik geografis kepulauan Maluku Utara membuat distribusi pangan sangat bergantung pada sarana dan prasarana transportasi laut; gangguan cuaca maupun keterbatasan infrastruktur pelabuhan dapat memperpanjang waktu tempuh, meningkatkan ongkos angkut, serta berisiko merusak bahan pangan segar, yang pada akhirnya mendorong kenaikan harga pangan dan tekanan inflasi daerah.\n\n`;
    bab2 += `5. Peningkatan penganekaragaman konsumsi pangan masyarakat. Kualitas dan kuantitas konsumsi pangan sebagian masyarakat masih perlu ditingkatkan, sebagaimana ditunjukkan oleh capaian Skor Pola Pangan Harapan (PPH). Kondisi ini tidak terlepas dari keterbatasan ekonomi, pengetahuan, dan kesadaran gizi masyarakat, kecenderungan konsumsi berbahan baku lokal yang belum optimal, serta berkembangnya globalisasi industri pangan siap saji berbasis impor.\n\n`;
    bab2 += `6. Pengawasan dan pembinaan keamanan pangan segar. Peredaran pangan yang tidak aman akibat cemaran biologi, fisik, maupun penggunaan bahan kimia berlebihan atau dilarang, serta masih ditemukannya pangan kedaluwarsa di masyarakat, menuntut penguatan fungsi pengawasan dan pembinaan keamanan pangan segar asal tumbuhan secara berkelanjutan.\n\n`;
  }

  bab2 += `Berdasarkan uraian tersebut, isu strategis ${namaOpd} Tahun ${tahun} difokuskan pada:\n`;
  bab2 += `1. Percepatan pencapaian indikator kinerja yang belum memenuhi target pada Tahun ${tahunEvaluasi};\n`;
  bab2 += `2. Penyelarasan program dan kegiatan dengan outcome prioritas nasional hasil kesepakatan Rakortekbang Tahun 2026;\n`;
  bab2 += `3. Penguatan kualitas data dan pelaporan kinerja sebagai dasar perencanaan berbasis bukti;\n`;
  bab2 += `4. Optimalisasi pemanfaatan pagu indikatif di tengah keterbatasan kapasitas fiskal daerah`;
  bab2 += kodeBidangUrusan === '2.09'
    ? `;\n5. Penanganan isu struktural jangka menengah-panjang sebagaimana diuraikan di atas (alih fungsi lahan, diversifikasi pangan lokal, kerawanan pangan, stabilisasi distribusi antarpulau, penganekaragaman konsumsi, dan keamanan pangan segar).\n\n`
    : `.\n\n`;

  // --- 2.4 Telaah Pokok-Pokok Pikiran DPRD (nomor lama 2.3) ---
  bab2 += `2.4 Telaah Pokok-Pokok Pikiran DPRD\n\n`;
  bab2 += `Pokok-pokok pikiran DPRD merupakan hasil reses dan kunjungan kerja anggota DPRD ke daerah pemilihan yang memuat aspirasi masyarakat, dan menjadi bahan pertimbangan dalam perumusan program dan kegiatan pembangunan daerah sesuai ketentuan peraturan perundang-undangan.\n\n`;
  if (pokirRows.length > 0) {
    const totalNilai = pokirRows.reduce((s, p) => s + (Number(p.nilai_usulan_anggaran) || 0), 0);
    const terakomodasi = pokirRows.filter((p) => p.program_kegiatan_terkait).length;
    bab2 += `Berdasarkan hasil penelaahan, terdapat ${pokirRows.length} usulan pokok-pokok pikiran DPRD yang berkaitan dengan tugas dan fungsi ${namaOpd} pada Tahun ${tahun} dengan total nilai usulan sebesar ${rupiah(totalNilai)}, dan sebanyak ${terakomodasi} usulan telah dapat dipetakan ke program/kegiatan terkait.\n\n`;
    bab2 += `Tabel 2.7 Telaah Pokok-Pokok Pikiran DPRD Tahun ${tahun}\n\n`;
    bab2 += `| No | Anggota DPRD | Daerah Pemilihan | Usulan | Lokasi | Program/Kegiatan Terkait | Nilai Usulan (Rp) |\n`;
    bab2 += `|---|---|---|---|---|---|---|\n`;
    pokirRows.forEach((p, i) => {
      bab2 += `| ${i + 1} | ${sanitizeCell(p.nama_anggota_dprd)} | ${sanitizeCell(p.dapil)} | ${sanitizeCell(p.usulan)} | ${sanitizeCell(p.lokasi)} | ${sanitizeCell(p.program_kegiatan_terkait)} | ${rupiah(p.nilai_usulan_anggaran)} |\n`;
    });
    bab2 += `| | | | | | Total | ${rupiah(totalNilai)} |\n\n`;
    bab2 += `Sumber: ${namaOpd} Tahun ${tahun}.\n\n`;
    const belumDipetakan = pokirRows.length - terakomodasi;
    bab2 += belumDipetakan > 0
      ? `Dari ${pokirRows.length} usulan pada tabel di atas, ${terakomodasi} usulan (${((terakomodasi / pokirRows.length) * 100).toFixed(0)} persen) telah terpetakan ke program/kegiatan yang direncanakan, sedangkan ${belumDipetakan} usulan masih memerlukan penelaahan lebih lanjut mengenai kesesuaiannya dengan tugas dan fungsi ${namaOpd} sebelum dapat diakomodasi.\n\n`
      : `Seluruh usulan pokok-pokok pikiran DPRD pada tabel di atas telah dapat dipetakan ke program dan kegiatan yang direncanakan pada Tahun ${tahun}.\n\n`;
  } else {
    bab2 += `Berdasarkan hasil pembahasan rancangan perencanaan pembangunan daerah Tahun ${tahun}, tidak terdapat pokok-pokok pikiran DPRD yang berkaitan langsung dengan tugas, fungsi, dan kewenangan ${namaOpd}.\n\n`;
  }

  // --- 2.5 Inovasi Bidang Urusan (nomor lama 2.4) ---
  bab2 += `2.5 Inovasi Bidang Urusan\n\n`;
  if (inovasiRows.length > 0) {
    const baru = inovasiRows.filter((r) => String(r.tahun_mulai || '') === String(tahun)).length;
    const lanjut = inovasiRows.length - baru;
    bab2 += `Dalam rangka meningkatkan efektivitas pelayanan publik, ${namaOpd} mengembangkan ${inovasiRows.length} inovasi bidang urusan pada Tahun ${tahun}, terdiri atas ${baru} inovasi baru dan ${lanjut} inovasi yang berlanjut dari tahun sebelumnya.\n\n`;
    bab2 += `Tabel 2.8 Inovasi Bidang Urusan ${namaOpd} Tahun ${tahun}\n\n`;
    bab2 += `| No | Nama Inovasi | Bentuk Inovasi | Tahun Mulai | Deskripsi | Manfaat | Jumlah |\n`;
    bab2 += `|---|---|---|---|---|---|---|\n`;
    inovasiRows.forEach((inv, i) => {
      bab2 += `| ${i + 1} | ${sanitizeCell(inv.nama_inovasi)} | ${sanitizeCell(inv.bentuk_inovasi)} | ${sanitizeCell(inv.tahun_mulai)} | ${sanitizeCell(inv.deskripsi)} | ${sanitizeCell(inv.manfaat)} | ${inv.jumlah ?? '......'} |\n`;
    });
    bab2 += `\nSumber: ${namaOpd} Tahun ${tahun}.\n\n`;
    inovasiRows.forEach((inv) => {
      if (!inv.deskripsi) return;
      bab2 += `Inovasi ${sanitizeCell(inv.nama_inovasi)}${inv.tahun_mulai ? ` yang mulai dikembangkan pada Tahun ${inv.tahun_mulai}` : ''} merupakan ${sanitizeCell(inv.deskripsi)}${inv.manfaat ? ` Manfaat yang diharapkan adalah ${sanitizeCell(inv.manfaat)}` : ''}\n\n`;
    });
  } else {
    bab2 += `Pada Tahun ${tahun} belum terdapat inovasi bidang urusan yang tercatat untuk ${namaOpd}.\n\n`;
  }

  // --- 2.6 Rekomendasi dan Catatan Strategis (disembunyikan atas permintaan
  // Bappeda 2026-08-01, lihat TAMPILKAN_SUBBAB_REKOMENDASI_CATATAN; kalau
  // diaktifkan lagi jadi subbab ke-6: 2.1 Evaluasi Kinerja, 2.2 Evaluasi SPM,
  // 2.3 Isu Strategis, 2.4 Pokir DPRD, 2.5 Inovasi, 2.6 Rekomendasi) ---
  if (TAMPILKAN_SUBBAB_REKOMENDASI_CATATAN) {
    bab2 += `2.6 Rekomendasi dan Catatan Strategis\n\n`;
    bab2 += `Berdasarkan hasil evaluasi capaian kinerja Tahun ${tahunEvaluasi}, rumusan isu strategis Tahun ${tahun}, serta telaahan dokumen perencanaan nasional dan daerah, terdapat sejumlah rekomendasi yang perlu ditindaklanjuti dalam perumusan program dan kegiatan prioritas ${namaOpd} Tahun ${tahun}.\n\n`;
    let nomorRek = 0;
    if (gagal.length > 0) {
      nomorRek += 1;
      bab2 += `${nomorRek}. Melakukan penajaman program dan realokasi pendanaan pada indikator yang belum mencapai target Tahun ${tahunEvaluasi}, yaitu ${gagal.map((c) => sanitizeCell(c.nama)).join(', ')}, agar target akhir Renstra Tahun ${tahunAkhir} tetap dapat dicapai.\n`;
    }
    if (lampaui.length > 0) {
      nomorRek += 1;
      bab2 += `${nomorRek}. Mempertahankan strategi pelaksanaan pada indikator yang melampaui target, yaitu ${lampaui.map((c) => sanitizeCell(c.nama)).join(', ')}, dan mereplikasi praktik baiknya pada indikator lain.\n`;
    }
    if (dukunganProSn.length > 0) {
      nomorRek += 1;
      const belum = dukunganProSn.filter((d) => d.kode && !kodeRenja.has(d.kode));
      bab2 += `${nomorRek}. Memastikan keselarasan rencana kerja Tahun ${tahun} dengan kesepakatan Rakortekbang Tahun 2026`;
      bab2 += belum.length > 0
        ? `; dari ${dukunganProSn.length} subkegiatan yang menjadi kewenangan bidang urusan ini, sebanyak ${belum.length} subkegiatan belum diakomodasi dan perlu ditelaah kelayakannya, yaitu ${belum.slice(0, 5).map((d) => `${d.kode} ${sanitizeCell(d.sub_kegiatan)}`).join('; ')}${belum.length > 5 ? '; dan lainnya' : ''}.\n`
        : `; seluruh subkegiatan yang menjadi kewenangan bidang urusan ini telah diakomodasi.\n`;
    }
    if (pokirRows.length > 0) {
      nomorRek += 1;
      const belumPetakan = pokirRows.filter((p) => !p.program_kegiatan_terkait).length;
      bab2 += `${nomorRek}. Menindaklanjuti ${pokirRows.length} usulan pokok-pokok pikiran DPRD${belumPetakan > 0 ? `, khususnya ${belumPetakan} usulan yang belum dapat dipetakan ke program/kegiatan` : ''}.\n`;
    }
    nomorRek += 1;
    bab2 += `${nomorRek}. Memperkuat sistem data dan pelaporan kinerja agar evaluasi Renja tahun berikutnya berbasis data realisasi yang lengkap dan tepat waktu.\n`;
  }

  // =========================================================================
  // BAB III — TUJUAN DAN SASARAN PERANGKAT DAERAH
  // =========================================================================
  let bab3 = `3.1 Tujuan dan Sasaran Renja ${namaOpd} Tahun ${tahun}\n\n`;
  bab3 += `Tujuan dan sasaran merupakan rumusan hasil yang ingin dicapai ${namaOpd} sebagai penjabaran visi dan misi Kepala Daerah. Tujuan dan sasaran Renja Tahun ${tahun} wajib sama dengan tujuan dan sasaran Renstra ${namaOpd} Tahun ${tahunAwal}–${tahunAkhir}, karena Renja merupakan penjabaran tahunan dari Renstra.\n\n`;
  bab3 += `Penentuan target tujuan dan sasaran Tahun ${tahun} membutuhkan analisis berdasarkan hasil evaluasi Renja Tahun ${tahunEvaluasi} sebagaimana diuraikan pada Bab II. Target Indikator Kinerja Utama maupun Indikator Kinerja Kunci Tahun ${tahun} dapat melebihi atau berkurang dari target Renstra Tahun ${tahunAwal}–${tahunAkhir} sepanjang masih dalam batas yang memungkinkan pencapaian target akhir Renstra pada Tahun ${tahunAkhir}, dengan mempertimbangkan kapasitas keuangan daerah serta tantangan dan peluang yang dihadapi.\n\n`;
  bab3 += `Tabel 3.1 Tujuan, Sasaran, dan Indikator Kinerja ${namaOpd} Tahun ${tahun}\n\n`;
  bab3 += `| No | Tujuan | Sasaran | Indikator Kinerja | Satuan | Target Tahun ${tahun} | Ket. |\n`;
  bab3 += `|---|---|---|---|---|---|---|\n`;
  let noBaris3 = 0;
  if (tujuanRows.length > 0) {
    for (const t of tujuanRows) {
      const sasaranTujuan = sasaranRows.filter((s) => Number(s.tujuan_id) === Number(t.id));
      if (!sasaranTujuan.length) {
        for (const ir of indikatorByTujuan[t.id] || []) {
          noBaris3 += 1;
          bab3 += `| ${noBaris3} | ${sanitizeCell(t.isi_tujuan)} | ...... | ${sanitizeCell(ir.nama_indikator)} | ${sanitizeCell(ir.satuan)} | ${angkaId(pilihTargetTahun(ir, tahun, tahunAwal))} | |\n`;
        }
        continue;
      }
      for (const s of sasaranTujuan) {
        for (const ir of indikatorBySasaran[s.id] || []) {
          noBaris3 += 1;
          bab3 += `| ${noBaris3} | ${sanitizeCell(t.isi_tujuan)} | ${sanitizeCell(s.isi_sasaran)} | ${sanitizeCell(ir.nama_indikator)} | ${sanitizeCell(ir.satuan)} | ${angkaId(pilihTargetTahun(ir, tahun, tahunAwal))} | |\n`;
        }
      }
    }
  }
  if (noBaris3 === 0) bab3 += `| 1 | ...... | ...... | ...... | ...... | ...... | |\n`;
  bab3 += `\nSumber: ${namaOpd} Tahun ${tahunAwal}–${tahunAkhir}.\n\n`;
  bab3 += tujuanRows.length > 0
    ? `Tabel di atas menampilkan ${noBaris3} indikator kinerja yang menjabarkan ${tujuanRows.length} tujuan dan ${sasaranRows.length} sasaran Renstra ${namaOpd} ke dalam target tahunan Tahun ${tahun}. Karena Renja merupakan penjabaran tahunan Renstra, seluruh target pada tabel ini wajib konsisten arah pencapaiannya dengan target akhir Renstra Tahun ${tahunAkhir} sebagaimana disyaratkan Peraturan Menteri Dalam Negeri Nomor 14 Tahun 2026.\n\n`
    : `Data tujuan dan sasaran Renstra ${namaOpd} belum tersedia pada sistem sehingga tabel di atas belum dapat diisi otomatis; pengisian tujuan dan sasaran pada modul Renstra diperlukan sebelum Tabel 3.1 dapat tervalidasi penuh.\n\n`;

  bab3 += `3.2 Arah Kebijakan Tahun ${tahun}\n\n`;
  bab3 += `Arah kebijakan ${namaOpd} Tahun ${tahun} merupakan hasil penyelarasan dengan Renstra ${namaOpd} Tahun ${tahunAwal}–${tahunAkhir}, Rencana Kerja Pemerintah (RKP) Tahun ${tahun}, RKPD Provinsi Maluku Utara Tahun ${tahun}, serta kebijakan pembangunan nasional dan daerah lainnya. Penyelarasan ini dilakukan untuk memastikan konsistensi program pembangunan antara tingkat nasional dan daerah.\n\n`;
  bab3 += `Arah kebijakan ${namaOpd} Tahun ${tahun} dirumuskan sebagai berikut:\n`;
  let noAk = 0;
  for (const s of sasaranRows) {
    noAk += 1;
    bab3 += `${noAk}. Mengarahkan pelaksanaan program dan kegiatan pada pencapaian sasaran ${sanitizeCell(s.isi_sasaran)};\n`;
  }
  if (outcomeAstaCita.length > 0) {
    noAk += 1;
    bab3 += `${noAk}. Menyelaraskan program dan kegiatan dengan outcome prioritas nasional ${[...new Set(outcomeAstaCita.map((o) => o.outcome_prioritas).filter(Boolean))].join('; ')} dalam rangka mendukung Asta Cita sesuai kesepakatan Rakortekbang Tahun 2026;\n`;
  }
  if (dukunganProSn.some((d) => d.jenis === 'pro_sn')) {
    noAk += 1;
    bab3 += `${noAk}. Mendukung pelaksanaan Program Strategis Nasional pada kelompok ${[...new Set(dukunganProSn.filter((d) => d.jenis === 'pro_sn').map((d) => d.pro_sn).filter(Boolean))].join(', ')};\n`;
  }
  if (noAk === 0) bab3 += `1. ......\n`;
  noAk += 1;
  bab3 += `${noAk}. Meningkatkan tata kelola pemerintahan yang baik melalui penguatan perencanaan, pelaporan kinerja, dan pengembangan inovasi pelayanan.\n\n`;
  bab3 += `Arah kebijakan tersebut dirumuskan untuk menjawab isu strategis pada subbab 2.3 sekaligus mendukung pencapaian target pembangunan daerah yang tertuang dalam RPJMD Provinsi Maluku Utara Tahun ${tahunAwal}–${tahunAkhir}.\n`;

  // =========================================================================
  // BAB IV — RENCANA KERJA DAN PENDANAAN PERANGKAT DAERAH
  // =========================================================================
  const m41 = tabel41?.meta;
  const totalPagu = m41 ? m41.total_pagu : renjaItems.reduce((s, r) => s + (Number(r.pagu) || 0), 0);

  // --- 4.1 Rencana Program, Kegiatan dan Sub Kegiatan — subbab ditambahkan
  // atas permintaan Bappeda (2026-08-01, catatan susulan) supaya Bab IV
  // punya struktur subbab eksplisit seperti Bab lain, bukan cuma narasi
  // mengalir. Mencakup pengantar, statistik jumlah program/kegiatan/
  // subkegiatan & pagu, Tabel 4.1, dan narasi kebijakan pimpinan — semuanya
  // memang tentang rencana program/kegiatan/subkegiatan itu sendiri. ---
  let bab4 = `4.1 Rencana Program, Kegiatan dan Sub Kegiatan ${namaOpd} Tahun ${tahun}\n\n`;
  bab4 += `Subbab ini menguraikan rencana program, kegiatan, dan subkegiatan ${namaOpd} Tahun ${tahun} beserta indikator kinerja, target, kelompok sasaran, lokasi, dan pagu indikatifnya, sebagai penjabaran operasional tahunan dari Rencana Strategis (Renstra) sekaligus tindak lanjut hasil evaluasi Renja tahun sebelumnya yang diuraikan pada Bab II.\n\n`;
  bab4 += `Rencana program, kegiatan, dan subkegiatan ${namaOpd} Tahun ${tahun} disusun berdasarkan RPJMD Provinsi Maluku Utara Tahun ${tahunAwal}–${tahunAkhir}, Renstra ${namaOpd} Tahun ${tahunAwal}–${tahunAkhir}, serta hasil evaluasi capaian kinerja program, kegiatan, dan subkegiatan sebagaimana diuraikan pada Bab II. Penyusunannya turut mempertimbangkan isu strategis yang telah diidentifikasi serta kesepakatan hasil Rakortekbang Tahun 2026 antara Pemerintah Pusat dan Pemerintah Daerah.\n\n`;

  if (m41) {
    bab4 += `Berdasarkan hasil analisis kebutuhan, ${namaOpd} merencanakan ${m41.jumlah_program} (${terbilang(m41.jumlah_program)}) program yang terdiri atas ${m41.jumlah_kegiatan} (${terbilang(m41.jumlah_kegiatan)}) kegiatan dan ${m41.jumlah_subkegiatan} (${terbilang(m41.jumlah_subkegiatan)}) subkegiatan dengan total pagu indikatif sebesar ${rupiah(m41.total_pagu)}.\n\n`;
    if (m41.mendukung_prioritas_nasional > 0) {
      bab4 += `Dari keseluruhan subkegiatan tersebut, sebanyak ${m41.mendukung_prioritas_nasional} subkegiatan tercatat mendukung Program Strategis Nasional, program tematik pembangunan, dan/atau outcome prioritas Asta Cita sesuai Tabel C Lampiran Peraturan Menteri Dalam Negeri Nomor 14 Tahun 2026. Penandaannya pada kolom Prioritas Nasional dan Prioritas Daerah dalam tabel di bawah dihasilkan dari pencocokan kode subkegiatan, sebagaimana mekanisme keselarasan yang diatur dalam Daftar Isian Fasilitasi peraturan tersebut.\n\n`;
    }
  } else {
    bab4 += `Total pagu indikatif ${namaOpd} Tahun ${tahun} adalah sebesar ${rupiah(totalPagu)}.\n\n`;
  }

  bab4 += `Rencana kerja dan pendanaan ini juga diarahkan secara khusus untuk mendukung pencapaian program prioritas daerah dan kontribusi terhadap target nasional. `;
  bab4 += urusanSpm
    ? `Sebagai bidang urusan wajib pelayanan dasar, alokasi pendanaan turut diarahkan pada pencapaian Standar Pelayanan Minimal.\n\n`
    : `Bidang urusan yang menjadi kewenangan ${namaOpd} tidak termasuk urusan wajib pelayanan dasar sehingga tidak terdapat alokasi khusus pencapaian Standar Pelayanan Minimal.\n\n`;

  bab4 += `Secara rinci, rencana program, kegiatan, dan subkegiatan ${namaOpd} Tahun ${tahun} disajikan dalam tabel berikut:\n\n`;
  bab4 += `Tabel 4.1 Rencana Program dan Kegiatan Prioritas Daerah Tahun ${tahun} ${namaOpd}\n\n`;
  bab4 += `[TABEL_4_1]\n\n`;
  bab4 += `Sumber: ${namaOpd} Tahun ${tahun}.\n\n`;

  if (m41) {
    const programRows = (tabel41.baris || []).filter((b) => b.jenis === 'program' && Number(b.pagu) > 0);
    const programUrut = [...programRows].sort((a, b) => Number(b.pagu) - Number(a.pagu));
    const paguTertinggi = programUrut[0];
    bab4 += `Dari ${m41.jumlah_program} program pada tabel di atas, alokasi pagu indikatif terbesar berada pada program ${sanitizeCell(paguTertinggi?.uraian)} sebesar ${rupiah(paguTertinggi?.pagu)}, atau ${paguTertinggi ? ((Number(paguTertinggi.pagu) / Number(m41.total_pagu)) * 100).toFixed(2) : '......'} persen dari total pagu indikatif Tahun ${tahun}.`;
    bab4 += m41.mendukung_prioritas_nasional > 0
      ? ` Sebanyak ${m41.mendukung_prioritas_nasional} dari ${m41.jumlah_subkegiatan} subkegiatan (${((m41.mendukung_prioritas_nasional / m41.jumlah_subkegiatan) * 100).toFixed(2)} persen) telah selaras dengan prioritas nasional dan/atau daerah, menunjukkan keterkaitan yang memadai antara rencana kerja ${namaOpd} dengan kesepakatan Rakortekbang Tahun 2026.\n\n`
      : ` Belum terdapat subkegiatan yang secara eksplisit tercatat mendukung prioritas nasional pada Tabel C Lampiran Permendagri Nomor 14 Tahun 2026, sehingga keselarasannya perlu ditelaah kembali melalui menu Keselarasan Tabel C.\n\n`;

    // Narasi Prioritas Nasional/Daerah/Gubernur — dulu jadi Tabel 5.3 di Bab V
    // tersendiri, sekarang digabung ke sini (kolom Prioritas Tabel 4.1) atas
    // catatan evaluasi Bappeda, jadi narasinya turut dipindahkan ke sini.
    const barisProgram = (tabel41.baris || []).filter((b) => b.jenis === 'program');
    const programNasional = barisProgram.filter((b) => b.prioritas_nasional).length;
    const programDaerah = barisProgram.filter((b) => b.prioritas_daerah).length;
    const programGubernur = barisProgram.filter((b) => b.prioritas_gubernur).length;
    const programSalahSatu = barisProgram.filter(
      (b) => b.prioritas_nasional || b.prioritas_daerah || b.prioritas_gubernur,
    ).length;

    bab4 += `Kolom "Prioritas" pada Tabel 4.1 di atas menandai keselarasan tiap program terhadap Prioritas Nasional, Prioritas Daerah, dan Prioritas Gubernur. Prioritas Nasional dan Prioritas Daerah ditandai dari hasil pencocokan kode subkegiatan ke Tabel C Lampiran Peraturan Menteri Dalam Negeri Nomor 14 Tahun 2026 sebagaimana diuraikan di atas, sedangkan Prioritas Gubernur ditetapkan sekali pada Renstra ${namaOpd} Tahun ${tahunAwal}–${tahunAkhir} (menu Program Renstra) sehingga konsisten dipakai lintas tahun Renja tanpa perlu ditandai ulang setiap tahun.\n\n`;
    bab4 += programSalahSatu > 0
      ? `Dari ${m41.jumlah_program} program yang direncanakan ${namaOpd} Tahun ${tahun}, sebanyak ${programNasional} program menopang Prioritas Nasional, ${programDaerah} program menopang Prioritas Daerah, dan ${programGubernur} program menopang Prioritas Gubernur, dengan total ${programSalahSatu} program menopang salah satu atau lebih dari ketiganya.\n\n`
      : `Belum terdapat program yang tercatat menopang Prioritas Nasional, Prioritas Daerah, maupun Prioritas Gubernur. Penandaan Prioritas Gubernur dapat dilengkapi pada menu Program Renstra, sedangkan Prioritas Nasional/Daerah dapat ditelaah melalui menu Keselarasan Tabel C, agar tersaji lengkap pada dokumen berikutnya.\n\n`;
  }

  // Narasi kebijakan pimpinan — menandai 2 kegiatan yang eksplisit diminta
  // Kepala Dinas dikawal (mendukung prioritas nasional/daerah & tindak lanjut
  // notisi BPK/BPKP terkait kinerja Ketahanan Pangan), sesuai catatan review
  // Renja 2027. Dideteksi dari data Tabel 4.1 (bukan hardcode statis) supaya
  // otomatis menyesuaikan kalau datanya berubah/dihapus di tahun berikutnya.
  if (m41) {
    // Filter ke baris jenis 'output_subkegiatan' saja — tiap subkegiatan di
    // Tabel 4.1 punya 2 baris berisi teks indikator yang sama (ringkasan
    // "indikator_kegiatan" + rincian "output_subkegiatan"); tanpa filter
    // jenis ini, daftar kebijakan di bawah akan dobel per item.
    const barisKebijakanPimpinan = (tabel41.baris || []).filter(
      (b) =>
        b.jenis === 'output_subkegiatan' &&
        (b.indikator === 'Data Proyeksi Neraca Pangan Wilayah Provinsi' ||
          b.indikator === 'Dukungan Operasional Sekretariat Makan Bergizi Gratis (MBG)'),
    );
    if (barisKebijakanPimpinan.length > 0) {
      const daftarKebijakan = barisKebijakanPimpinan
        .map((b) => `"${b.indikator}"`)
        .join(' dan ');
      bab4 += `Sejalan dengan catatan review Kepala Dinas atas Renja Tahun ${tahun}, terdapat kegiatan/subkegiatan yang secara khusus perlu dikawal setiap tahun karena mendukung Prioritas Nasional dan Prioritas Daerah serta menjadi bagian tindak lanjut notisi BPK/BPKP terkait kinerja Ketahanan Pangan. Pada Tabel 4.1 di atas, hal ini diakomodasi melalui ${daftarKebijakan}. Penyusunan Proyeksi Neraca Pangan Wilayah Provinsi (kode 2.09.03.1.01.0015) merupakan penyesuaian nomenklatur dari kode sebelumnya (2.09.03.1.01.0010) mengikuti Keputusan Menteri Dalam Negeri Nomor 900.1-861 Tahun 2026 tentang Perubahan Keempat atas Keputusan Menteri Dalam Negeri Nomor 050-5889 Tahun 2021, sedangkan Dukungan Operasional Sekretariat Makan Bergizi Gratis (MBG) belum memiliki kode resmi pada nomenklatur Kepmendagri manapun sehingga untuk sementara dilekatkan pada Sub Kegiatan Penyediaan Jasa Pelayanan Umum Kantor (2.09.01.1.08.0004); keduanya bersifat kebijakan pimpinan dan akan disesuaikan lebih lanjut mengikuti perkembangan nomenklatur resmi serta hasil pembahasan Bappeda.\n\n`;
    }
  }

  // --- 4.2 Dukungan Program terhadap Prioritas Nasional, Daerah, dan
  // Gubernur — subbab ditambahkan atas permintaan Bappeda (2026-08-01,
  // catatan susulan). Usulan awal Bappeda menamainya "Program Prioritas
  // Gubernur", tetapi Tabel 4.2 di bawah mencakup TIGA jenjang prioritas
  // (Nasional, Daerah, Gubernur) sekaligus — bukan Gubernur saja — sehingga
  // judul disesuaikan supaya sesuai isi tabelnya, sebagaimana diizinkan user
  // ("anda bisa sesuaikan agar nama sub bab nya lebih tepat"). ---
  bab4 += `4.2 Dukungan Program terhadap Prioritas Nasional, Daerah, dan Gubernur Tahun ${tahun}\n\n`;
  bab4 += `Selain rencana program, kegiatan, dan subkegiatan pada subbab 4.1, Bab IV ini juga menguraikan secara khusus sejauh mana program ${namaOpd} Tahun ${tahun} menopang tiga jenjang prioritas pembangunan berjenjang: Prioritas Nasional (Program Strategis Nasional/outcome Asta Cita hasil Rakortekbang Tahun 2026), Prioritas Daerah (RPJMD Provinsi Maluku Utara), dan Prioritas Gubernur (janji kerja/arahan Kepala Daerah terpilih). Ketiganya ditandai berjenjang dari level Program pada Renstra ${namaOpd} Tahun ${tahunAwal}–${tahunAkhir}, sehingga penandaannya konsisten dipakai lintas tahun Renja tanpa perlu ditandai ulang setiap tahun.\n\n`;
  bab4 += `Selain diukur melalui kolom Prioritas pada Tabel 4.1, dukungan program ${namaOpd} terhadap Prioritas Nasional, Prioritas Daerah, dan Prioritas Gubernur turut direkap tersendiri per Program pada tabel berikut, sebagaimana ditetapkan dalam RPJMD dan ditautkan pada Renstra ${namaOpd} Tahun ${tahunAwal}–${tahunAkhir}.\n\n`;
  bab4 += `Tabel 4.2 Dukungan Program ${namaOpd} terhadap Prioritas Berjenjang\n\n`;
  bab4 += `| No | Kode | Program | Prioritas Nasional | Prioritas Daerah | Prioritas Gubernur |\n`;
  bab4 += `|---|---|---|---|---|---|\n`;
  if (programBerprioritas.length > 0) {
    programBerprioritas.forEach((p, i) => {
      const nas = p.prioritasNasional
        ? `${p.prioritasNasional.kode_prionas} - ${p.prioritasNasional.uraian_prionas}`
        : '–';
      const dae = p.prioritasDaerah
        ? `${p.prioritasDaerah.kode_prioda} - ${p.prioritasDaerah.uraian_prioda}`
        : '–';
      const gub = p.prioritasGubernur
        ? `${p.prioritasGubernur.kode_priogub} - ${p.prioritasGubernur.uraian_priogub}`
        : '–';
      bab4 += `| ${i + 1} | ${sanitizeCell(p.kode_program)} | ${sanitizeCell(p.nama_program)} | ${sanitizeCell(nas)} | ${sanitizeCell(dae)} | ${sanitizeCell(gub)} |\n`;
    });
  } else {
    bab4 += `| 1 | ...... | ...... | ...... | ...... | ...... |\n`;
  }
  bab4 += `\nSumber: ${namaOpd} Tahun ${tahunAwal}–${tahunAkhir}.\n\n`;
  bab4 += programBerprioritas.length > 0
    ? `Dari ${programPrioritas.length} program yang dimiliki ${namaOpd} pada Renstra Tahun ${tahunAwal}–${tahunAkhir}, sebanyak ${programBerprioritas.length} program tercatat menopang salah satu atau lebih Prioritas Nasional/Daerah/Gubernur. Penandaan ini ditetapkan sekali di level Renstra sehingga konsisten dipakai lintas tahun Renja, tanpa perlu ditandai ulang setiap tahun.\n\n`
    : `Penandaan Program terhadap Prioritas Nasional/Daerah/Gubernur pada Renstra ${namaOpd} Tahun ${tahunAwal}–${tahunAkhir} belum diisi. Pengisian dapat dilakukan pada menu Program Renstra agar Tabel 4.2 tersaji lengkap pada dokumen berikutnya.\n\n`;

  // =========================================================================
  // BAB V — KINERJA PENYELENGGARAAN BIDANG URUSAN
  // =========================================================================
  let bab5 = `Kinerja penyelenggaraan bidang urusan merupakan gambaran capaian hasil pelaksanaan program dan kegiatan ${namaOpd} dalam mendukung pencapaian tujuan dan sasaran pembangunan daerah. Dalam menyajikannya, ${namaOpd} menetapkan dua kelompok indikator, yaitu Indikator Kinerja Utama (IKU) dan Indikator Kinerja Kunci (IKK).\n\n`;
  bab5 += `Penetapan target kinerja Tahun ${tahun} didasarkan pada Renstra ${namaOpd} Tahun ${tahunAwal}–${tahunAkhir} dan hasil evaluasi pelaksanaan Renja Tahun ${tahunEvaluasi} sebagaimana diuraikan pada Bab II.\n\n`;

  bab5 += `5.1 Indikator Kinerja Utama Tahun ${tahun}\n\n`;
  bab5 += `Indikator Kinerja Utama merupakan ukuran keberhasilan ${namaOpd} dalam mencapai tujuan dan sasaran strategis yang ditetapkan dalam Renstra Tahun ${tahunAwal}–${tahunAkhir}, sekaligus menjadi dasar penilaian akuntabilitas kinerja instansi pemerintah.\n\n`;
  bab5 += `Tabel 5.1 Indikator Kinerja Utama ${namaOpd} Tahun ${tahun}\n\n`;
  bab5 += `| No | Kode | Indikator | Satuan | Target Renstra ${tahun} | Target Renja ${tahun} | Prakiraan Maju ${tahun + 1} | Ket. |\n`;
  bab5 += `|---|---|---|---|---|---|---|---|\n`;
  if (capaianIkuBaru.length > 0) {
    capaianIkuBaru.forEach((c, i) => {
      const targetTahunIniFmt = formatAngkaIndikator(pilihTargetTahun(c.ir, tahun, tahunAwal), c.ir);
      const targetTahunMajuFmt = formatAngkaIndikator(pilihTargetTahun(c.ir, tahun + 1, tahunAwal), c.ir);
      bab5 += `| ${i + 1} | ${sanitizeCell(c.kode)} | ${sanitizeCell(c.nama)} | ${sanitizeCell(c.satuan)} | ${targetTahunIniFmt ?? '......'} | ${targetTahunIniFmt ?? '......'} | ${targetTahunMajuFmt ?? '......'} | |\n`;
    });
  } else {
    bab5 += `| 1 | ...... | ...... | ...... | ...... | ...... | ...... | |\n`;
  }
  bab5 += `\nSumber: ${namaOpd} Tahun ${tahunAwal}–${tahunAkhir}.\n\n`;
  bab5 += capaianIkuBaru.length > 0
    ? `Target Indikator Kinerja Utama Tahun ${tahun} pada tabel di atas ditetapkan sama dengan target Renstra tahun berkenaan, sebagai kelanjutan langsung dari capaian Tahun ${tahunEvaluasi} yang dievaluasi pada Bab II subbab 2.1. Kolom Prakiraan Maju Tahun ${tahun + 1} disajikan sebagai proyeksi target satu tahun ke depan sesuai Renstra, sebagaimana lazim pada Tabel 4.1.\n\n`
    : `Belum terdapat Indikator Kinerja Utama yang ditetapkan untuk ${namaOpd} pada Renstra Tahun ${tahunAwal}–${tahunAkhir}.\n\n`;

  bab5 += `5.2 Indikator Kinerja Kunci Tahun ${tahun}\n\n`;
  bab5 += `Indikator Kinerja Kunci merupakan indikator yang mengukur capaian ${namaOpd} dalam mendukung sasaran strategis pembangunan daerah dan selaras dengan indikator outcome prioritas nasional hasil kesepakatan Rakortekbang Tahun 2026.\n\n`;
  bab5 += `Tabel 5.2 Indikator Kinerja Kunci ${namaOpd} Tahun ${tahun}\n\n`;
  bab5 += `| No | Kode | Indikator | Satuan | Target Renstra ${tahun} | Target Renja ${tahun} | Prakiraan Maju ${tahun + 1} | Ket. |\n`;
  bab5 += `|---|---|---|---|---|---|---|---|\n`;
  if (capaianIkk.length > 0) {
    capaianIkk.forEach((c, i) => {
      const targetTahunIniFmt = formatAngkaIndikator(pilihTargetTahun(c.ir, tahun, tahunAwal), c.ir);
      const targetTahunMajuFmt = formatAngkaIndikator(pilihTargetTahun(c.ir, tahun + 1, tahunAwal), c.ir);
      bab5 += `| ${i + 1} | ${sanitizeCell(c.kode)} | ${sanitizeCell(c.nama)} | ${sanitizeCell(c.satuan)} | ${targetTahunIniFmt ?? '......'} | ${targetTahunIniFmt ?? '......'} | ${targetTahunMajuFmt ?? '......'} | |\n`;
    });
  } else {
    bab5 += `| 1 | ...... | ...... | ...... | ...... | ...... | ...... | |\n`;
  }
  bab5 += `\nSumber: ${namaOpd} Tahun ${tahunAwal}–${tahunAkhir}.\n\n`;
  bab5 += capaianIkk.length > 0
    ? `Tabel di atas memuat ${capaianIkk.length} Indikator Kinerja Kunci yang menjadi instrumen pemantauan kinerja operasional ${namaOpd} secara lebih rinci dibandingkan IKU pada Tabel 5.1, dengan target Tahun ${tahun} dan proyeksi Tahun ${tahun + 1} yang konsisten terhadap Renstra Tahun ${tahunAwal}–${tahunAkhir}.\n\n`
    : `Belum terdapat Indikator Kinerja Kunci yang ditetapkan untuk ${namaOpd} pada Renstra Tahun ${tahunAwal}–${tahunAkhir}.\n\n`;

  // Subbab 5.3 "Dukungan Program terhadap Prioritas Berjenjang" (dulu di sini)
  // dipindahkan atas catatan evaluasi Bappeda ke Tabel 4.1 Bab IV sebagai
  // kolom "Prioritas Gubernur" tambahan (menyusul Nasional/Daerah yang sudah
  // ada di tabel itu) — lihat Permendagri14Bab4TableHelper.js.

  // =========================================================================
  // BAB VI — PENUTUP
  // =========================================================================
  const daftarProgram = m41
    ? [...new Set(renjaItems.map((r) => String(r.program || '').replace(/^\s*[\d.]+\s*-\s*/, '').trim()).filter(Boolean))]
    : [];

  let bab6 = `Rencana Kerja (Renja) ${namaOpd} Tahun ${tahun} merupakan dokumen perencanaan tahunan yang disusun sebagai penjabaran dari Rencana Strategis ${namaOpd} Tahun ${tahunAwal}–${tahunAkhir}, dengan mengacu pada Rencana Kerja Pemerintah Daerah Provinsi Maluku Utara Tahun ${tahun} serta selaras dengan kebijakan pembangunan nasional dan daerah.\n\n`;

  if (m41) {
    bab6 += `Untuk menjawab isu strategis yang telah diidentifikasi, ${namaOpd} merencanakan ${m41.jumlah_program} (${terbilang(m41.jumlah_program)}) program yang terdiri atas ${m41.jumlah_kegiatan} (${terbilang(m41.jumlah_kegiatan)}) kegiatan dan ${m41.jumlah_subkegiatan} (${terbilang(m41.jumlah_subkegiatan)}) subkegiatan dengan total pagu indikatif sebesar ${rupiah(m41.total_pagu)}`;
    bab6 += daftarProgram.length > 0
      ? `. Program tersebut meliputi ${daftarProgram.join(', ')}.\n\n`
      : `.\n\n`;
  } else {
    bab6 += `Dokumen ini memuat ${renjaItems.length} baris rencana dengan total pagu indikatif sebesar ${rupiah(totalPagu)}.\n\n`;
  }

  if (capaianIkuBaru.length > 0) {
    const ikuUtamaBab6 = capaianIkuBaru[0];
    const targetIkuTahunIni = pilihTargetTahun(ikuUtamaBab6.ir, tahun, tahunAwal);
    bab6 += `Keberhasilan pelaksanaan Renja ini diukur melalui indikator kinerja sebagaimana diuraikan pada Bab V, dengan indikator utama ${sanitizeCell(ikuUtamaBab6.nama)} yang ditargetkan sebesar ${angkaId(targetIkuTahunIni)} pada Tahun ${tahun}.\n\n`;
  }

  bab6 += `Keberhasilan pelaksanaan Renja ${namaOpd} Tahun ${tahun} sangat bergantung pada ketersediaan alokasi anggaran yang memadai dan tepat waktu, komitmen dan profesionalisme aparatur, koordinasi lintas sektor dengan pemangku kepentingan terkait, serta partisipasi aktif masyarakat.\n\n`;
  bab6 += `Sebagai kaidah pelaksanaan, seluruh unit kerja di lingkungan ${namaOpd} berkewajiban melaksanakan program, kegiatan, dan subkegiatan sesuai target yang ditetapkan, serta menyampaikan laporan kinerja secara berkala sebagai bahan pengendalian dan evaluasi. Apabila di kemudian hari terdapat perubahan kebijakan atau kondisi yang mengharuskan penyesuaian, akan dilakukan perubahan Renja sesuai ketentuan peraturan perundang-undangan yang berlaku.\n\n`;
  bab6 += `Demikian Renja ${namaOpd} Tahun ${tahun} ini disusun untuk menjadi pedoman pelaksanaan program dan kegiatan pada Tahun ${tahun}.\n`;

  return { bab1, bab2, bab3, bab4, bab5, bab6, tabel41 };
}

module.exports = { generateBabPermendagri14, BIDANG_URUSAN_SPM, predikatCapaian };
