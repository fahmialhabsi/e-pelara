"use strict";

const Joi = require("joi");

function sendJoiError(res, error) {
  const msg = error.details?.map((d) => d.message).join("; ") || error.message;
  return res.status(400).json({
    success: false,
    message: "Validasi regulasi gagal",
    errors: error.details || [{ message: msg }],
  });
}

/** POST /api/renja — field inti dokumen perencanaan */
const renjaCreateSchema = Joi.object({
  tahun: Joi.number().integer().min(2000).max(2100).required(),
  program: Joi.string().trim().min(1).required(),
  kegiatan: Joi.string().trim().min(1).required(),
  indikator: Joi.string().trim().min(1).required(),
  pagu: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
  anggaran: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
  perangkat_daerah: Joi.string().allow("", null).optional(),
  judul: Joi.string().allow("", null).optional(),
  sub_kegiatan: Joi.string().allow("", null).optional(),
  target: Joi.string().allow("", null).optional(),
})
  .or("pagu", "anggaran")
  .custom((value, helpers) => {
    const paguVal = value.pagu ?? value.anggaran;
    if (paguVal === undefined || paguVal === null || String(paguVal).trim() === "") {
      return helpers.error("any.invalid", {
        message: "pagu atau anggaran wajib berisi nilai (tidak boleh kosong)",
      });
    }
    return value;
  })
  .unknown(true);

/** PUT /api/renja/:id — minimal satu field terisi */
const renjaUpdateSchema = Joi.object({
  tahun: Joi.number().integer().min(2000).max(2100).optional(),
  program: Joi.string().trim().min(1).optional(),
  kegiatan: Joi.string().trim().min(1).optional(),
  indikator: Joi.string().trim().min(1).optional(),
  pagu: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
  anggaran: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
  perangkat_daerah: Joi.string().allow("", null).optional(),
  judul: Joi.string().allow("", null).optional(),
  sub_kegiatan: Joi.string().allow("", null).optional(),
  target: Joi.string().allow("", null).optional(),
})
  .min(1)
  .unknown(true);

/** POST /api/rkpd — terikat Renja + sub-kegiatan + indikator + pagu */
const rkpdCreateSchema = Joi.object({
  tahun: Joi.number().integer().min(2000).max(2100).required(),
  renja_id: Joi.number().integer().positive().required(),
  nama_sub_kegiatan: Joi.string().trim().min(1).required(),
  indikator: Joi.string().trim().min(1).required(),
  pagu_anggaran: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
  pagu: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
  anggaran: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
})
  .or("pagu_anggaran", "pagu", "anggaran")
  .custom((value, helpers) => {
    const paguVal = value.pagu_anggaran ?? value.pagu ?? value.anggaran;
    if (paguVal === undefined || paguVal === null || String(paguVal).trim() === "") {
      return helpers.error("any.invalid", {
        message: "pagu_anggaran / pagu / anggaran wajib berisi nilai",
      });
    }
    return value;
  })
  .unknown(true);

const rkpdUpdateSchema = Joi.object({
  tahun: Joi.number().integer().min(2000).max(2100).optional(),
  renja_id: Joi.number().integer().positive().allow(null).optional(),
  nama_sub_kegiatan: Joi.string().trim().min(1).optional(),
  indikator: Joi.string().trim().min(1).optional(),
  pagu_anggaran: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
  pagu: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
  anggaran: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
})
  .min(1)
  .unknown(true);

exports.validateRenjaCreate = (req, res, next) => {
  const { error, value } = renjaCreateSchema.validate(req.body, { abortEarly: false });
  if (error) return sendJoiError(res, error);
  req.body = value;
  next();
};

exports.validateRenjaUpdate = (req, res, next) => {
  const { error, value } = renjaUpdateSchema.validate(req.body, { abortEarly: false });
  if (error) return sendJoiError(res, error);
  req.body = value;
  next();
};

exports.validateRkpdCreate = (req, res, next) => {
  const { error, value } = rkpdCreateSchema.validate(req.body, { abortEarly: false });
  if (error) return sendJoiError(res, error);
  req.body = value;
  next();
};

exports.validateRkpdUpdate = (req, res, next) => {
  const { error, value } = rkpdUpdateSchema.validate(req.body, { abortEarly: false });
  if (error) return sendJoiError(res, error);
  req.body = value;
  next();
};
