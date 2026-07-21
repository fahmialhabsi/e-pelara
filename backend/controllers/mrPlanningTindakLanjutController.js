// backend/controllers/mrPlanningTindakLanjutController.js

"use strict";

const tindakLanjutService = require("../services/mr/mrPlanningTindakLanjutService");
const mrHistoryService = require("../services/mr/mrHistoryService");

const {
  successResponse,
  createdResponse,
  errorResponse,
} = require("../helpers/mr/mrResponseHelper");

const getUserId = (req) =>
  req.user?.id || req.user?.user_id || req.user?.userId || req.auth?.id || null;

const getUser = (req) => ({ id: getUserId(req) });

const findByRekomendasi = async (req, res) => {
  try {
    const data = await tindakLanjutService.listTindakLanjutByRekomendasi(req.params.rekomendasiId);
    return successResponse({ res, message: "Daftar Tindak Lanjut berhasil dimuat.", data });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const findById = async (req, res) => {
  try {
    const data = await tindakLanjutService.getTindakLanjutDetail(req.params.id);
    return successResponse({ res, message: "Detail Tindak Lanjut berhasil dimuat.", data });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const createFromRekomendasi = async (req, res) => {
  try {
    const data = await tindakLanjutService.createTindakLanjutFromRekomendasi({
      rekomendasiId: req.params.rekomendasiId,
      body: req.body,
      user: getUser(req),
    });
    return createdResponse({ res, message: "Tindak Lanjut berhasil dicatat.", data });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const update = async (req, res) => {
  try {
    const data = await tindakLanjutService.updateDraftTindakLanjut({
      tindakLanjutId: req.params.id,
      body: req.body,
      user: getUser(req),
    });
    return successResponse({ res, message: "Tindak Lanjut berhasil diperbarui.", data });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const submit = async (req, res) => {
  try {
    const data = await tindakLanjutService.submitTindakLanjutForVerification({
      tindakLanjutId: req.params.id,
      user: getUser(req),
      note: req.body?.alasan_revisi || null,
    });
    return successResponse({ res, message: "Tindak Lanjut berhasil diajukan untuk verifikasi.", data });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const getHistory = async (req, res) => {
  try {
    const histories = await tindakLanjutService.getHistoryByTindakLanjut({
      tindakLanjutId: req.params.id,
      status_revisi: req.query.status_revisi || null,
    });
    return successResponse({
      res,
      message: "History Tindak Lanjut berhasil dimuat.",
      data: mrHistoryService.mapHistoriesForFrontend(histories),
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const getHistoryDetail = async (req, res) => {
  try {
    const history = await tindakLanjutService.getHistoryDetail(req.params.history_id);
    return successResponse({
      res,
      message: "Detail history Tindak Lanjut berhasil dimuat.",
      data: mrHistoryService.mapHistoryForFrontend(history),
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const verifikasiHistory = async (req, res) => {
  try {
    const data = await tindakLanjutService.verifikasiHistory({
      historyId: req.params.history_id,
      userId: getUserId(req),
      note: req.body?.alasan_revisi || req.body?.catatan || null,
      request: req,
    });
    return successResponse({ res, message: "History Tindak Lanjut berhasil diverifikasi.", data });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const approveHistory = async (req, res) => {
  try {
    const data = await tindakLanjutService.approveHistory({
      historyId: req.params.history_id,
      userId: getUserId(req),
      note: req.body?.alasan_revisi || req.body?.catatan || null,
      request: req,
    });
    return successResponse({ res, message: "Tindak Lanjut berhasil disetujui.", data });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const tolakHistory = async (req, res) => {
  try {
    const data = await tindakLanjutService.tolakHistory({
      historyId: req.params.history_id,
      userId: getUserId(req),
      note: req.body?.alasan_revisi || req.body?.alasan_penolakan || req.body?.catatan || null,
      request: req,
    });
    return successResponse({ res, message: "Tindak Lanjut berhasil ditolak.", data });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const destroy = async (req, res) => {
  try {
    const tindakLanjut = await tindakLanjutService.findTindakLanjutOrFail(req.params.id);

    if (tindakLanjut.status_revisi === "approved") {
      return errorResponse({
        res,
        error: {
          status: 400,
          code: "MR_TINDAK_LANJUT_APPROVED_CANNOT_DELETE",
          message: "Tindak Lanjut yang sudah Disetujui tidak bisa dihapus.",
        },
      });
    }

    await tindakLanjut.destroy();
    return successResponse({ res, message: "Tindak Lanjut berhasil dihapus." });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

module.exports = {
  findByRekomendasi,
  findById,
  createFromRekomendasi,
  update,
  submit,
  getHistory,
  getHistoryDetail,
  verifikasiHistory,
  approveHistory,
  tolakHistory,
  destroy,
};
