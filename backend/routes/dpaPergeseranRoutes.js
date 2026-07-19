const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/dpaPergeseranController');
const verifyToken = require('../middlewares/verifyToken');
const allowRoles = require('../middlewares/allowRoles');

const AUTH = [verifyToken, allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA'])];
const ADMIN = [verifyToken, allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR'])];

// --- ROUTE STATIS (harus di atas route dinamis /:dpa_id) ---
router.get('/master-rekening', ...AUTH, ctrl.searchMasterRekening);
router.get('/opd/:opd_id/export-setelah-perubahan', ...AUTH, ctrl.exportPdfSetelahPerubahanOpd);
router.put('/pergeseran/:id/setujui', ...ADMIN, ctrl.setujuiPergeseran);
router.delete('/pergeseran/:id', ...ADMIN, ctrl.deletePergeseran);
router.get('/pergeseran/:id/export-pdf', ...AUTH, ctrl.exportPdfPergeseran);
router.put('/perubahan/:id/setujui', ...ADMIN, ctrl.setujuiPerubahan);

// --- ROUTE DINAMIS /:dpa_id ---
router.get('/:dpa_id/rincian-rekening', ...AUTH, ctrl.getRincianRekening);
router.get('/:dpa_id/dpa-tujuan', ...AUTH, ctrl.getDpaTujuan);
router.get('/:dpa_id/pergeseran', ...AUTH, ctrl.listPergeseran);
router.post('/:dpa_id/pergeseran', ...ADMIN, ctrl.createPergeseran);
router.get('/:dpa_id/perubahan', ...AUTH, ctrl.getPerubahan);
router.post('/:dpa_id/perubahan', ...ADMIN, ctrl.savePerubahan);
router.get('/:dpa_id/perubahan/export-pdf', ...AUTH, ctrl.exportPdfPerubahan);

module.exports = router;
