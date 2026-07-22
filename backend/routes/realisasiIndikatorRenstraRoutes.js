const express = require('express');
const router = express.Router();
const controller = require('../controllers/realisasiIndikatorRenstraController');
const verifyToken = require('../middlewares/verifyToken');
const allowRoles = require('../middlewares/allowRoles');

const READ = ['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA'];
const WRITE = ['SUPER_ADMIN', 'ADMINISTRATOR'];

router.get('/hierarchy', verifyToken, allowRoles(READ), controller.getHierarchy);
router.get('/', verifyToken, allowRoles(READ), controller.getAll);
router.post('/', verifyToken, allowRoles(WRITE), controller.upsert);

module.exports = router;
