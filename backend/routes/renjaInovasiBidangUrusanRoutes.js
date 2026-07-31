'use strict';

const express = require('express');
const controller = require('../controllers/renjaInovasiBidangUrusanController');
const verifyToken = require('../middlewares/verifyToken');
const allowRoles = require('../middlewares/allowRoles');
const router = express.Router();

const READ_ROLES = ['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA'];
const WRITE_ROLES = ['SUPER_ADMIN', 'ADMINISTRATOR', 'PELAKSANA'];

// Rute spesifik didaftarkan sebelum '/:id' agar tidak tertangkap sebagai id.
router.get('/rekap', verifyToken, allowRoles(READ_ROLES), controller.rekap);
router.get('/recall/preview', verifyToken, allowRoles(WRITE_ROLES), controller.previewRecall);
router.post('/recall/terapkan', verifyToken, allowRoles(WRITE_ROLES), controller.terapkanRecall);

router.get('/', verifyToken, allowRoles(READ_ROLES), controller.findAll);
router.get('/:id', verifyToken, allowRoles(READ_ROLES), controller.findOne);
router.post('/', verifyToken, allowRoles(WRITE_ROLES), controller.create);
router.put('/:id', verifyToken, allowRoles(WRITE_ROLES), controller.update);
router.delete('/:id', verifyToken, allowRoles(WRITE_ROLES), controller.delete);

module.exports = router;
