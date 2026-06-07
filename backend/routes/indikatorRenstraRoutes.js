const express = require('express');
const router = express.Router();
const controller = require('../controllers/renstra_indikatorController');
const verifyToken = require('../middlewares/verifyToken');
const allowRoles = require('../middlewares/allowRoles');

router.get(
  '/',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA']),
  controller.findAll,
);

router.get(
  '/aktif',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA']),
  controller.getRenstraAktif,
);

router.get(
  '/indikatorprograms',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA']),
  controller.getIndikatorProgram,
);

router.get(
  '/indikatorkegiatans',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA']),
  controller.getIndikatorKegiatan,
);

router.get(
  '/indikatorsubkegiatans',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA']),
  controller.getIndikatorSubKegiatan,
);

router.get(
  '/validate/hierarchy',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA']),
  controller.validateHierarchy,
);

// Endpoint 1: Untuk mengambil data dropdown cascading berdasarkan parent level struktural
router.get(
  '/cascading/list',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA']),
  controller.getCascadingList,
);

// Endpoint 2: Untuk melacak penularan dampak risiko ke atas (Risk Propagation)
router.get(
  '/:id/propagation',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA']),
  controller.getRiskPropagation,
);

router.get(
  '/:id',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA']),
  controller.findOne,
);

router.post('/', verifyToken, allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR']), controller.create);

router.post(
  '/import',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR']),
  controller.importFromRPJMD,
);

router.put('/:id', verifyToken, allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR']), controller.update);

router.delete('/:id', verifyToken, allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR']), controller.delete);

module.exports = router;
