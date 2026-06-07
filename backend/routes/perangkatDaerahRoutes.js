const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/perangkatDaerahController');
const verifyToken = require('../middlewares/verifyToken');
const allowRoles = require('../middlewares/allowRoles');

const READ_ROLES = ['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA'];
const WRITE_ROLES = ['SUPER_ADMIN', 'ADMINISTRATOR'];

router.get('/', verifyToken, allowRoles(READ_ROLES), ctrl.getAll);
router.get('/:id', verifyToken, allowRoles(READ_ROLES), ctrl.getById);
router.post('/', verifyToken, allowRoles(WRITE_ROLES), ctrl.create);
router.put('/:id', verifyToken, allowRoles(WRITE_ROLES), ctrl.update);
router.delete('/:id', verifyToken, allowRoles(WRITE_ROLES), ctrl.remove);

module.exports = router;
