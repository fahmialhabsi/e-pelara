// Katalog konstanta modul Reviu Konsistensi Cascading Renstra.

/** Sumber data & nama kolom kode/uraian untuk tiap level objek Renstra. */
export const OBJEK_LEVEL = {
  tujuan: {
    label: 'Tujuan',
    endpoint: '/renstra-tujuan',
    kodeField: 'no_tujuan',
    uraianField: 'isi_tujuan',
    parentLevel: null,
  },
  sasaran: {
    label: 'Sasaran',
    endpoint: '/renstra-sasaran',
    kodeField: 'nomor',
    uraianField: 'isi_sasaran',
    parentLevel: 'tujuan',
  },
  strategi: {
    label: 'Strategi',
    endpoint: '/renstra-strategi',
    kodeField: 'kode_strategi',
    uraianField: 'deskripsi',
    parentLevel: 'sasaran',
  },
  arah_kebijakan: {
    label: 'Arah Kebijakan',
    endpoint: '/renstra-kebijakan',
    kodeField: 'kode_kebjkn',
    uraianField: 'deskripsi',
    parentLevel: 'strategi',
  },
  program: {
    label: 'Program',
    endpoint: '/renstra-program',
    kodeField: 'kode_program',
    uraianField: 'nama_program',
    parentLevel: 'arah_kebijakan',
  },
  kegiatan: {
    label: 'Kegiatan',
    endpoint: '/renstra-kegiatan',
    kodeField: 'kode_kegiatan',
    uraianField: 'nama_kegiatan',
    parentLevel: 'program',
  },
  sub_kegiatan: {
    label: 'Sub Kegiatan',
    endpoint: '/renstra-subkegiatan',
    kodeField: 'kode_sub_kegiatan',
    uraianField: 'nama_sub_kegiatan',
    parentLevel: 'kegiatan',
  },
};

/**
 * `otomatis: true` = dapat dieksekusi tombol "Terapkan" (hanya mengubah FK induk).
 * Jenis lain melahirkan/meleburkan record beserta kode dan turunannya, sehingga
 * harus dikerjakan manual lewat form objek terkait.
 */
export const JENIS_REKOMENDASI = {
  pindahkan: { label: 'Pindahkan ke induk lain', otomatis: true },
  ganti_program: { label: 'Ganti Program penaung', otomatis: true },
  pecah: { label: 'Pecah menjadi beberapa rumusan', otomatis: false },
  gabungkan: { label: 'Gabungkan dengan rumusan lain', otomatis: false },
  perbaiki_rumusan: { label: 'Perbaiki rumusan', otomatis: false },
  sesuai: { label: 'Sudah sesuai (tanpa perbaikan)', otomatis: false },
};

export const TINGKAT_PRIORITAS = {
  tinggi: { label: 'Tinggi', color: 'red' },
  sedang: { label: 'Sedang', color: 'orange' },
  rendah: { label: 'Rendah', color: 'blue' },
};

export const STATUS_REVIEW = {
  usulan: { label: 'Usulan', color: 'default' },
  disetujui: { label: 'Disetujui', color: 'blue' },
  ditolak: { label: 'Ditolak', color: 'red' },
  ditindaklanjuti: { label: 'Ditindaklanjuti', color: 'gold' },
  selesai: { label: 'Selesai', color: 'green' },
};

/**
 * Katalog dasar hukum siap pakai. Nomor pasal sengaja tidak dipatok mati pada
 * sebagian entri — isi kolom "Pasal/Bagian" sesuai naskah regulasi yang Anda
 * pegang, karena penomoran dapat berbeda antar salinan/pemutakhiran.
 */
export const KATALOG_DASAR_HUKUM = [
  {
    regulasi: 'Permendagri No. 86 Tahun 2017',
    pasal: 'Lampiran — Tabel T-C.26',
    kutipan:
      'Format penyajian Tujuan, Sasaran, Strategi, dan Arah Kebijakan Perangkat Daerah menempatkan Arah Kebijakan sebagai turunan langsung dari Strategi, dan Strategi sebagai turunan dari Sasaran.',
  },
  {
    regulasi: 'Permendagri No. 86 Tahun 2017',
    pasal: 'Lampiran — Tabel T-C.27',
    kutipan:
      'Rencana Program, Kegiatan, dan Pendanaan disusun berjenjang Program → Kegiatan → Sub Kegiatan sebagai penjabaran Arah Kebijakan.',
  },
  {
    regulasi: 'Permendagri No. 86 Tahun 2017',
    pasal: 'Bagian Penyusunan Renstra Perangkat Daerah',
    kutipan:
      'Arah kebijakan merupakan rumusan kerangka pikir untuk mengarahkan pemilihan program agar selaras dengan strategi yang ditetapkan.',
  },
  {
    regulasi: 'Kepmendagri No. 050-5889 Tahun 2021',
    pasal: 'Lampiran — Nomenklatur Urusan Pangan (2.09)',
    kutipan:
      'Klasifikasi, kodefikasi, dan nomenklatur Program, Kegiatan, dan Sub Kegiatan bersifat baku dan berjenjang; pemerintah daerah memilih nomenklatur sesuai kewenangan urusannya.',
  },
  {
    regulasi: 'Permendagri No. 90 Tahun 2019',
    pasal: 'Ketentuan Umum',
    kutipan:
      'Klasifikasi, kodefikasi, dan nomenklatur perencanaan pembangunan dan keuangan daerah digunakan sebagai acuan tunggal agar dokumen perencanaan dan penganggaran saling terhubung.',
  },
  {
    regulasi: 'UU No. 25 Tahun 2004',
    pasal: 'Ketentuan Umum & Asas Perencanaan',
    kutipan:
      'Perencanaan pembangunan disusun secara sistematis, terarah, terpadu, dan berkesinambungan antar dokumen perencanaan.',
  },
  {
    regulasi: 'UU No. 23 Tahun 2014',
    pasal: 'Pembagian Urusan Pemerintahan',
    kutipan:
      'Program dan kegiatan Perangkat Daerah harus berada dalam lingkup urusan pemerintahan yang menjadi kewenangan daerah.',
  },
  {
    regulasi: 'PP No. 13 Tahun 2019',
    pasal: 'Evaluasi Penyelenggaraan Pemerintahan Daerah',
    kutipan:
      'Konsistensi antar dokumen perencanaan menjadi salah satu aspek yang dievaluasi dalam penyelenggaraan pemerintahan daerah.',
  },
];
