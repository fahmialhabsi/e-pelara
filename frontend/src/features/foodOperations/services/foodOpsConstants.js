// Evidence & Operasi Pangan — Phase 0. Vocabulary module-owned, HARUS sinkron
// dengan backend (foodOpsDocumentService.js / foodOpsClassifier.js / foodOpsEventService.js).
export const DOCUMENT_CLASS_LABEL = {
  REGULATION: 'Regulasi',
  OPERATIONAL_EVIDENCE: 'Evidence Operasional',
  ACTIVITY_DOCUMENT: 'Dokumen Kegiatan',
  REPORT: 'Laporan',
  OTHER: 'Lainnya',
};

export const DOCUMENT_TYPE_LABEL = {
  undang_undang: 'Undang-Undang', peraturan_pemerintah: 'Peraturan Pemerintah', peraturan_presiden: 'Peraturan Presiden',
  permendagri: 'Permendagri', peraturan_daerah: 'Peraturan Daerah', peraturan_gubernur: 'Peraturan Gubernur',
  keputusan_gubernur: 'Keputusan Gubernur', surat_keputusan: 'Surat Keputusan', surat_tugas: 'Surat Tugas',
  undangan: 'Undangan', daftar_hadir: 'Daftar Hadir', notulen: 'Notulen', dokumentasi: 'Dokumentasi',
  berita_acara: 'Berita Acara', kartu_stok: 'Kartu Stok', kartu_gudang: 'Kartu Gudang', kartu_persediaan: 'Kartu Persediaan',
  laporan: 'Laporan', bukti_serah_terima: 'Bukti Serah Terima', surat_jalan: 'Surat Jalan', materi: 'Materi', other: 'Lainnya',
};

export const STATUS_VERIFIKASI_LABEL = {
  uploaded: 'Terunggah', valid: 'Valid', invalid: 'Tidak Valid', needs_clarification: 'Perlu Klarifikasi', duplicate: 'Duplikat', expired: 'Kedaluwarsa',
};

export const AUTHORITY_LEVEL_LABEL = {
  STRUCTURED_SYSTEM_SOURCE: 'Sumber Sistem Terstruktur', SIGNED_UPLOAD: 'Unggahan Resmi', SYSTEM_GENERATED_DRAFT: 'Draft Sistem',
  SUPPORTING: 'Pendukung', TEST_DATA: 'Data Uji',
};

export const JENIS_PRODUK_HUKUM_LABEL = {
  uu: 'UU', perpu: 'Perpu', pp: 'PP', perpres: 'Perpres', permendagri: 'Permendagri', permen_lain: 'Permen Lainnya',
  kepmendagri: 'Kepmendagri', perda: 'Perda', pergub: 'Pergub', kepgub: 'Kepgub', sk: 'SK', lainnya: 'Lainnya',
};

export const EVENT_TYPE_LABEL = {
  RAPAT: 'Rapat', RAKOR: 'Rapat Koordinasi', MONITORING: 'Monitoring', SOSIALISASI: 'Sosialisasi',
  SERAH_TERIMA: 'Serah Terima', STOCK_OPNAME: 'Stock Opname', PENYALURAN: 'Penyaluran', KEGIATAN_LAIN: 'Kegiatan Lain',
};

export const STATUS_TINDAK_LANJUT_LABEL = {
  belum_ditindaklanjuti: 'Belum Ditindaklanjuti', sedang_diproses: 'Sedang Diproses', selesai: 'Selesai',
};

export const LINK_ENTITY_TYPE_LABEL = { EVENT: 'Kegiatan', REGULATION: 'Regulasi', DOCUMENT: 'Dokumen', GENERIC_REFERENCE: 'Referensi Umum' };
