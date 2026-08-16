// File: routes/renstraBabRoutes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const renstraBabController = require('../controllers/renstraBabController');
const verifyToken = require('../middlewares/verifyToken');
const allowRoles = require('../middlewares/allowRoles');

// Sprint 3 — S3-01: sebelumnya seluruh route di file ini tidak memiliki
// verifyToken/allowRoles sama sekali (termasuk PUT, sebuah mutation nyata),
// sehingga bisa diakses tanpa autentikasi. Pola role di bawah disamakan
// persis dengan sibling route Renstra lain (lihat
// routes/renstra_tabelTujuanRoutes.js): baca = 4 role terautentikasi,
// tulis = SUPER_ADMIN/ADMINISTRATOR saja.
const READ_ROLES = ['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA'];
const WRITE_ROLES = ['SUPER_ADMIN', 'ADMINISTRATOR'];

router.get(
  '/:id/kinerja',
  verifyToken,
  allowRoles(READ_ROLES),
  renstraBabController.getKinerja
);

// GET 1 bab (isi: array subbab)
router.get(
  '/:tahun/bab/:bab',
  verifyToken,
  allowRoles(READ_ROLES),
  renstraBabController.getBab
);

// PUT 1 bab (isi: array subbab/tabel dinamis)
router.put(
  '/:tahun/bab/:bab',
  verifyToken,
  allowRoles(WRITE_ROLES),
  [
    body('judul_bab').notEmpty().withMessage('Judul bab wajib diisi'),
    body('subbabList')
      .isArray({ min: 1 })
      .withMessage('subbabList harus berupa array dengan minimal satu elemen'),
    body('subbabList.*.nomor').notEmpty().withMessage('Nomor subbab wajib diisi'),
    body('subbabList.*.judul').notEmpty().withMessage('Judul subbab wajib diisi'),
    body('subbabList.*.isi').notEmpty().withMessage('Isi subbab wajib diisi'),
  ],
  renstraBabController.updateBab,
);

module.exports = router;
