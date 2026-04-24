"use strict";

const {
  successResponse,
  structuredErrorResponse,
} = require("../utils/responseHelper");
const migrationService = require("../services/migrationService");

function parseVersiPair(req) {
  const fromVersiId = Number.parseInt(
    req.body?.regulasi_versi_from_id ??
      req.body?.fromVersiId ??
      req.body?.from ??
      req.query?.from,
    10,
  );
  const toVersiId = Number.parseInt(
    req.body?.regulasi_versi_to_id ??
      req.body?.toVersiId ??
      req.body?.to ??
      req.query?.to,
    10,
  );
  return { fromVersiId, toVersiId };
}

const migrationController = {
  async runAutoMapping(req, res) {
    try {
      const { fromVersiId, toVersiId } = parseVersiPair(req);
      if (!Number.isInteger(fromVersiId) || fromVersiId < 1) {
        return structuredErrorResponse(res, 400, {
          code: "MIGRATION_VALIDATION_ERROR",
          message: "fromVersiId wajib bilangan bulat positif",
          field: "fromVersiId",
        });
      }
      if (!Number.isInteger(toVersiId) || toVersiId < 1) {
        return structuredErrorResponse(res, 400, {
          code: "MIGRATION_VALIDATION_ERROR",
          message: "toVersiId wajib bilangan bulat positif",
          field: "toVersiId",
        });
      }
      if (fromVersiId === toVersiId) {
        return structuredErrorResponse(res, 400, {
          code: "MIGRATION_VALIDATION_ERROR",
          message: "fromVersiId dan toVersiId harus berbeda",
          field: "toVersiId",
        });
      }

      const summary = await migrationService.runAutoMapping({
        fromVersiId,
        toVersiId,
      });

      return successResponse(
        res,
        200,
        "Auto-mapping sub kegiatan & indikator selesai",
        summary,
      );
    } catch (err) {
      console.error("[migrationController.runAutoMapping]", err);
      return structuredErrorResponse(res, 500, {
        code: "MIGRATION_INTERNAL_ERROR",
        message: err.message || "Gagal menjalankan auto-mapping",
        field: null,
      });
    }
  },

  async status(req, res) {
    try {
      const fromVersiId = Number.parseInt(req.query.from, 10);
      const toVersiId = Number.parseInt(req.query.to, 10);
      if (!Number.isInteger(fromVersiId) || !Number.isInteger(toVersiId)) {
        return structuredErrorResponse(res, 400, {
          code: "MIGRATION_VALIDATION_ERROR",
          message: "Query from dan to (regulasi versi id) wajib diisi",
          field: "from",
        });
      }
      const data = await migrationService.getMigrationStatus({
        fromVersiId,
        toVersiId,
      });
      return successResponse(res, 200, "Status migrasi", data, {
        fromVersiId,
        toVersiId,
      });
    } catch (err) {
      console.error("[migrationController.status]", err);
      return structuredErrorResponse(res, 500, {
        code: "MIGRATION_INTERNAL_ERROR",
        message: err.message || "Gagal membaca status",
        field: null,
      });
    }
  },

  async preview(req, res) {
    try {
      const { fromVersiId, toVersiId } = parseVersiPair(req);
      if (!Number.isInteger(fromVersiId) || !Number.isInteger(toVersiId)) {
        return structuredErrorResponse(res, 400, {
          code: "MIGRATION_VALIDATION_ERROR",
          message: "fromVersiId dan toVersiId wajib",
          field: "fromVersiId",
        });
      }
      const data = await migrationService.buildPreview({
        fromVersiId,
        toVersiId,
      });
      return successResponse(res, 200, "Preview migrasi", data, {
        fromVersiId,
        toVersiId,
      });
    } catch (err) {
      console.error("[migrationController.preview]", err);
      return structuredErrorResponse(res, 500, {
        code: "MIGRATION_INTERNAL_ERROR",
        message: err.message || "Gagal preview",
        field: null,
      });
    }
  },

  async apply(req, res) {
    try {
      const decisions = req.body?.decisions;
      if (!Array.isArray(decisions)) {
        return structuredErrorResponse(res, 400, {
          code: "MIGRATION_VALIDATION_ERROR",
          message: "Body decisions harus berupa array",
          field: "decisions",
        });
      }
      const data = await migrationService.applyDecisions({
        decisions,
        userId: req.user?.id,
      });
      return successResponse(res, 200, "Keputusan migrasi diterapkan", data);
    } catch (err) {
      console.error("[migrationController.apply]", err);
      return structuredErrorResponse(res, 500, {
        code: "MIGRATION_INTERNAL_ERROR",
        message: err.message || "Gagal apply",
        field: null,
      });
    }
  },

  /** Dry-run propagate satu mapping (rollback transaksi; data tidak berubah). */
  async testPropagate(req, res) {
    try {
      const mappingId =
        req.body?.mappingId ?? req.body?.mapping_id ?? req.body?.id;
      const data = await migrationService.testPropagateMapping({
        mappingId,
        userId: req.user?.id,
      });
      if (!data.ok) {
        return structuredErrorResponse(res, 400, {
          code: "MIGRATION_VALIDATION_ERROR",
          message: data.message || "Gagal simulasi propagate",
          field: "mappingId",
        });
      }
      return successResponse(res, 200, "Simulasi propagate (di-rollback)", data);
    } catch (err) {
      console.error("[migrationController.testPropagate]", err);
      return structuredErrorResponse(res, 500, {
        code: "MIGRATION_INTERNAL_ERROR",
        message: err.message || "Gagal test propagate",
        field: null,
      });
    }
  },

  async resolveSplit(req, res) {
    try {
      const mappingId =
        req.body?.mappingId ?? req.body?.mapping_id ?? req.body?.id;
      const selectedNewMasterSubKegiatanId =
        req.body?.selectedNewMasterSubKegiatanId ??
        req.body?.selected_new_master_sub_kegiatan_id;
      const scope = req.body?.scope;
      const notes = req.body?.notes;
      const data = await migrationService.resolveSplitMapping({
        mappingId,
        selectedNewMasterSubKegiatanId,
        scope,
        notes,
        userId: req.user?.id,
      });
      if (!data.ok) {
        return structuredErrorResponse(res, 400, {
          code: "MIGRATION_VALIDATION_ERROR",
          message: data.message || "Gagal resolve SPLIT",
          field: "mappingId",
        });
      }
      return successResponse(res, 200, "Resolusi SPLIT diterapkan", data);
    } catch (err) {
      console.error("[migrationController.resolveSplit]", err);
      return structuredErrorResponse(res, 500, {
        code: "MIGRATION_INTERNAL_ERROR",
        message: err.message || "Gagal resolve SPLIT",
        field: null,
      });
    }
  },

  async testResolveSplit(req, res) {
    try {
      const mappingId =
        req.body?.mappingId ?? req.body?.mapping_id ?? req.body?.id;
      const selectedNewMasterSubKegiatanId =
        req.body?.selectedNewMasterSubKegiatanId ??
        req.body?.selected_new_master_sub_kegiatan_id;
      const scope = req.body?.scope;
      const notes = req.body?.notes;
      const data = await migrationService.testResolveSplitMapping({
        mappingId,
        selectedNewMasterSubKegiatanId,
        scope,
        notes,
        userId: req.user?.id,
      });
      if (!data.ok) {
        return structuredErrorResponse(res, 400, {
          code: "MIGRATION_VALIDATION_ERROR",
          message: data.message || "Gagal simulasi resolve SPLIT",
          field: "mappingId",
        });
      }
      return successResponse(res, 200, "Simulasi resolve SPLIT (di-rollback)", data);
    } catch (err) {
      console.error("[migrationController.testResolveSplit]", err);
      return structuredErrorResponse(res, 500, {
        code: "MIGRATION_INTERNAL_ERROR",
        message: err.message || "Gagal test resolve SPLIT",
        field: null,
      });
    }
  },

  async listSplitResolutions(req, res) {
    try {
      const mappingId =
        req.query.mappingId ?? req.query.mapping_id ?? req.query.id;
      const data = await migrationService.listSplitResolutions({ mappingId });
      if (!data.ok) {
        return structuredErrorResponse(res, 400, {
          code: "MIGRATION_VALIDATION_ERROR",
          message: data.message || "mappingId tidak valid",
          field: "mappingId",
        });
      }
      return successResponse(res, 200, "Daftar resolusi SPLIT", data.data, {
        count: data.data.length,
      });
    } catch (err) {
      console.error("[migrationController.listSplitResolutions]", err);
      return structuredErrorResponse(res, 500, {
        code: "MIGRATION_INTERNAL_ERROR",
        message: err.message || "Gagal list resolusi",
        field: null,
      });
    }
  },

  async getSplitCoverage(req, res) {
    try {
      const mappingId =
        req.query.mappingId ?? req.query.mapping_id ?? req.query.id;
      const data = await migrationService.getSplitCoverage(mappingId);
      if (!data.ok) {
        return structuredErrorResponse(res, 400, {
          code: "MIGRATION_VALIDATION_ERROR",
          message: data.message || "mappingId tidak valid",
          field: "mappingId",
        });
      }
      const {
        ok: _ok,
        message: _msg,
        ...coveragePayload
      } = data;
      return successResponse(res, 200, "Coverage SPLIT", coveragePayload);
    } catch (err) {
      console.error("[migrationController.getSplitCoverage]", err);
      return structuredErrorResponse(res, 500, {
        code: "MIGRATION_INTERNAL_ERROR",
        message: err.message || "Gagal membaca coverage",
        field: null,
      });
    }
  },
};

module.exports = migrationController;
