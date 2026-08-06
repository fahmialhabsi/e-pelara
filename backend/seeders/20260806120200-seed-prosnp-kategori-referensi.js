'use strict';

const HAMBATAN = [
  { kode: 'ANGGARAN', label: 'Keterlambatan/Keterbatasan Anggaran', urutan: 1 },
  { kode: 'SDM', label: 'Kendala SDM/Personel', urutan: 2 },
  { kode: 'SARANA_PRASARANA', label: 'Kendala Sarana dan Prasarana', urutan: 3 },
  { kode: 'DATA_INFORMASI', label: 'Data/Informasi Tidak Tersedia atau Tidak Akurat', urutan: 4 },
  { kode: 'KOORDINASI', label: 'Kendala Koordinasi Lintas Instansi', urutan: 5 },
  { kode: 'REGULASI', label: 'Kendala Regulasi/Kebijakan', urutan: 6 },
  { kode: 'BENCANA_FORCE_MAJEURE', label: 'Bencana/Force Majeure', urutan: 7 },
  { kode: 'LAINNYA', label: 'Lainnya', urutan: 99 },
];

const TINDAK_LANJUT = [
  { kode: 'PERCEPATAN_ANGGARAN', label: 'Percepatan Realisasi Anggaran', urutan: 1 },
  { kode: 'PENGUATAN_SDM', label: 'Penambahan/Pelatihan SDM', urutan: 2 },
  { kode: 'PERBAIKAN_SARANA', label: 'Perbaikan/Penambahan Sarana dan Prasarana', urutan: 3 },
  { kode: 'PERBAIKAN_DATA', label: 'Perbaikan Pendataan/Validasi Data', urutan: 4 },
  { kode: 'KOORDINASI_STAKEHOLDER', label: 'Koordinasi dengan Pemangku Kepentingan Terkait', urutan: 5 },
  { kode: 'REVISI_TARGET', label: 'Revisi Target/Rencana Kerja', urutan: 6 },
  { kode: 'PENGAJUAN_KEBIJAKAN', label: 'Pengajuan Perubahan Regulasi/Kebijakan', urutan: 7 },
  { kode: 'LAINNYA', label: 'Lainnya', urutan: 99 },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const rows = [
      ...HAMBATAN.map((item) => ({ kelompok: 'hambatan', ...item })),
      ...TINDAK_LANJUT.map((item) => ({ kelompok: 'tindak_lanjut', ...item })),
    ].map((item) => ({ ...item, aktif: true, created_at: now, updated_at: now }));
    await queryInterface.bulkInsert('prosnp_kategori_referensi', rows, { ignoreDuplicates: true });
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('prosnp_kategori_referensi', {
      kode: [...HAMBATAN, ...TINDAK_LANJUT].map((item) => item.kode),
    });
  },
};
