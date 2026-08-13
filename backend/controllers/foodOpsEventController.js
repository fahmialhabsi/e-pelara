'use strict';

const eventService = require('../services/foodOperations/foodOpsEventService');
const linkService = require('../services/foodOperations/foodOpsDocumentLinkService');
const { FoodOpsError } = require('../services/foodOperations/foodOpsError');
const { logActivity } = require('../services/auditService');

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data, meta: {} });
const fail = (res, error) => {
  // CORRECTIVE MANDATE UAT-03 — `details` (existing_link_id/existing_entity_id
  // pada FOOD_OPS_EVENT_SOURCE_ALREADY_REGISTERED) harus sampai ke frontend.
  if (error instanceof FoodOpsError) return res.status(error.status).json({ success: false, message: error.message, code: error.code, ...(error.details ? { details: error.details } : {}) });
  console.error('[foodOps]', error);
  return res.status(500).json({ success: false, message: 'Terjadi kesalahan pada modul Evidence & Operasi Pangan.', code: 'FOOD_OPS_INTERNAL_ERROR' });
};

async function listEvents(req, res) {
  try { return ok(res, await eventService.listEvents(req.tenantId, req.query)); } catch (e) { return fail(res, e); }
}
async function createEvent(req, res) {
  try {
    const created = await eventService.createEvent(req.body, req.user, req.tenantId);
    await logActivity(req, 'FOOD_OPS_EVENT_CREATE', 'FoodOpsEvent', created.id, null, { event_type: created.event_type, nama_kegiatan: created.nama_kegiatan });
    return ok(res, created, 201);
  } catch (e) { return fail(res, e); }
}
async function getEventDetail(req, res) {
  try { return ok(res, await eventService.getEventDetail(Number(req.params.id), req.tenantId)); } catch (e) { return fail(res, e); }
}
async function updateEvent(req, res) {
  try {
    const updated = await eventService.updateEvent(Number(req.params.id), req.body, req.user, req.tenantId);
    await logActivity(req, 'FOOD_OPS_EVENT_UPDATE', 'FoodOpsEvent', updated.id, null, { status_tindak_lanjut: updated.status_tindak_lanjut });
    return ok(res, updated);
  } catch (e) { return fail(res, e); }
}

async function listLinks(req, res) {
  try { return ok(res, await linkService.listLinks(req.tenantId, req.query)); } catch (e) { return fail(res, e); }
}
async function createLink(req, res) {
  try {
    const created = await linkService.createLink(req.body, req.user, req.tenantId);
    await logActivity(req, 'FOOD_OPS_LINK_CREATE', 'FoodOpsDocumentLink', created.id, null, { document_id: created.document_id, entity_type: created.entity_type, entity_id: created.entity_id });
    return ok(res, created, 201);
  } catch (e) { return fail(res, e); }
}
async function deleteLink(req, res) {
  try {
    const result = await linkService.unlink(Number(req.params.id), req.tenantId);
    await logActivity(req, 'FOOD_OPS_LINK_DELETE', 'FoodOpsDocumentLink', result.id, null, null);
    return ok(res, result);
  } catch (e) { return fail(res, e); }
}

module.exports = { listEvents, createEvent, getEventDetail, updateEvent, listLinks, createLink, deleteLink };
