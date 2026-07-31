'use strict';

const express = require('express');
const controller = require('../controllers/renjaRecallController');
const verifyToken = require('../middlewares/verifyToken');
const allowRoles = require('../middlewares/allowRoles');
const router = express.Router();

const READ_ROLES = ['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA'];
const WRITE_ROLES = ['SUPER_ADMIN', 'ADMINISTRATOR', 'PELAKSANA'];

router.get('/:id/status', verifyToken, allowRoles(READ_ROLES), controller.statusRecall);
router.post('/:id', verifyToken, allowRoles(WRITE_ROLES), controller.jalankanRecall);
router.post('/tandai/perlu-recall', verifyToken, allowRoles(WRITE_ROLES), controller.tandai);

module.exports = router;
