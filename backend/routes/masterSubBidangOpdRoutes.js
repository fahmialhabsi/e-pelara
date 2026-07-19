const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/masterSubBidangOpdController');
const verifyToken = require('../middlewares/verifyToken');
const allowRoles = require('../middlewares/allowRoles');

router.get(
  '/',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA']),
  ctrl.findAll,
);

module.exports = router;
