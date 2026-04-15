"use strict";

const {
  successResponse,
  structuredErrorResponse,
} = require("../utils/responseHelper");
const { compareVersi } = require("../services/regulasiCompareService");
const { RegulasiVersi } = require("../models");

const regulasiController = {
  async listVersi(req, res) {
    try {
      const rows = await RegulasiVersi.findAll({
        order: [
          ["tahun", "DESC"],
          ["id", "DESC"],
        ],
      });
      return successResponse(res, 200, "Daftar regulasi versi", rows);
    } catch (err) {
      console.error("[regulasiController.listVersi]", err);
      return structuredErrorResponse(res, 500, {
        code: "REGULASI_INTERNAL_ERROR",
        message: err.message || "Gagal memuat regulasi versi",
        field: null,
      });
    }
  },

  async compare(req, res) {
    try {
      const from = Number.parseInt(req.query.from, 10);
      const to = Number.parseInt(req.query.to, 10);
      if (!Number.isInteger(from) || !Number.isInteger(to)) {
        return structuredErrorResponse(res, 400, {
          code: "REGULASI_VALIDATION_ERROR",
          message: "Query from dan to wajib berupa id regulasi versi",
          field: "from",
        });
      }
      const data = await compareVersi(from, to);
      return successResponse(res, 200, "Perbandingan regulasi", data);
    } catch (err) {
      console.error("[regulasiController.compare]", err);
      return structuredErrorResponse(res, 500, {
        code: "REGULASI_INTERNAL_ERROR",
        message: err.message || "Gagal membandingkan",
        field: null,
      });
    }
  },
};

module.exports = regulasiController;
