const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const pejabatController = require('../controllers/pejabatPenandatanganController');
const verifyToken = require('../middlewares/verifyToken');
const allowRoles = require('../middlewares/allowRoles');

// Multer khusus gambar tanda tangan/cap — dibatasi tipe & ukuran (beda dari
// middleware upload umum yang menerima segala jenis file), karena ini akan
// dirender langsung sebagai gambar di dokumen resmi PDF/Word.
const uploadGambarTtd = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
    filename: (req, file, cb) => {
      const unik = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `ttd-${unik}${path.extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const izinkan = ['image/png', 'image/jpeg'].includes(file.mimetype);
    cb(izinkan ? null : new Error('Hanya file PNG/JPG yang diizinkan'), izinkan);
  },
});

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

router.post(
  '/upload-gambar',
  verifyToken,
  allowRoles(['SUPER_ADMIN', 'ADMINISTRATOR']),
  uploadGambarTtd.single('file'),
  pejabatController.uploadGambar,
);

module.exports = router;
