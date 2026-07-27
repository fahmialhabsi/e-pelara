const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/verifyToken');
const allowRoles = require('../middlewares/allowRoles');
const ctrl = require('../controllers/lakipPkController');

const ALL_ROLES = ['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA'];
const WRITE_ROLES = ['SUPER_ADMIN', 'ADMINISTRATOR'];

router.get('/', verifyToken, allowRoles(ALL_ROLES), ctrl.getDetail);
router.put('/', verifyToken, allowRoles(WRITE_ROLES), ctrl.save);
router.put('/ikm', verifyToken, allowRoles(WRITE_ROLES), ctrl.saveIkm);
router.get(
  '/program-anggaran-live',
  verifyToken,
  allowRoles(ALL_ROLES),
  ctrl.getProgramAnggaranLive,
);
router.get('/sasaran-options', verifyToken, allowRoles(ALL_ROLES), ctrl.getSasaranOptions);
router.put('/sasaran-options/:id', verifyToken, allowRoles(WRITE_ROLES), ctrl.setIsIkuPk);
router.get(
  '/kegiatan-output',
  verifyToken,
  allowRoles(ALL_ROLES),
  ctrl.getKegiatanOutputUntukSasaran,
);

const exportCtrl = require('../controllers/lakipPkExportController');
router.get('/export/preview', verifyToken, allowRoles(ALL_ROLES), exportCtrl.preview);
router.get('/export/pdf', verifyToken, allowRoles(ALL_ROLES), exportCtrl.exportPdf);
router.get('/export/docx', verifyToken, allowRoles(ALL_ROLES), exportCtrl.exportDocx);

module.exports = router;
