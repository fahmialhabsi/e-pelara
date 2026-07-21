const express = require('express');
const router = express.Router();
const pejabatController = require('../controllers/pejabatPenandatanganController');
const verifyToken = require('../middlewares/verifyToken');
const allowRoles = require('../middlewares/allowRoles');

router.get(
  '/',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA']),
  pejabatController.getByTahun,
);

router.post(
  '/bulk',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR']),
  pejabatController.saveBulk,
);

module.exports = router;
