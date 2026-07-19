const express = require('express');
const router = express.Router();
const tapdController = require('../controllers/tapdController');
const verifyToken = require('../middlewares/verifyToken');
const allowRoles = require('../middlewares/allowRoles');

router.get(
  '/',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA']),
  tapdController.getByTahun,
);

router.post(
  '/bulk',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR']),
  tapdController.saveBulk,
);

module.exports = router;
