'use strict';

const fs = require('fs');
const documentService = require('../services/foodOperations/foodOpsDocumentService');
const bindingService = require('../services/foodOperations/foodOpsProsnBindingService');
const { FoodOpsError } = require('../services/foodOperations/foodOpsError');
const { logActivity } = require('../services/auditService');

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data, meta: {} });
const fail = (res, error) => {
  // CORRECTIVE MANDATE UAT-01B — `details` (mis. kandidat LIKELY_SAME) harus
  // sampai ke frontend agar bisa menampilkan pilihan resolusi eksplisit;
  // sebelumnya `error.details` selalu dibuang di sini.
  if (error instanceof FoodOpsError) return res.status(error.status).json({ success: false, message: error.message, code: error.code, ...(error.details ? { details: error.details } : {}) });
  console.error('[foodOps]', error);
  return res.status(500).json({ success: false, message: 'Terjadi kesalahan pada modul Evidence & Operasi Pangan.', code: 'FOOD_OPS_INTERNAL_ERROR' });
};
function removeFailedUpload(file) { if (file?.path) fs.unlink(file.path, () => {}); }

async function listDocuments(req, res) {
  try { return ok(res, await documentService.listDocuments(req.tenantId, req.query)); } catch (e) { return fail(res, e); }
}

/** Phase 1 — ringkasan dashboard registry (mandat §9). */
async function getDashboardSummary(req, res) {
  try { return ok(res, await documentService.getDashboardSummary(req.tenantId, req.query)); } catch (e) { return fail(res, e); }
}

async function createDocument(req, res) {
  try {
    const result = await documentService.createDocument(req.body, req.file, req.user, req.tenantId);
    await logActivity(req, 'FOOD_OPS_DOCUMENT_UPLOAD', 'FoodOpsDocument', result.document.id, null, { judul: result.document.judul, document_class: result.document.document_class });
    return ok(res, result, 201);
  } catch (e) { removeFailedUpload(req.file); return fail(res, e); }
}

async function getDocumentDetail(req, res) {
  try { return ok(res, await documentService.getDocumentDetail(Number(req.params.id), req.tenantId)); } catch (e) { return fail(res, e); }
}

async function getVersionHistory(req, res) {
  try { return ok(res, await documentService.getDocumentVersionHistory(Number(req.params.id), req.tenantId)); } catch (e) { return fail(res, e); }
}

async function createNewVersion(req, res) {
  try {
    const baru = await documentService.createNewVersion(Number(req.params.id), req.body, req.file, req.user, req.tenantId);
    await logActivity(req, 'FOOD_OPS_DOCUMENT_NEW_VERSION', 'FoodOpsDocument', baru.id, { menggantikan_document_id: baru.menggantikan_document_id }, { versi: baru.versi });
    return ok(res, baru, 201);
  } catch (e) { removeFailedUpload(req.file); return fail(res, e); }
}

async function classifyDocument(req, res) {
  try { return ok(res, await documentService.classifyDocumentById(Number(req.params.id), req.tenantId)); } catch (e) { return fail(res, e); }
}

async function verifyDocument(req, res) {
  try {
    const updated = await documentService.verifyDocument(Number(req.params.id), req.body, req.user, req.tenantId);
    await logActivity(req, 'FOOD_OPS_DOCUMENT_VERIFY', 'FoodOpsDocument', updated.id, null, { status_verifikasi: updated.status_verifikasi });
    return ok(res, updated);
  } catch (e) { return fail(res, e); }
}

async function downloadDocument(req, res) {
  try {
    const document = await documentService.getDocumentDetail(Number(req.params.id), req.tenantId);
    return res.download(document.file_path, document.file_name_original);
  } catch (e) { return fail(res, e); }
}

/** Phase 1 — daftar binding ProSN internal yang berasal dari dokumen ini (mandat §11 "Semantic links"). */
async function getProsnBindings(req, res) {
  try { return ok(res, await bindingService.listBindingsForDocument(Number(req.params.id), req.tenantId)); } catch (e) { return fail(res, e); }
}

module.exports = { listDocuments, createDocument, getDocumentDetail, getVersionHistory, createNewVersion, classifyDocument, verifyDocument, downloadDocument, getProsnBindings, getDashboardSummary };
