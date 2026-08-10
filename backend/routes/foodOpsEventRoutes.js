'use strict';

const express = require('express');
const controller = require('../controllers/foodOpsEventController');
const verifyToken = require('../middlewares/verifyToken');
const allowRoles = require('../middlewares/allowRoles');

const router = express.Router();
const READ = ['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA'];
const WRITE = ['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA'];
const DELETE_LINK = ['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS'];

router.get('/events', verifyToken, allowRoles(READ), controller.listEvents);
router.post('/events', verifyToken, allowRoles(WRITE), controller.createEvent);
router.get('/events/:id', verifyToken, allowRoles(READ), controller.getEventDetail);
router.patch('/events/:id', verifyToken, allowRoles(WRITE), controller.updateEvent);

router.get('/document-links', verifyToken, allowRoles(READ), controller.listLinks);
router.post('/document-links', verifyToken, allowRoles(WRITE), controller.createLink);
router.delete('/document-links/:id', verifyToken, allowRoles(DELETE_LINK), controller.deleteLink);

module.exports = router;
