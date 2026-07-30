const express = require('express');
const controller = require('../controllers/sdiDaftarDataController');
const verifyToken = require('../middlewares/verifyToken');
const allowRoles = require('../middlewares/allowRoles');
const router = express.Router();

const READ_ROLES = ['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA'];
const WRITE_ROLES = ['SUPER_ADMIN', 'ADMINISTRATOR'];

// Rute spesifik didaftarkan sebelum '/:id' agar tidak tertangkap sebagai id.
router.get('/kelengkapan', verifyToken, allowRoles(READ_ROLES), controller.kelengkapan);
router.get('/export/excel', verifyToken, allowRoles(READ_ROLES), controller.exportExcel);
router.get('/export/pdf', verifyToken, allowRoles(READ_ROLES), controller.exportPdf);
router.get(
  '/tarik-renstra/preview',
  verifyToken,
  allowRoles(WRITE_ROLES),
  controller.previewTarikRenstra,
);
router.post('/tarik-renstra', verifyToken, allowRoles(WRITE_ROLES), controller.tarikRenstra);
router.get('/sinkron/periksa', verifyToken, allowRoles(READ_ROLES), controller.periksaSinkron);
router.post('/sinkron/segarkan', verifyToken, allowRoles(WRITE_ROLES), controller.segarkanSinkron);
router.get('/autofill/preview', verifyToken, allowRoles(WRITE_ROLES), controller.previewAutofill);
router.post('/autofill/terapkan', verifyToken, allowRoles(WRITE_ROLES), controller.terapkanAutofill);

router.get('/', verifyToken, allowRoles(READ_ROLES), controller.findAll);
router.get('/:id', verifyToken, allowRoles(READ_ROLES), controller.findOne);
router.post('/', verifyToken, allowRoles(WRITE_ROLES), controller.create);
router.put('/:id', verifyToken, allowRoles(WRITE_ROLES), controller.update);
router.delete('/:id', verifyToken, allowRoles(WRITE_ROLES), controller.delete);

module.exports = router;
