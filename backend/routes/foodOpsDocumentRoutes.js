'use strict';

const express = require('express');
const controller = require('../controllers/foodOpsDocumentController');
const verifyToken = require('../middlewares/verifyToken');
const allowRoles = require('../middlewares/allowRoles');
const { uploadSingle } = require('../middlewares/foodOpsUpload');

const router = express.Router();
const READ = ['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA'];
const WRITE = ['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA'];
const VERIFY = ['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS'];

router.get('/documents', verifyToken, allowRoles(READ), controller.listDocuments);
router.post('/documents', verifyToken, allowRoles(WRITE), uploadSingle, controller.createDocument);
router.get('/documents/:id', verifyToken, allowRoles(READ), controller.getDocumentDetail);
router.get('/documents/:id/versions', verifyToken, allowRoles(READ), controller.getVersionHistory);
router.post('/documents/:id/versions', verifyToken, allowRoles(WRITE), uploadSingle, controller.createNewVersion);
router.post('/documents/:id/classify', verifyToken, allowRoles(WRITE), controller.classifyDocument);
router.patch('/documents/:id/verify', verifyToken, allowRoles(VERIFY), controller.verifyDocument);
router.get('/documents/:id/download', verifyToken, allowRoles(READ), controller.downloadDocument);

module.exports = router;
