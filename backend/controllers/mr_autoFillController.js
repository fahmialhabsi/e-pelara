'use strict';

/**
 * MR Auto-Fill Controller
 * ---------------------------------------------------------------------------
 * Endpoint read-only untuk mengambil data usulan (suggested values) auto-fill
 * MR Planning Context dari modul lain. Tidak menulis ke tabel manapun.
 */

const mrAutoFillAggregatorService = require('../services/mr/mrAutoFillAggregatorService');

const getStatusCode = (error) => {
  return error?.statusCode || error?.status || 500;
};

const successResponse = ({ res, statusCode = 200, message, data = null, meta = {} }) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    meta,
  });
};

const errorResponse = ({ res, error }) => {
  const statusCode = getStatusCode(error);

  return res.status(statusCode).json({
    success: false,
    message: error?.message || 'Terjadi kesalahan pada MR auto-fill.',
    blocked: Boolean(error?.blocked),
    audit_mode: Boolean(error?.audit_mode),
    code: error?.code || error?.name || 'MR_AUTOFILL_ERROR',
    details: error?.details || {},
    meta: {},
  });
};

const getAutoFill = async (req, res) => {
  try {
    const result = await mrAutoFillAggregatorService.getAutoFillData(req.params.contextId);

    return successResponse({
      res,
      message: 'Data usulan auto-fill MR berhasil dimuat.',
      data: result,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const getSasaranIndikatorOptions = async (req, res) => {
  try {
    const result = await mrAutoFillAggregatorService.getSasaranIndikatorOptions(
      req.query.renstraId,
    );

    return successResponse({
      res,
      message: 'Opsi indikator sasaran berhasil dimuat.',
      data: result,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const getLakipOptions = async (req, res) => {
  try {
    const result = await mrAutoFillAggregatorService.getLakipOptions(
      req.query.renstraId,
      req.query.tahun,
    );

    return successResponse({
      res,
      message: 'Opsi LAKIP berhasil dimuat.',
      data: result,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

module.exports = {
  getAutoFill,
  getSasaranIndikatorOptions,
  getLakipOptions,
};
