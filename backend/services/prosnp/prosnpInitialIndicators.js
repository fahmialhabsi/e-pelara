'use strict';

const db = require('../../models');

const INITIAL_INDICATORS = [
  { kode: 'B.1.1', nama: 'Dukungan Program dan Anggaran ProSN B.1.1', tipe_form: 'dukungan_program', satuan_default: 'rupiah/kegiatan', urutan: 10, konfigurasi_form: { required: ['program', 'kegiatan', 'anggaran_target', 'anggaran_realisasi'], fields: ['program', 'kegiatan', 'sub_kegiatan', 'anggaran_target', 'anggaran_realisasi', 'lokasi'] } },
  { kode: 'B.1.2', nama: 'Dukungan Program dan Anggaran ProSN B.1.2', tipe_form: 'dukungan_program', satuan_default: 'rupiah/kegiatan', urutan: 20, konfigurasi_form: { required: ['program', 'kegiatan', 'anggaran_target', 'anggaran_realisasi'], fields: ['program', 'kegiatan', 'sub_kegiatan', 'anggaran_target', 'anggaran_realisasi', 'lokasi'] } },
  { kode: 'B.1.3', nama: 'Rasio Ketersediaan Stok Beras', tipe_form: 'target_capaian_rasio', satuan_default: 'persen', rumus: '(pembilang / penyebut) * 100', urutan: 30, konfigurasi_form: { required: ['pembilang', 'penyebut', 'periode_pengukuran'], formula: '(pembilang / penyebut) * 100', fields: ['pembilang', 'penyebut', 'periode_pengukuran', 'metode'] } },
  { kode: 'B.1.4', nama: 'Capaian Indikator Utama ProSN B.1.4', tipe_form: 'target_capaian_rasio', satuan_default: 'persen', urutan: 40, konfigurasi_form: { required: ['pembilang', 'penyebut', 'periode_pengukuran'], fields: ['pembilang', 'penyebut', 'periode_pengukuran', 'metode'] } },
];

async function initializeInitialIndicators({ periode, actorId = null, transaction }) {
  const rows = INITIAL_INDICATORS.map((item) => ({ ...item, tenant_id: periode.tenant_id, periode_id: periode.id, wajib_bukti: true, minimum_bukti: 1, created_by: actorId, updated_by: actorId }));
  await db.ProsnIndikator.bulkCreate(rows, { ignoreDuplicates: true, transaction });
  return rows.length;
}

module.exports = { INITIAL_INDICATORS, initializeInitialIndicators };
