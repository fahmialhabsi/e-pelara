'use strict';

const express = require('express');
const controller = require('../controllers/renjaTabelCController');
const verifyToken = require('../middlewares/verifyToken');
const allowRoles = require('../middlewares/allowRoles');
const router = express.Router();

const READ_ROLES = ['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA'];

router.get('/keselarasan', verifyToken, allowRoles(READ_ROLES), controller.keselarasan);
router.get('/', verifyToken, allowRoles(READ_ROLES), controller.ringkasan);

module.exports = router;
