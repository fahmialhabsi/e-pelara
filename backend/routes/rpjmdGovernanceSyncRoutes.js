'use strict';

const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/verifyToken');
const allowRoles = require('../middlewares/allowRoles');
const controller = require('../controllers/rpjmdGovernanceSyncController');

const PREVIEW_ROLES = ['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS'];
const EXECUTE_ROLES = ['SUPER_ADMIN'];
const INDICATOR_SYNC_ROLES = ['SUPER_ADMIN'];
const INDICATOR_HEALTH_ROLES = ['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS'];
const INDICATOR_REPAIR_PREVIEW_ROLES = ['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS'];
const INDICATOR_REPAIR_EXECUTE_ROLES = ['SUPER_ADMIN'];
const INDICATOR_SMART_SYNC_ROLES = ['SUPER_ADMIN'];
const RESOLVER_ROLES = ['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA'];
const PREPARED_SOURCE_ROLES = ['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS', 'PELAKSANA'];
const MONITORING_ROLES = ['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS'];

router.post('/preview', verifyToken, allowRoles(PREVIEW_ROLES), controller.preview);
router.post('/execute', verifyToken, allowRoles(EXECUTE_ROLES), controller.execute);
router.post('/indicators/sync', verifyToken, allowRoles(INDICATOR_SYNC_ROLES), controller.syncIndicators);
router.get('/indicator-health', verifyToken, allowRoles(INDICATOR_HEALTH_ROLES), controller.indicatorHealth);
router.post('/indicator-repair/preview', verifyToken, allowRoles(INDICATOR_REPAIR_PREVIEW_ROLES), controller.indicatorRepairPreview);
router.post('/indicator-repair/execute', verifyToken, allowRoles(INDICATOR_REPAIR_EXECUTE_ROLES), controller.indicatorRepairExecute);
router.post('/indicators/smart-sync', verifyToken, allowRoles(INDICATOR_SMART_SYNC_ROLES), controller.smartSyncIndicators);
router.post('/sub-kegiatan/provision-target', verifyToken, allowRoles(['SUPER_ADMIN']), controller.provisionSubKegiatanTarget);
router.get('/source-map', verifyToken, allowRoles(RESOLVER_ROLES), controller.resolveSourceMap);
router.get('/prepared-source', verifyToken, allowRoles(PREPARED_SOURCE_ROLES), controller.preparedSource);
router.get('/jobs', verifyToken, allowRoles(MONITORING_ROLES), controller.listJobs);
router.get('/jobs/:jobId', verifyToken, allowRoles(MONITORING_ROLES), controller.getJobDetail);
router.get('/jobs/:jobId/items', verifyToken, allowRoles(MONITORING_ROLES), controller.listJobItems);
router.get('/jobs/:jobId/audit-logs', verifyToken, allowRoles(MONITORING_ROLES), controller.listJobAuditLogs);

module.exports = router;
