'use strict';

/**
 * MR Auto-Fill Routes
 * ---------------------------------------------------------------------------
 * Endpoint read-only, hanya mengembalikan data usulan (suggested values)
 * untuk auto-fill MR Planning Context. Tidak ada write ke tabel manapun.
 */

const express = require('express');
const controller = require('../controllers/mr_autoFillController');
const verifyToken = require('../middlewares/verifyToken');
const allowRoles = require('../middlewares/allowRoles');

const router = express.Router();

const READ = ['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA'];

/**
 * Opsi indikator stage 'sasaran' untuk sebuah Renstra (dropdown sasaran+indikator).
 * Diletakkan SEBELUM /:contextId agar "options" tidak tertangkap sebagai contextId.
 *
 * Contoh:
 * GET /api/mr-autofill/options/sasaran-indikator?renstraId=1
 */
router.get(
  '/options/sasaran-indikator',
  verifyToken,
  allowRoles(READ),
  controller.getSasaranIndikatorOptions,
);

/**
 * Opsi data LAKIP untuk sebuah Renstra (dropdown indikator kinerja), difilter
 * berdasarkan tahun aktif jika parameter tahun dikirim.
 * Diletakkan SEBELUM /:contextId agar "options" tidak tertangkap sebagai contextId.
 *
 * Contoh:
 * GET /api/mr-autofill/options/lakip?renstraId=1&tahun=2025
 */
router.get('/options/lakip', verifyToken, allowRoles(READ), controller.getLakipOptions);

/**
 * Opsi akun/pos laporan keuangan (dari Penatausahaan) untuk sebuah Renstra.
 *
 * Contoh:
 * GET /api/mr-autofill/options/laporan-keuangan?renstraId=1&tahun=2025
 */
router.get(
  '/options/laporan-keuangan',
  verifyToken,
  allowRoles(READ),
  controller.getPenatausahaanAkunOptions,
);

/**
 * Opsi temuan tindak lanjut BPK/BPKP/Inspektorat untuk sebuah Renstra.
 * Parameter `entitas` wajib salah satu dari BPK | BPKP | INSPEKTORAT.
 *
 * Contoh:
 * GET /api/mr-autofill/options/temuan?renstraId=1&entitas=BPK&tahun=2025
 */
router.get('/options/temuan', verifyToken, allowRoles(READ), controller.getTemuanOptions);

/**
 * Ambil data usulan auto-fill untuk sebuah MR planning context.
 *
 * Contoh:
 * GET /api/mr-autofill/2
 */
router.get('/:contextId', verifyToken, allowRoles(READ), controller.getAutoFill);

module.exports = router;
