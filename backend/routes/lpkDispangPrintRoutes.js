const express = require('express');
const router = express.Router();
const controller = require('../controllers/lpkDispangPrintController');
const verifyToken = require('../middlewares/verifyToken');
const allowRoles = require('../middlewares/allowRoles');

const READ = ['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA'];

// GET /api/lpk-dispang-print/pdf?renstra_id=&tahun=
router.get('/pdf', verifyToken, allowRoles(READ), controller.generatePdf);
// GET /api/lpk-dispang-print/docx?renstra_id=&tahun=
router.get('/docx', verifyToken, allowRoles(READ), controller.generateDocx);
// GET /api/lpk-dispang-print/preview-html?renstra_id=&tahun=  (dev only)
router.get('/preview-html', verifyToken, allowRoles(READ), controller.previewHtml);

module.exports = router;
