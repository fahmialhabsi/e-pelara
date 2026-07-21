// backend/controllers/mrPlanningLhpController.js

"use strict";

const lhpService = require("../services/mr/mrPlanningLhpService");

const {
  successResponse,
  createdResponse,
  errorResponse,
} = require("../helpers/mr/mrResponseHelper");

const getUserId = (req) =>
  req.user?.id || req.user?.user_id || req.user?.userId || req.auth?.id || null;

const findAll = async (req, res) => {
  try {
    const data = await lhpService.listLhp(req.query);
    return successResponse({ res, message: "Daftar LHP berhasil dimuat.", data });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const findById = async (req, res) => {
  try {
    const data = await lhpService.getLhpDetail(req.params.id);
    return successResponse({ res, message: "Detail LHP berhasil dimuat.", data });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const create = async (req, res) => {
  try {
    const data = await lhpService.createLhp({ body: req.body, user: { id: getUserId(req) } });
    return createdResponse({ res, message: "LHP berhasil dibuat.", data });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const update = async (req, res) => {
  try {
    const data = await lhpService.updateDraftLhp({
      lhpId: req.params.id,
      body: req.body,
      user: { id: getUserId(req) },
    });
    return successResponse({ res, message: "LHP berhasil diperbarui.", data });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const activate = async (req, res) => {
  try {
    const data = await lhpService.activateLhp({ lhpId: req.params.id, user: { id: getUserId(req) } });
    return successResponse({ res, message: "LHP berhasil diaktifkan.", data });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const archive = async (req, res) => {
  try {
    const data = await lhpService.archiveLhp({ lhpId: req.params.id, user: { id: getUserId(req) } });
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
      user: { id: getUserId(req) },
    });
    return successResponse({ res, message: "Berkas LHP berhasil diunggah.", data });
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
  activate,
  archive,
  uploadDocument,
  destroy,
};
