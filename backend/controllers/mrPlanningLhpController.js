// backend/controllers/mrPlanningLhpController.js

"use strict";

const lhpService = require("../services/mr/mrPlanningLhpService");
const { ActivityLog } = require("../models");
const { logActivity } = require("../services/auditService");

const {
  successResponse,
  createdResponse,
  errorResponse,
} = require("../helpers/mr/mrResponseHelper");

// B10-F01 — LHP LIFECYCLE AUDITABILITY
// -----------------------------------------------------------------------
// Original finding: siklus LHP (draft -> aktif -> diarsipkan, upload
// berkas, pelengkapan metadata B01-F01) tidak punya jejak riwayat yang bisa
// dibaca ulang — berbeda dari Temuan/Rekomendasi/Mitigation/Monitoring yang
// sudah punya history table immutable (mrPlanningTemuanHistoryModel.js
// dkk). LHP secara desain TIDAK memakai workflow draft/verifikasi/approved
// (lihat komentar modul mrPlanningLhpService.js), sehingga menambah history
// table baru untuk LHP akan berarti membangun mesin approval yang tidak
// perlu untuk entitas yang siklusnya jauh lebih sederhana (mandat Wave 2
// eksplisit melarang ini: "avoid schema migration", "don't turn simple LHP
// lifecycle into full Risk approval workflow"). Reuse ActivityLog
// (tabel activity_logs, models/ActivityLog.js) + auditService.logActivity —
// infrastruktur audit generik yang SUDAH dipakai modul lain (Food
// Operations, dll) — TIDAK ada tabel/migrasi baru.
const LHP_ENTITY_TYPE = "MrPlanningLhp";

const getUserId = (req) =>
  req.user?.id || req.user?.user_id || req.user?.userId || req.auth?.id || null;

// Sprint 8 -- context propagation only (no new role semantics, no
// synthesized user.opd): mengikuti pola established getUserForContextService
// di mr_planningRiskController.js -- service layer perlu melihat user.role
// dan user.opd (bukan cuma id) supaya boundary check Sprint 8 punya data
// untuk diperiksa. req.user tetap datang apa adanya dari verifyToken/auth
// middleware (TIDAK diubah).
const getUserForBoundaryCheck = (req) => ({
  ...(req.user || req.auth || req.authUser || req.currentUser || {}),
  id: getUserId(req),
});

const findAll = async (req, res) => {
  try {
    const data = await lhpService.listLhp(req.query, {
      user: getUserForBoundaryCheck(req),
    });
    return successResponse({ res, message: "Daftar LHP berhasil dimuat.", data });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const findById = async (req, res) => {
  try {
    const data = await lhpService.getLhpDetail(req.params.id, {
      user: getUserForBoundaryCheck(req),
    });
    return successResponse({ res, message: "Detail LHP berhasil dimuat.", data });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const create = async (req, res) => {
  try {
    const data = await lhpService.createLhp({ body: req.body, user: getUserForBoundaryCheck(req) });
    await logActivity(req, "MR_LHP_CREATE", LHP_ENTITY_TYPE, data.id, null, {
      nomor_lhp: data.nomor_lhp,
      judul_lhp: data.judul_lhp,
      status_dokumen: data.status_dokumen,
    });
    return createdResponse({ res, message: "LHP berhasil dibuat.", data });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const update = async (req, res) => {
  try {
    const before = await lhpService.findLhpOrFail(req.params.id);
    const beforeSnapshot = before.get({ plain: true });

    const data = await lhpService.updateDraftLhp({
      lhpId: req.params.id,
      body: req.body,
      user: getUserForBoundaryCheck(req),
    });
    await logActivity(req, "MR_LHP_UPDATE_DRAFT", LHP_ENTITY_TYPE, data.id, beforeSnapshot, req.body);
    return successResponse({ res, message: "LHP berhasil diperbarui.", data });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

// =====================================================
// B01-F01 — METADATA COMPLETION UNTUK LHP AKTIF/DIARSIPKAN (IMPORT)
// =====================================================
const completeMetadata = async (req, res) => {
  try {
    const before = await lhpService.findLhpOrFail(req.params.id);
    const beforeSnapshot = before.get({ plain: true });

    const data = await lhpService.completeLhpMetadata({
      lhpId: req.params.id,
      body: req.body,
      user: getUserForBoundaryCheck(req),
    });
    await logActivity(req, "MR_LHP_COMPLETE_METADATA", LHP_ENTITY_TYPE, data.id, beforeSnapshot, req.body);
    return successResponse({ res, message: "Metadata LHP berhasil dilengkapi.", data });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const activate = async (req, res) => {
  try {
    const data = await lhpService.activateLhp({ lhpId: req.params.id, user: getUserForBoundaryCheck(req) });
    await logActivity(req, "MR_LHP_ACTIVATE", LHP_ENTITY_TYPE, data.id, { status_dokumen: "draft" }, { status_dokumen: "aktif" });
    return successResponse({ res, message: "LHP berhasil diaktifkan.", data });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const archive = async (req, res) => {
  try {
    const data = await lhpService.archiveLhp({ lhpId: req.params.id, user: getUserForBoundaryCheck(req) });
    await logActivity(req, "MR_LHP_ARCHIVE", LHP_ENTITY_TYPE, data.id, { status_dokumen: "aktif" }, { status_dokumen: "diarsipkan" });
    return successResponse({ res, message: "LHP berhasil diarsipkan.", data });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const uploadDocument = async (req, res) => {
  try {
    const data = await lhpService.uploadLhpFile({
      lhpId: req.params.id,
      file: req.file,
      user: getUserForBoundaryCheck(req),
    });
    await logActivity(req, "MR_LHP_UPLOAD_DOCUMENT", LHP_ENTITY_TYPE, data.id, null, {
      original_file_name: data.original_file_name,
      file_size: data.file_size,
      checksum: data.checksum,
    });
    return successResponse({ res, message: "Berkas LHP berhasil diunggah.", data });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

// =====================================================
// B10-F01 — READ-ONLY LHP LIFECYCLE HISTORY
// =====================================================
const getHistory = async (req, res) => {
  try {
    // Pastikan LHP benar-benar ada dulu (404 yang jelas daripada list kosong
    // yang ambigu antara "belum ada riwayat" vs "LHP tidak ditemukan").
    await lhpService.findLhpOrFail(req.params.id);

    const logs = await ActivityLog.findAll({
      where: {
        entity_type: LHP_ENTITY_TYPE,
        entity_id: req.params.id,
      },
      order: [["created_at", "DESC"], ["id", "DESC"]],
    });

    const data = logs.map((log) => {
      const plain = log.get({ plain: true });
      return {
        id: plain.id,
        action: plain.action,
        user_id: plain.user_id,
        old_data: plain.old_data,
        new_data: plain.new_data,
        created_at: plain.created_at,
      };
    });

    return successResponse({ res, message: "Riwayat LHP berhasil dimuat.", data, meta: { mr_planning_lhp_id: req.params.id, total: data.length } });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const destroy = async (req, res) => {
  try {
    const lhp = await lhpService.findLhpOrFail(req.params.id);

    if (lhp.jumlah_temuan > 0) {
      return errorResponse({
        res,
        error: {
          status: 400,
          code: "MR_LHP_HAS_TEMUAN",
          message: "LHP tidak bisa dihapus karena sudah memiliki Temuan.",
        },
      });
    }

    await lhp.destroy();
    return successResponse({ res, message: "LHP berhasil dihapus." });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

module.exports = {
  findAll,
  findById,
  create,
  update,
  completeMetadata,
  activate,
  archive,
  uploadDocument,
  getHistory,
  destroy,
};
