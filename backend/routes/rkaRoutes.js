const express = require('express');
const router = express.Router();
const RkaController = require('../controllers/rkaController');
const verifyToken = require('../middlewares/verifyToken');
const allowRoles = require('../middlewares/allowRoles');
const guardApproved = require('../middlewares/guardApproved');
const requireChangeReason = require('../middlewares/requireChangeReason');
const { exportExcel, exportWord, exportPdf } = require('../controllers/rkaExportController');

router.get(
  '/',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA']),
  RkaController.getAll,
);

router.get(
  '/:id/audit',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA']),
  RkaController.getAudit,
);

router.get(
  '/:id',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA']),
  RkaController.getById,
);

router.post(
  '/',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR']),
  requireChangeReason,
  RkaController.create,
);

router.put(
  '/:id',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR']),
  guardApproved('rka'),
  requireChangeReason,
  RkaController.update,
);

router.delete(
  '/:id',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR']),
  guardApproved('rka'),
  requireChangeReason,
  RkaController.destroy,
);

// DAFTAR ENDPOINT UNTUK EXPORT DOKUMEN RKA MULTI-FORMULIR
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

module.exports = router;
