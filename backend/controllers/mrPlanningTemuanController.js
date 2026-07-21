// backend/controllers/mrPlanningTemuanController.js

"use strict";

const temuanService = require("../services/mr/mrPlanningTemuanService");
const mrHistoryService = require("../services/mr/mrHistoryService");

const {
  successResponse,
  createdResponse,
  errorResponse,
} = require("../helpers/mr/mrResponseHelper");

const getUserId = (req) =>
  req.user?.id || req.user?.user_id || req.user?.userId || req.auth?.id || null;

const getUser = (req) => ({ id: getUserId(req) });

const findByLhp = async (req, res) => {
  try {
    const data = await temuanService.listTemuanByLhp(req.params.lhpId);
    return successResponse({ res, message: "Daftar Temuan berhasil dimuat.", data });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const findById = async (req, res) => {
  try {
    const data = await temuanService.getTemuanDetail(req.params.id);
    return successResponse({ res, message: "Detail Temuan berhasil dimuat.", data });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const createFromLhp = async (req, res) => {
  try {
    const data = await temuanService.createTemuanFromLhp({
      lhpId: req.params.lhpId,
      body: req.body,
      user: getUser(req),
    });
    return createdResponse({ res, message: "Temuan berhasil dibuat.", data });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const update = async (req, res) => {
  try {
    const data = await temuanService.updateDraftTemuan({
      temuanId: req.params.id,
      body: req.body,
      user: getUser(req),
    });
    return successResponse({ res, message: "Temuan berhasil diperbarui.", data });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const submit = async (req, res) => {
  try {
    const data = await temuanService.submitTemuanForVerification({
      temuanId: req.params.id,
      user: getUser(req),
      note: req.body?.alasan_revisi || null,
    });
    return successResponse({ res, message: "Temuan berhasil diajukan untuk verifikasi.", data });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const revisi = async (req, res) => {
  try {
    const data = await temuanService.createRevisionFromApprovedTemuan({
      temuanId: req.params.id,
      body: req.body,
      user: getUser(req),
    });
    return successResponse({ res, message: "Revisi Temuan berhasil dibuat.", data });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const escalateToRisk = async (req, res) => {
  try {
    const data = await temuanService.escalateToRisk({
      temuanId: req.params.id,
      body: req.body,
      user: getUser(req),
    });
    return successResponse({ res, message: "Temuan berhasil dieskalasi menjadi Risk.", data });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const getHistory = async (req, res) => {
  try {
    const histories = await temuanService.getHistoryByTemuan({
      temuanId: req.params.id,
      status_revisi: req.query.status_revisi || null,
    });
    return successResponse({
      res,
      message: "History Temuan berhasil dimuat.",
      data: mrHistoryService.mapHistoriesForFrontend(histories),
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const getHistoryDetail = async (req, res) => {
  try {
    const history = await temuanService.getHistoryDetail(req.params.history_id);
    return successResponse({
      res,
      message: "Detail history Temuan berhasil dimuat.",
      data: mrHistoryService.mapHistoryForFrontend(history),
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const verifikasiHistory = async (req, res) => {
  try {
    const data = await temuanService.verifikasiHistory({
      historyId: req.params.history_id,
      userId: getUserId(req),
      note: req.body?.alasan_revisi || req.body?.catatan || null,
      request: req,
    });
    return successResponse({ res, message: "History Temuan berhasil diverifikasi.", data });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const approveHistory = async (req, res) => {
  try {
    const data = await temuanService.approveHistory({
      historyId: req.params.history_id,
      userId: getUserId(req),
      note: req.body?.alasan_revisi || req.body?.catatan || null,
      request: req,
    });
    return successResponse({ res, message: "Temuan berhasil disetujui.", data });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const tolakHistory = async (req, res) => {
  try {
    const data = await temuanService.tolakHistory({
      historyId: req.params.history_id,
      userId: getUserId(req),
      note: req.body?.alasan_revisi || req.body?.alasan_penolakan || req.body?.catatan || null,
      request: req,
    });
    return successResponse({ res, message: "Temuan berhasil ditolak.", data });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

// =====================================================
// REKOMENDASI (nested)
// =====================================================

const getRekomendasiList = async (req, res) => {
  try {
    const data = await temuanService.listRekomendasiByTemuan(req.params.id);
    return successResponse({ res, message: "Daftar Rekomendasi berhasil dimuat.", data });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const createRekomendasi = async (req, res) => {
  try {
    const data = await temuanService.createRekomendasi({
      temuanId: req.params.id,
      body: req.body,
      user: getUser(req),
    });
    return createdResponse({ res, message: "Rekomendasi berhasil ditambahkan.", data });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const updateRekomendasi = async (req, res) => {
  try {
    const data = await temuanService.updateDraftRekomendasi({
      rekomendasiId: req.params.rekomendasiId,
      body: req.body,
      user: getUser(req),
    });
    return successResponse({ res, message: "Rekomendasi berhasil diperbarui.", data });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const cancelRekomendasi = async (req, res) => {
  try {
    const data = await temuanService.cancelRekomendasi({
      rekomendasiId: req.params.rekomendasiId,
      body: req.body,
      user: getUser(req),
    });
    return successResponse({ res, message: "Rekomendasi berhasil dibatalkan.", data });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const destroy = async (req, res) => {
  try {
    const temuan = await temuanService.findTemuanOrFail(req.params.id);

    if (temuan.status_revisi === "approved") {
      return errorResponse({
        res,
        error: {
          status: 400,
          code: "MR_TEMUAN_APPROVED_CANNOT_DELETE",
          message: "Temuan yang sudah Disetujui tidak bisa dihapus.",
        },
      });
    }

    await temuan.destroy();
    return successResponse({ res, message: "Temuan berhasil dihapus." });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

module.exports = {
  findByLhp,
  findById,
  createFromLhp,
  update,
  submit,
  revisi,
  escalateToRisk,
  getHistory,
  getHistoryDetail,
  verifikasiHistory,
  approveHistory,
  tolakHistory,
  getRekomendasiList,
  createRekomendasi,
  updateRekomendasi,
  cancelRekomendasi,
  destroy,
};
