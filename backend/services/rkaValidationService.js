// File: services/rkaValidationService.js
const Joi = require('joi');
const { Renja, RenjaItem } = require('../models');

// 1. Definisikan Sub-Skema untuk elemen Koefisien (Multi-Volume)
const koefisienItemSchema = Joi.object({
  volume: Joi.number().min(0).required().messages({
    'number.base': 'Volume koefisien harus berupa angka.',
    'number.min': 'Volume koefisien tidak boleh minus.',
    'any.required': 'Volume koefisien wajib diisi.',
  }),
  satuan: Joi.string().trim().required().messages({
    'string.empty': 'Satuan koefisien tidak boleh kosong.',
    'any.required': 'Satuan koefisien wajib diisi.',
  }),
});

// 2. Definisikan Skema Validasi Utama untuk Request Payload RKA
const rkaCreateSchema = Joi.object({
  tahun: Joi.string().required().messages({ 'any.required': 'Tahun anggaran wajib diisi.' }),
  periode_id: Joi.number()
    .integer()
    .required()
    .messages({ 'any.required': 'Periode RPJMD wajib diisi.' }),
  opd_id: Joi.number()
    .integer()
    .required()
    .messages({ 'any.required': 'OPD Penanggung Jawab wajib ditentukan.' }),
  urusan: Joi.string().allow(null, ''),
  kode_urusan: Joi.string().allow(null, ''),
  bidang_urusan: Joi.string().allow(null, ''),
  kode_bidang_urusan: Joi.string().allow(null, ''),
  program: Joi.string().required().messages({ 'any.required': 'Nama/Kode Program wajib diisi.' }),
  kegiatan: Joi.string().required().messages({ 'any.required': 'Nama/Kode Kegiatan wajib diisi.' }),
  sub_kegiatan: Joi.string()
    .required()
    .messages({ 'any.required': 'Nama/Kode Sub Kegiatan wajib diisi.' }),

  // Tahapan menggunakan string tunggal (Tanpa kurung siku pada allow)
  tahapan: Joi.string()
    .valid('APBD_INDUK', 'PERGESERAN_1', 'PERGESERAN_2', 'APBD_PERUBAHAN')
    .default('APBD_INDUK'),

  indikator: Joi.string().allow(null, ''),
  target: Joi.string().allow(null, ''),
  jenis_dokumen: Joi.string().allow(null, '').default('RKA'),
  renja_id: Joi.number().integer().allow(null),
  // Indikator & Tolok Ukur Kinerja (Permendagri 77/2020)
  kode_program: Joi.string().allow(null, ''),
  kode_kegiatan: Joi.string().allow(null, ''),
  kode_sub_kegiatan: Joi.string().allow(null, ''),
  capaian_program: Joi.string().allow(null, ''),
  target_capaian: Joi.string().allow(null, ''),
  satuan_capaian: Joi.string().allow(null, ''),
  masukan: Joi.string().allow(null, ''),
  keluaran: Joi.string().allow(null, ''),
  target_keluaran: Joi.string().allow(null, ''),
  satuan_keluaran: Joi.string().allow(null, ''),
  hasil: Joi.string().allow(null, ''),
  target_hasil: Joi.string().allow(null, ''),
  satuan_hasil: Joi.string().allow(null, ''),
  waktu_mulai: Joi.string().allow(null, ''),
  waktu_selesai: Joi.string().allow(null, ''),
  lokasi: Joi.string().allow(null, ''),
  // Validasi Array Rincian Belanja
  rincian_belanja: Joi.array()
    .items(
      Joi.object({
        kode_rekening: Joi.string()
          .required()
          .messages({ 'any.required': 'Kode rekening belanja wajib diisi.' }),
        nama_rekening: Joi.string().allow(null, ''),
        uraian: Joi.string().required().messages({
          'any.required': 'Uraian belanja wajib diisi.',
        }),

        spesifikasi: Joi.string().allow(null, ''),
        volume_hasil: Joi.number().min(0).allow(null),
        harga_satuan: Joi.number().min(0).required().messages({
          'number.min': 'Harga satuan tidak boleh minus.',
          'any.required': 'Harga satuan wajib diisi.',
        }),
        sumber_dana: Joi.string()
          .valid('PAD', 'DAU', 'DAK Fisik', 'DAK Non Fisik', 'DBH')
          .required(),
        lokasi: Joi.string().allow(null, ''),
        kode_program: Joi.string().allow(null, ''),
        kode_kegiatan: Joi.string().allow(null, ''),
        kode_sub_kegiatan: Joi.string().allow(null, ''),
        capaian_program: Joi.string().allow(null, ''),
        target_capaian: Joi.string().allow(null, ''),
        satuan_capaian: Joi.string().allow(null, ''),
        masukan: Joi.string().allow(null, ''),
        keluaran: Joi.string().allow(null, ''),
        target_keluaran: Joi.string().allow(null, ''),
        satuan_keluaran: Joi.string().allow(null, ''),
        hasil: Joi.string().allow(null, ''),
        target_hasil: Joi.string().allow(null, ''),
        satuan_hasil: Joi.string().allow(null, ''),
        waktu_mulai: Joi.string().allow(null, ''),
        waktu_selesai: Joi.string().allow(null, ''),
        keterangan: Joi.string().allow(null, ''),
        koefisien_array: Joi.array().items(koefisienItemSchema).min(1).required(),
      }),
    )
    .allow(null), // Menggunakan allow(null) saja untuk array kosong
});

// Skema untuk Update
const rkaUpdateSchema = rkaCreateSchema.fork(
  ['tahun', 'periode_id', 'opd_id', 'program', 'kegiatan', 'sub_kegiatan'],
  (schema) => schema.optional(),
);

/**
 * Memvalidasi payload mentah menggunakan Joi Schema
 */
function validatePayload(data, isUpdate = false) {
  const schema = isUpdate ? rkaUpdateSchema : rkaCreateSchema;
  const { error, value } = schema.validate(data, { abortEarly: false, stripUnknown: true });

  if (error) {
    const details = error.details.map((err) => err.message);
    const errException = new Error('Validasi dokumen RKA gagal.');
    errException.status = 400;
    errException.details = details;
    throw errException;
  }
  return value;
}

/**
 * Validasi Batasan Pagu Belanja
 */
async function validatePaguRenja(renjaId, totalBelanjaBaru) {
  if (!renjaId) return;
  // renjaId di RKA merujuk ke renja_item.id, bukan renja.id
  const renjaItem = await RenjaItem.findByPk(renjaId, { attributes: ['id', 'pagu'] });
  if (!renjaItem) {
    const err = new Error('Referensi item Renja tidak ditemukan.');
    err.status = 400;
    throw err;
  }
  const paguMaksimal = Number(renjaItem.pagu || 0);
  if (paguMaksimal > 0 && totalBelanjaBaru > paguMaksimal) {
    const err = new Error(
      `Total rincian belanja (${totalBelanjaBaru.toLocaleString('id-ID')}) melampaui Pagu Renja (${paguMaksimal.toLocaleString('id-ID')}).`,
    );
    err.status = 400;
    throw err;
  }
}

module.exports = {
  validatePayload,
  validatePaguRenja,
};
