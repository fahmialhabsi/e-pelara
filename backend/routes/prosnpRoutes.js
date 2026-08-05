'use strict';

const express = require('express');
const controller = require('../controllers/prosnpController');
const verifyToken = require('../middlewares/verifyToken');
const allowRoles = require('../middlewares/allowRoles');
const { uploadSingle } = require('../middlewares/prosnpUpload');

const router = express.Router();
const READ = ['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA'];
const ADMIN = ['SUPER_ADMIN', 'ADMINISTRATOR'];
const WRITE = ['SUPER_ADMIN', 'ADMINISTRATOR', 'PELAKSANA'];
const REVIEW = ['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS'];
const INPUT = ['SUPER_ADMIN', 'ADMINISTRATOR', 'PROSN_INPUT'];

router.get('/periode', verifyToken, allowRoles(READ), controller.listPeriode);
router.get('/konteks', verifyToken, allowRoles(READ), controller.getKonteks);
router.post('/periode', verifyToken, allowRoles(ADMIN), controller.createPeriode);
router.get('/periode/:id', verifyToken, allowRoles(READ), controller.getPeriode);
router.post('/periode/:id/indikator', verifyToken, allowRoles(ADMIN), controller.createIndikator);
router.post('/periode/:id/inisialisasi-indikator', verifyToken, allowRoles(ADMIN), controller.initializeIndikator);
router.post('/periode/:id/aktifkan', verifyToken, allowRoles(ADMIN), controller.activatePeriode);
router.post('/periode/:id/arsipkan', verifyToken, allowRoles(INPUT), controller.archivePeriode);
router.post('/periode/:id/buka-kembali', verifyToken, allowRoles(ADMIN), controller.reopenPeriode);
router.get('/periode/:id/ekspor/excel', verifyToken, allowRoles(READ), controller.exportExcel);
router.get('/pengisian/:id', verifyToken, allowRoles(READ), controller.getPengisian);
router.put('/pengisian/:id', verifyToken, allowRoles(WRITE), controller.updatePengisian);
router.post('/pengisian/:id/transisi', verifyToken, allowRoles(READ), controller.transitionPengisian);
router.post('/pengisian/:id/pemeriksaan', verifyToken, allowRoles(REVIEW), controller.periksaPengisian);
router.post('/pengisian/:id/bukti', verifyToken, allowRoles(WRITE), uploadSingle, controller.createBukti);
router.post('/bukti/:id/versi', verifyToken, allowRoles(WRITE), uploadSingle, controller.reviseBukti);
router.get('/bukti/:id/download', verifyToken, allowRoles(READ), controller.downloadBukti);
router.patch('/bukti-relasi/:id/checklist', verifyToken, allowRoles(REVIEW), controller.checklistBukti);

module.exports = router;
