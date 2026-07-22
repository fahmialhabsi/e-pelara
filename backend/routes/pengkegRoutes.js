const express = require('express');
const router = express.Router();
const PengkegController = require('../controllers/pengkegController');
const verifyToken = require('../middlewares/verifyToken');
const allowRoles = require('../middlewares/allowRoles');

router.get(
  '/',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA']),
  PengkegController.getAll,
);

router.get(
  '/:id',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA']),
  PengkegController.getById,
);

router.post(
  '/',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR']),
  PengkegController.create,
);

router.put(
  '/:id',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR']),
  PengkegController.update,
);

router.delete(
  '/:id',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR']),
  PengkegController.destroy,
);

router.get(
  '/dpa-options/list',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA']),
  PengkegController.dpaOptions,
);

router.get(
  '/dpa-realisasi/:dpaId',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA']),
  PengkegController.dpaRealisasiKeuangan,
);

module.exports = router;
