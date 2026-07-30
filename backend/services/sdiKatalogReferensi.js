// backend/services/sdiKatalogReferensi.js
'use strict';

/**
 * Katalog rujukan untuk pengisian otomatis Daftar Data Daerah.
 *
 * Isi katalog ini adalah data referensi, bukan hasil tebakan sistem. Nilai yang
 * tidak dapat disimpulkan dari sumber resmi sengaja TIDAK dicantumkan — lebih
 * baik kolom ditandai "perlu dicek" daripada terisi angka yang salah, karena
 * kolom (2), (9), (17), (18), dan (19) menjadi dasar verifikasi Forum Satu Data.
 */

/**
 * Urusan pemerintahan menurut Permendagri 90/2019 (dimutakhirkan Kepmendagri
 * 050-5889/2021). Dipakai sebagai usulan Kategori RAD (16): arsitektur data
 * SPBE mengelompokkan data mengikuti urusan penyelenggaranya.
 *
 * Nilai ini USULAN — verifikasi akhir tetap pada sisae.spbe.go.id/index.php/_RAD.
 */
const URUSAN = {
  '1.01': 'Pendidikan',
  '1.02': 'Kesehatan',
  '1.03': 'Pekerjaan Umum dan Penataan Ruang',
  '1.04': 'Perumahan Rakyat dan Kawasan Permukiman',
  '1.05': 'Ketenteraman, Ketertiban Umum, dan Pelindungan Masyarakat',
  '1.06': 'Sosial',
  '2.07': 'Tenaga Kerja',
  '2.08': 'Pemberdayaan Perempuan dan Pelindungan Anak',
  '2.09': 'Pangan',
  '2.10': 'Pertanahan',
  '2.11': 'Lingkungan Hidup',
  '2.12': 'Administrasi Kependudukan dan Pencatatan Sipil',
  '2.13': 'Pemberdayaan Masyarakat dan Desa',
  '2.14': 'Pengendalian Penduduk dan Keluarga Berencana',
  '2.15': 'Perhubungan',
  '2.16': 'Komunikasi dan Informatika',
  '2.17': 'Koperasi, Usaha Kecil, dan Menengah',
  '2.18': 'Penanaman Modal',
  '2.19': 'Kepemudaan dan Olahraga',
  '2.20': 'Statistik',
  '2.21': 'Persandian',
  '2.22': 'Kebudayaan',
  '2.23': 'Perpustakaan',
  '2.24': 'Kearsipan',
  '3.25': 'Kelautan dan Perikanan',
  '3.26': 'Pariwisata',
  '3.27': 'Pertanian',
  '3.28': 'Kehutanan',
  '3.29': 'Energi dan Sumber Daya Mineral',
  '3.30': 'Perdagangan',
  '3.31': 'Perindustrian',
  '3.32': 'Transmigrasi',
  '4.01': 'Sekretariat Daerah',
  '4.02': 'Sekretariat DPRD',
  '5.01': 'Perencanaan Pembangunan',
  '5.02': 'Keuangan',
  '5.03': 'Kepegawaian',
  '5.04': 'Pendidikan dan Pelatihan',
  '5.05': 'Penelitian dan Pengembangan',
  '6.01': 'Pengawasan',
  '7.01': 'Kesatuan Bangsa dan Politik',
};

/**
 * Program bernomor urut .01 pada tiap urusan adalah "Program Penunjang Urusan
 * Pemerintahan Daerah" — datanya bersifat administratif, bukan data teknis
 * urusan, sehingga kategori RAD-nya berbeda dari urusan induknya.
 */
const RAD_PENUNJANG = 'Administrasi Pemerintahan';

/**
 * Padanan Data Prioritas (kolom 2 — ID DDP).
 *
 * HANYA berisi entri yang sumbernya dapat ditunjuk. Saat ini satu entri, yaitu
 * baris contoh pada Lampiran surat 000.7/4486/SETDA sendiri. Tambahkan entri
 * baru hanya setelah dicocokkan dengan daftar resmi Bappenas:
 * https://link.bappenas.go.id/Lampiran_PemutakhiranDP24
 */
const PADANAN_DATA_PRIORITAS = [
  {
    pola: /ketidakcukupan\s+(konsumsi\s+)?pangan|prevalence\s+of\s+undernourishment|\bpou\b/i,
    id_ddp: '54',
    nama: 'Prevalensi Ketidakcukupan Konsumsi Pangan (PoU)',
    sumber: 'Baris contoh Lampiran surat 000.7/4486/SETDA',
  },
];

/**
 * Aturan penyimpulan Klasifikasi Penyajian (kolom 14).
 * Diperiksa berurutan; yang cocok lebih dulu dipakai. Basis "Provinsi" selalu
 * disertakan karena produsen data adalah perangkat daerah provinsi.
 */
const ATURAN_PENYAJIAN = [
  {
    pola: /kabupaten|kab\.?\s*\/?\s*kota|kab\/kota/i,
    nilai: 'Provinsi; Kabupaten/Kota',
    alasan: 'nama data menyebut cakupan kabupaten/kota',
  },
  {
    pola: /desa|kelurahan/i,
    nilai: 'Provinsi; Desa/Kelurahan',
    alasan: 'nama data menyebut cakupan desa/kelurahan',
  },
  {
    pola: /jenis\s+kelamin|gender|laki-laki|perempuan/i,
    nilai: 'Provinsi; Jenis Kelamin',
    alasan: 'nama data menyebut pembedaan jenis kelamin',
  },
  {
    // Diperiksa sebelum aturan komoditas: data kerawanan pangan memang
    // menyebut komoditas, tetapi penyajiannya bertumpu pada wilayah.
    // Kata "rawan/rentan" wajib berdampingan dengan "pangan"/"wilayah" karena
    // kata itu sendiri lazim muncul pada kalimat lain dan pernah memicu
    // penyimpulan keliru.
    pola: /(rawan|rentan)\s+(pangan|wilayah)|kerawanan\s+pangan|daerah\s+(rawan|rentan)|\bfsva\b/i,
    nilai: 'Provinsi; Kabupaten/Kota',
    alasan: 'data kerawanan pangan disajikan per wilayah kabupaten/kota',
  },
  {
    pola: /komoditas|pangan\s+strategis|\bpsat\b|harga|beras|jagung|cabai/i,
    nilai: 'Provinsi; Komoditas',
    alasan: 'nama data merujuk komoditas pangan tertentu',
  },
];

/**
 * Indikator tata kelola internal perangkat daerah. Datanya administratif,
 * sehingga kategori RAD-nya mengikuti Administrasi Pemerintahan meskipun OPD
 * penyelenggaranya mengampu urusan teknis.
 */
const POLA_TATA_KELOLA =
  /\bsakip\b|\bikm\b|kepuasan\s+masyarakat|reformasi\s+birokrasi|akuntabilitas|profesionalitas\s+asn|tindak\s+lanjut\s+pengaduan|inovasi\s+perangkat\s+daerah|opini\s+bpk|realisasi\s+anggaran/i;

/** Jenis data disimpulkan geospasial bila nama data menyiratkan keruangan. */
const POLA_GEOSPASIAL = /peta|spasial|geospasial|koordinat|lokasi\s+lahan|wilayah\s+rentan|fsva/i;

/** Tautan metadata resmi yang layak dipakai sebagai isi kolom (17). */
const POLA_METADATA_RESMI = /https?:\/\/[^\s;]*(indah\.bps\.go\.id|sirusa\.web\.bps\.go\.id)[^\s;]*/i;

/** Ambil kode urusan (dua ruas pertama) dari kode program Kepmendagri. */
function kodeUrusan(kodeProgram) {
  const m = String(kodeProgram || '').match(/^(\d+)\.(\d+)/);
  return m ? `${m[1]}.${m[2]}` : null;
}

/** Deteksi program penunjang urusan (ruas ketiga bernilai 01). */
function isPenunjang(kodeProgram) {
  return /^\d+\.\d+\.0*1\b/.test(String(kodeProgram || ''));
}

/** Usulan Kategori RAD dari kode program. */
function kategoriRad(kodeProgram) {
  const urusan = kodeUrusan(kodeProgram);
  if (!urusan || !URUSAN[urusan]) return null;
  return isPenunjang(kodeProgram) ? RAD_PENUNJANG : URUSAN[urusan];
}

/** Ubah nama data menjadi slug URL untuk usulan tautan portal. */
function slugkan(teks) {
  return String(teks || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

module.exports = {
  URUSAN,
  RAD_PENUNJANG,
  PADANAN_DATA_PRIORITAS,
  ATURAN_PENYAJIAN,
  POLA_GEOSPASIAL,
  POLA_TATA_KELOLA,
  POLA_METADATA_RESMI,
  kodeUrusan,
  isPenunjang,
  kategoriRad,
  slugkan,
};
