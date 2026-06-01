'use strict';

const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/masterKodeRekeningBelanjaController');
const verifyToken = require('../middlewares/verifyToken');
const allowRoles = require('../middlewares/allowRoles');

// GET all / by parent
router.get(
  '/',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA']),
  ctrl.getByParent,
);

// GET detail by kode
router.get(
  '/detail/:kode',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA']),
  ctrl.getByKode,
);

module.exports = router;
