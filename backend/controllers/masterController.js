"use strict";

const {
  successResponse,
  structuredErrorResponse,
} = require("../utils/responseHelper");
const masterService = require("../services/masterService");
const C = require("../constants/masterErrorCodes");
const { assertHierarchy } = require("../middlewares/validateHierarchy");

function strictFromReq(req) {
  return masterService.isStrictMode(req.query);
}

const masterController = {
  async listPrograms(req, res) {
    try {
      const allDatasets =
        req.query.allDatasets === "1" ||
        req.query.allDatasets === "true" ||
        req.query.all_datasets === "1";
      const datasetKey = masterService.normalizeDatasetKey(req.query);
      const data = allDatasets
        ? await masterService.listProgramsAllDatasets()
        : await masterService.listPrograms(datasetKey);
      return successResponse(res, 200, "Berhasil mengambil master program", data, {
        count: data.length,
        datasetKey: allDatasets ? "*" : datasetKey,
        allDatasets: Boolean(allDatasets),
      });
    } catch (err) {
      console.error("[masterController.listPrograms]", err);
      return structuredErrorResponse(res, 500, {
        code: C.MASTER_INTERNAL_ERROR,
        message: "Gagal mengambil master program",
        field: null,
        details: process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  },

  async listKegiatan(req, res) {
    try {
      const datasetKey = masterService.normalizeDatasetKey(req.query);
      const programId = Number.parseInt(req.query.programId, 10);
      const strict = strictFromReq(req);

      const result = await masterService.listKegiatanByProgram(
        programId,
        datasetKey,
        { strict },
      );
      if (!result.ok) {
        return structuredErrorResponse(res, result.status, {
          code: result.code,
          message: result.message,
          field: result.field,
        });
      }

      return successResponse(
        res,
        200,
        "Berhasil mengambil master kegiatan",
        result.data,
        {
          count: result.data.length,
          datasetKey,
          ...(result.warning ? { warning: result.warning } : {}),
          ...(result.program ? { parentProgram: result.program } : {}),
        },
      );
    } catch (err) {
      console.error("[masterController.listKegiatan]", err);
      return structuredErrorResponse(res, 500, {
        code: C.MASTER_INTERNAL_ERROR,
        message: "Gagal mengambil master kegiatan",
        field: null,
        details: process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  },

  async listSubKegiatan(req, res) {
    try {
      const datasetKey = masterService.normalizeDatasetKey(req.query);
      const kegiatanId = Number.parseInt(req.query.kegiatanId, 10);
      const strict = strictFromReq(req);

      const result = await masterService.listSubKegiatanByKegiatan(
        kegiatanId,
        datasetKey,
        { strict },
      );
      if (!result.ok) {
        return structuredErrorResponse(res, result.status, {
          code: result.code,
          message: result.message,
          field: result.field,
        });
      }

      return successResponse(
        res,
        200,
        "Berhasil mengambil master sub kegiatan",
        result.data,
        {
          count: result.data.length,
          datasetKey,
          ...(result.warning ? { warning: result.warning } : {}),
          ...(result.kegiatan ? { parentKegiatan: result.kegiatan } : {}),
        },
      );
    } catch (err) {
      console.error("[masterController.listSubKegiatan]", err);
      return structuredErrorResponse(res, 500, {
        code: C.MASTER_INTERNAL_ERROR,
        message: "Gagal mengambil master sub kegiatan",
        field: null,
        details: process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  },

  async validateHierarchy(req, res) {
    try {
      const regulasiVersiId = Number.parseInt(
        req.body?.regulasi_versi_id ?? req.body?.regulasiVersiId,
        10,
      );
      const masterProgramId = Number.parseInt(
        req.body?.master_program_id ?? req.body?.masterProgramId,
        10,
      );
      const masterKegiatanId = Number.parseInt(
        req.body?.master_kegiatan_id ?? req.body?.masterKegiatanId,
        10,
      );
      const masterSubKegiatanId = Number.parseInt(
        req.body?.master_sub_kegiatan_id ?? req.body?.masterSubKegiatanId,
        10,
      );

      const result = await assertHierarchy({
        regulasiVersiId,
        masterProgramId,
        masterKegiatanId,
        masterSubKegiatanId,
      });

      if (!result.valid) {
        return structuredErrorResponse(res, 400, {
          code: C.MASTER_HIERARCHY_INVALID,
          message: "Kombinasi hierarki master tidak valid",
          field: null,
          details: result.errors,
        });
      }

      return successResponse(res, 200, "Hierarki master valid", { valid: true });
    } catch (err) {
      console.error("[masterController.validateHierarchy]", err);
      return structuredErrorResponse(res, 500, {
        code: C.MASTER_INTERNAL_ERROR,
        message: "Gagal memvalidasi hierarki",
        field: null,
        details: process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  },

  async listIndikator(req, res) {
    try {
      const datasetKey = masterService.normalizeDatasetKey(req.query);
      const subKegiatanId = Number.parseInt(req.query.subKegiatanId, 10);
      const strict = strictFromReq(req);

      const result = await masterService.listIndikatorBySubKegiatan(
        subKegiatanId,
        datasetKey,
        { strict },
      );
      if (!result.ok) {
        return structuredErrorResponse(res, result.status, {
          code: result.code,
          message: result.message,
          field: result.field,
        });
      }

      return successResponse(
        res,
        200,
        "Berhasil mengambil master indikator",
        result.data,
        {
          count: result.data.length,
          datasetKey,
          ...(result.warning ? { warning: result.warning } : {}),
          ...(result.subKegiatan
            ? { parentSubKegiatan: result.subKegiatan }
            : {}),
        },
      );
    } catch (err) {
      console.error("[masterController.listIndikator]", err);
      return structuredErrorResponse(res, 500, {
        code: C.MASTER_INTERNAL_ERROR,
        message: "Gagal mengambil master indikator",
        field: null,
        details: process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  },
};

module.exports = masterController;
