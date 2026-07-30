// Katalog konstanta modul Daftar Data Daerah (Satu Data Indonesia).
// Mengacu pada Lampiran "Format Daftar Data Daerah" surat Sekretaris Daerah
// Provinsi Maluku Utara Nomor 000.7/4486/SETDA tanggal 24 Juli 2026.

export const JENIS_DATA = {
  statistik: { label: 'Statistik', color: 'blue' },
  geospasial: { label: 'Geospasial', color: 'green' },
  keuangan: { label: 'Keuangan', color: 'gold' },
};

export const INDIKATOR_VARIABEL = {
  indikator: { label: 'Indikator', color: 'geekblue' },
  variabel: { label: 'Variabel', color: 'default' },
};

export const KLASIFIKASI_RISIKO = {
  terbuka: { label: 'Terbuka', color: 'green' },
  terbatas: { label: 'Terbatas', color: 'orange' },
  tertutup: { label: 'Tertutup', color: 'red' },
};

export const JADWAL_PEMUTAKHIRAN = {
  harian: { label: 'Harian' },
  mingguan: { label: 'Mingguan' },
  bulanan: { label: 'Bulanan' },
  triwulanan: { label: 'Triwulanan' },
  semesteran: { label: 'Semesteran' },
  tahunan: { label: 'Tahunan' },
  insidental: { label: 'Insidental' },
};

export const STATUS_BARIS = {
  draft: { label: 'Draft', color: 'default' },
  diverifikasi: { label: 'Diverifikasi', color: 'blue' },
  final: { label: 'Final', color: 'green' },
};

/** Level indikator Renstra yang dapat ditarik menjadi baris Daftar Data. */
export const STAGE_TARIK = [
  { value: 'tujuan', label: 'Tujuan (Impact)' },
  { value: 'sasaran', label: 'Sasaran (Outcome)' },
  { value: 'strategi', label: 'Strategi' },
  { value: 'kebijakan', label: 'Arah Kebijakan' },
  { value: 'program', label: 'Program (Outcome)' },
  { value: 'kegiatan', label: 'Kegiatan (Output)' },
  { value: 'sub_kegiatan', label: 'Sub Kegiatan (Output)' },
];

export const STAGE_TARIK_DEFAULT = ['tujuan', 'sasaran', 'program'];

/**
 * Kolom yang menjadi basis verifikasi Forum Satu Data menurut catatan akhir
 * Lampiran. Dipakai untuk menyorot sel kosong pada tabel dan rapor kelengkapan.
 */
export const KOLOM_VERIFIKASI = [
  { key: 'id_ddp', label: 'ID DDP', catatan: 'basis verifikasi indikator 8' },
  {
    key: 'kode_standar_data',
    label: 'Kode Standar Data',
    catatan: 'basis verifikasi indikator 10 dan 11',
  },
  {
    key: 'kode_metadata',
    label: 'Kode Metadata',
    catatan: 'basis verifikasi indikator 12 dan 13',
  },
  {
    key: 'link_portal_daerah',
    label: 'Link Portal Daerah',
    catatan: 'basis verifikasi indikator 9 dan 14',
  },
  { key: 'link_portal_sdi', label: 'Link Portal SDI', catatan: 'basis verifikasi indikator 19' },
];

/**
 * Penanda apakah kolom ID DDP (2) sudah dicocokkan dengan Daftar Data Pusat.
 * Lampiran mengizinkan kolom ini kosong bila data tidak mengacu Data Pusat,
 * sehingga "tidak mengacu" berarti sudah tuntas — bukan kekurangan.
 */
export const ID_DDP_STATUS = {
  belum_dicek: { label: 'Belum dicek', color: 'red' },
  mengacu: { label: 'Mengacu Data Pusat', color: 'blue' },
  tidak_mengacu: { label: 'Tidak mengacu Data Pusat', color: 'green' },
};

/** Seberapa kuat dasar sebuah usulan pengisian otomatis. */
export const KEYAKINAN = {
  tinggi: { label: 'Tinggi', color: 'green', pilihBaku: true },
  sedang: { label: 'Sedang', color: 'blue', pilihBaku: true },
  rendah: { label: 'Rendah', color: 'orange', pilihBaku: false },
};

/** Kolom yang ditangani mesin pengisian otomatis. */
export const KOLOM_AUTOFILL = [
  { key: 'id_ddd', no: 1, label: 'ID DDD' },
  { key: 'id_ddp', no: 2, label: 'ID DDP' },
  { key: 'kode_standar_data', no: 9, label: 'Kode Standar Data' },
  { key: 'klasifikasi_penyajian', no: 14, label: 'Klasifikasi Penyajian' },
  { key: 'kategori_rad', no: 16, label: 'Kategori RAD' },
  { key: 'kode_metadata', no: 17, label: 'Kode Metadata' },
  { key: 'link_portal_daerah', no: 18, label: 'Link Portal Daerah' },
  { key: 'link_portal_sdi', no: 19, label: 'Link Portal SDI' },
];

/** Kunci localStorage untuk alamat portal daerah — dipakai lintas sesi. */
export const KUNCI_PORTAL_DAERAH = 'sdi.portal_daerah';

/** Tautan rujukan pengisian kolom yang datanya berasal dari luar aplikasi. */
export const RUJUKAN_EKSTERNAL = {
  id_ddp: 'https://link.bappenas.go.id/Lampiran_PemutakhiranDP24',
  kode_standar_data_statistik: 'https://indah.bps.go.id',
  kode_standar_data_geospasial: 'https://kugi.ina-sdi.or.id',
  kategori_rad: 'https://sisae.spbe.go.id/index.php/_RAD',
  portal_sdi: 'https://data.go.id',
};

export const opsiDari = (katalog) =>
  Object.entries(katalog).map(([value, v]) => ({ value, label: v.label }));
