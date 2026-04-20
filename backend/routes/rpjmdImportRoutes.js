// routes/rpjmdImportRoutes.js
const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const verifyToken = require('../middlewares/verifyToken');
const allowRoles  = require('../middlewares/allowRoles');
const ctrl        = require('../controllers/rpjmdImportController');

// Memory storage — file is parsed in-memory, never written to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const ok = /\.(xlsx|xls)$/i.test(file.originalname);
    cb(ok ? null : new Error('Hanya file Excel (.xlsx/.xls) yang diizinkan'), ok);
  },
});

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMINISTRATOR'];

// GET  /api/rpjmd-import/template  — download blank template
router.get('/template', verifyToken, allowRoles(ADMIN_ROLES), ctrl.downloadTemplate);

// POST /api/rpjmd-import/preview   — validate headers + preview rows (no DB write)
router.post('/preview', verifyToken, allowRoles(ADMIN_ROLES), upload.single('file'), ctrl.previewExcel);

// POST /api/rpjmd-import/upload    — save rows to rpjmd_import_raw
router.post('/upload', verifyToken, allowRoles(ADMIN_ROLES), upload.single('file'), ctrl.uploadBatch);

// POST /api/rpjmd-import/process   — call sp_process_rpjmd_batch
router.post('/process', verifyToken, allowRoles(ADMIN_ROLES), ctrl.processBatch);

// GET  /api/rpjmd-import/status/:batch_id — fetch batch status + logs
router.get('/status/:batch_id', verifyToken, allowRoles(ADMIN_ROLES), ctrl.getBatchStatus);

// GET  /api/rpjmd-import/final-list — read current state from final DB table (never raw/preview)
router.get('/final-list', verifyToken, allowRoles(ADMIN_ROLES), ctrl.listFinal);

module.exports = router;
