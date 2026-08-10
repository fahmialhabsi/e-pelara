'use strict';

const express = require('express');
const controller = require('../controllers/foodOpsRegulationController');
const verifyToken = require('../middlewares/verifyToken');
const allowRoles = require('../middlewares/allowRoles');

const router = express.Router();
const READ = ['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA'];
const WRITE = ['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA'];

router.get('/regulations', verifyToken, allowRoles(READ), controller.listRegulations);
router.post('/regulations', verifyToken, allowRoles(WRITE), controller.createRegulation);
router.get('/regulations/:id', verifyToken, allowRoles(READ), controller.getRegulationDetail);
router.patch('/regulations/:id', verifyToken, allowRoles(WRITE), controller.updateRegulation);

module.exports = router;
