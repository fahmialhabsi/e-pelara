const express = require('express');
const router = express.Router();
const DpaController = require('../controllers/dpaController');
const verifyToken = require('../middlewares/verifyToken');
const allowRoles = require('../middlewares/allowRoles');
const guardApproved = require('../middlewares/guardApproved');
const requireChangeReason = require('../middlewares/requireChangeReason');

router.get(
  '/',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA']),
  DpaController.getAll,
);

router.get(
  '/:id/realisasi-bulanan',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA']),
  DpaController.getRealisasiBulanan,
);
router.post(
  '/:id/realisasi-bulanan',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR']),
  DpaController.saveRealisasiBulanan,
);
router.get(
  '/:id/export-pdf',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA']),
  DpaController.exportPdf,
);
router.get(
  '/:id/export-sebelum-perubahan',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA']),
  DpaController.exportPdfSebelumPerubahan,
);
router.get(
  '/:id/audit',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA']),
  DpaController.getAudit,
);

router.get(
  '/:id/rincian-detail-perubahan',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA']),
  DpaController.getRincianDetailPerubahan,
);

router.get(
  '/:id',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA']),
  DpaController.getById,
);

router.post(
  '/generate-from-rka/:rka_id',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR']),
  DpaController.generateFromRka,
);
router.post('/', verifyToken, allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR']), DpaController.create);

router.put(
  '/:id',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR']),
  guardApproved('dpa'),
  requireChangeReason,
  DpaController.update,
);

router.delete(
  '/:id',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR']),
  guardApproved('dpa'),
  requireChangeReason,
  DpaController.destroy,
);

module.exports = router;
