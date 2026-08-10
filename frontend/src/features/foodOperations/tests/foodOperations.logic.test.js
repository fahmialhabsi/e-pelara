import { describe, expect, it } from 'vitest';
import { isUploadFormValid } from '../components/FoodOpsDocumentUploadModal';
import { isRegulationFormValid } from '../components/FoodOpsRegulationForm';
import { isEventFormValid } from '../components/FoodOpsEventForm';
import { getConfidenceVariant } from '../components/FoodOpsRecallBadge';
import { DOCUMENT_TYPE_LABEL, DOCUMENT_CLASS_LABEL } from '../services/foodOpsConstants';
import foodOperationsRoutes from '../../../routes/foodOperationsRoutes';

// Evidence & Operasi Pangan — Phase 0 (mandat §64). Vitest config repo ini
// memakai `environment: "node"` TANPA @testing-library/react/jsdom (dikonfirmasi
// dari vite.config.js + package.json) — konsisten dgn seluruh test frontend
// existing (mis. EntityBuktiManager.identity.test.js), yang murni menguji
// fungsi logic yang di-export, BUKAN me-render komponen ke DOM. Test di sini
// mengikuti konvensi yang SAMA PERSIS, bukan pola baru.

describe('foodOperationsRoutes (route array shape — mandat §64 "route renders")', () => {
  it('mendaftarkan 4 route Phase 0 dgn path yang benar', () => {
    const paths = foodOperationsRoutes.map((r) => r.path);
    expect(paths).toEqual([
      'food-operations/dashboard',
      'food-operations/documents',
      'food-operations/regulations',
      'food-operations/events',
    ]);
  });
  it('setiap route punya element React yang valid', () => {
    foodOperationsRoutes.forEach((r) => { expect(r.element).toBeTruthy(); });
  });
});

describe('FoodOpsDocumentUploadModal — isUploadFormValid ("document list"/upload basic validation)', () => {
  it('valid bila judul+class+type+file lengkap', () => {
    expect(isUploadFormValid({ judul: 'X', document_class: 'OTHER', document_type: 'other' }, { name: 'a.pdf' })).toBe(true);
  });
  it('tidak valid bila file belum dipilih', () => {
    expect(isUploadFormValid({ judul: 'X', document_class: 'OTHER', document_type: 'other' }, null)).toBe(false);
  });
  it('tidak valid bila judul kosong', () => {
    expect(isUploadFormValid({ judul: '', document_class: 'OTHER', document_type: 'other' }, { name: 'a.pdf' })).toBe(false);
  });
});

describe('FoodOpsRegulationForm — isRegulationFormValid (basic validation)', () => {
  it('valid saat create dgn document_id + jenis_produk_hukum terisi', () => {
    expect(isRegulationFormValid({ document_id: 5, jenis_produk_hukum: 'pergub' }, false)).toBe(true);
  });
  it('tidak valid saat create tanpa document_id', () => {
    expect(isRegulationFormValid({ document_id: '', jenis_produk_hukum: 'pergub' }, false)).toBe(false);
  });
  it('valid saat edit walau document_id tidak dikirim ulang (sudah terikat)', () => {
    expect(isRegulationFormValid({ document_id: '', jenis_produk_hukum: 'pergub' }, true)).toBe(true);
  });
  it('tidak valid bila jenis_produk_hukum kosong', () => {
    expect(isRegulationFormValid({ document_id: 5, jenis_produk_hukum: '' }, false)).toBe(false);
  });
});

describe('FoodOpsEventForm — isEventFormValid (basic validation)', () => {
  it('valid bila event_type+tahun+tanggal_mulai+nama_kegiatan lengkap', () => {
    expect(isEventFormValid({ event_type: 'RAKOR', tahun: '2026', tanggal_mulai: '2026-01-01', nama_kegiatan: 'Rakor' })).toBe(true);
  });
  it('tidak valid bila nama_kegiatan kosong', () => {
    expect(isEventFormValid({ event_type: 'RAKOR', tahun: '2026', tanggal_mulai: '2026-01-01', nama_kegiatan: '' })).toBe(false);
  });
});

describe('FoodOpsRecallBadge — getConfidenceVariant (provenance display mapping)', () => {
  it('HIGH -> success, MEDIUM -> warning, LOW/NONE -> secondary', () => {
    expect(getConfidenceVariant('HIGH')).toBe('success');
    expect(getConfidenceVariant('MEDIUM')).toBe('warning');
    expect(getConfidenceVariant('LOW')).toBe('secondary');
    expect(getConfidenceVariant('NONE')).toBe('secondary');
    expect(getConfidenceVariant(undefined)).toBe('secondary');
  });
});

describe('foodOpsConstants — kelengkapan vocabulary (mencegah drift dgn backend)', () => {
  it('DOCUMENT_TYPE_LABEL memuat seluruh minimum tipe mandat §6/§28', () => {
    const wajib = ['peraturan_gubernur', 'peraturan_daerah', 'keputusan_gubernur', 'surat_keputusan', 'surat_tugas', 'undangan', 'daftar_hadir', 'notulen', 'berita_acara', 'laporan', 'other'];
    wajib.forEach((k) => expect(DOCUMENT_TYPE_LABEL).toHaveProperty(k));
  });
  it('DOCUMENT_CLASS_LABEL memuat 5 class Phase 0', () => {
    expect(Object.keys(DOCUMENT_CLASS_LABEL).sort()).toEqual(['ACTIVITY_DOCUMENT', 'OPERATIONAL_EVIDENCE', 'OTHER', 'REGULATION', 'REPORT'].sort());
  });
});
