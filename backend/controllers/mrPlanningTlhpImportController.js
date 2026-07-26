// backend/controllers/mrPlanningTlhpImportController.js

"use strict";

const importService = require("../services/mr/mrPlanningTlhpImportService");

const {
  successResponse,
  errorResponse,
} = require("../helpers/mr/mrResponseHelper");

const getUserId = (req) =>
  req.user?.id || req.user?.user_id || req.user?.userId || req.auth?.id || null;

const importMatriksPdf = async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return errorResponse({
        res,
        error: {
          status: 400,
          code: "MR_TLHP_IMPORT_FILE_REQUIRED",
          message: "File PDF Matriks Pemantauan TLHP wajib diunggah.",
        },
      });
    }

    const data = await importService.importFromMatriksPdf({
      buffer: req.file.buffer,
      tahun: req.body?.tahun ? Number(req.body.tahun) : undefined,
      user: { id: getUserId(req) },
    });

    return successResponse({
      res,
      message: `Import selesai — ${data.temuan_added} temuan baru ditambahkan, ${data.temuan_skipped_duplicate} sudah ada (dilewati).`,
      data,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

module.exports = {
  importMatriksPdf,
};
