const express = require('express');
const controller = require('../controllers/renstraReviewKonsistensiController');
const verifyToken = require('../middlewares/verifyToken');
const allowRoles = require('../middlewares/allowRoles');
const router = express.Router();

const READ_ROLES = ['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA'];
const WRITE_ROLES = ['SUPER_ADMIN', 'ADMINISTRATOR'];

router.get('/', verifyToken, allowRoles(READ_ROLES), controller.findAll);
router.get('/:id', verifyToken, allowRoles(READ_ROLES), controller.findOne);
router.post('/', verifyToken, allowRoles(WRITE_ROLES), controller.create);
router.put('/:id', verifyToken, allowRoles(WRITE_ROLES), controller.update);
router.delete('/:id', verifyToken, allowRoles(['SUPER_ADMIN']), controller.delete);

// Eksekusi rekomendasi relokasi + pembatalannya.
router.post('/:id/terapkan', verifyToken, allowRoles(WRITE_ROLES), controller.terapkan);
router.post(
  '/:id/batalkan-terapan',
  verifyToken,
  allowRoles(WRITE_ROLES),
  controller.batalkanTerapan,
);

module.exports = router;
