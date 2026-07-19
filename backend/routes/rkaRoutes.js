// File: routes/rkaRoutes.js
const express = require('express');
const router = express.Router();
const RkaController = require('../controllers/rkaController');
const verifyToken = require('../middlewares/verifyToken');
const allowRoles = require('../middlewares/allowRoles');
const guardApproved = require('../middlewares/guardApproved');
const requireChangeReason = require('../middlewares/requireChangeReason');
const {
  exportExcel,
  exportWord,
  exportPdf,
  exportPdfBelanja,
} = require('../controllers/rkaExportController');
const { generateIndikatorRka } = require('../services/rkaGenerateService');
const upload = require('../middlewares/upload');
const { importPdf } = require('../controllers/rkaImportController');

// 1. Ambil semua dokumen RKA (Mendukung filter query ?tahapan=...)
router.get(
  '/',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA']),
  RkaController.getAll,
);

// 2. Log Audit Trail Perubahan Dokumen RKA
router.get(
  '/:id/audit',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA']),
  RkaController.getAudit,
);

// 3. Ambil Detail RKA Berdasarkan ID (Mata Anggaran & Koefisien Terurai)
router.get(
  '/:id',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA']),
  RkaController.getById,
);

// 4. Inisiasi Dokumen RKA Baru (Tahapan APBD Induk)
router.post(
  '/',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR']),
  requireChangeReason,
  RkaController.create,
);

// 4b. Import RKA otomatis dari PDF "Cetak RKA Rincian Belanja" Aplikasi SIPD
router.post(
  '/import-pdf',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR']),
  upload.single('file'),
  importPdf,
);

// 5. Update Rincian Belanja pada Tahapan Berjalan
router.put(
  '/:id',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR']),
  guardApproved('rka'),
  requireChangeReason,
  RkaController.update,
);

/**
 * 🌟 FITUR UNGGULAN: Pemicu Pergeseran / Perubahan Anggaran (Snap-Clone)
 * Endpoint ini memanggil rkaRevisiService untuk menduplikasi RKA aktif ke tahapan berikutnya.
 * Hanya bisa dieksekusi oleh SUPER_ADMIN dan ADMINISTRATOR.
 */
router.post(
  '/:id/revisi',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR']),
  requireChangeReason, // Menuntut alasan mengapa anggaran ini digeser/diubah
  RkaController.pemicuRevisi,
);

// 6. Hapus Dokumen RKA Permanen (Cascading ke Rincian Belanja)
router.delete(
  '/:id',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR']),
  guardApproved('rka'),
  requireChangeReason,
  RkaController.destroy,
);

// --- DAFTAR ENDPOINT UNTUK EXPORT DOKUMEN RKA MULTI-FORMULIR ---
router.get(
  '/:id/export-excel',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA']),
  exportExcel,
);

router.get(
  '/:id/export-word',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA']),
  exportWord,
);

router.get(
  '/:id/export-pdf',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA']),
  exportPdf,
);

router.get(
  '/:id/export-pdf-belanja',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA']),
  exportPdfBelanja,
);

// Generate Indikator & Tolok Ukur Kinerja via AI
router.post(
  '/generate-indikator',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR', 'PELAKSANA']),
  async (req, res) => {
    try {
      const result = await generateIndikatorRka(req.body);
      res.json({ success: true, data: result });
    } catch (e) {
      console.error('[rkaGenerate]', e.message);
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

module.exports = router;
