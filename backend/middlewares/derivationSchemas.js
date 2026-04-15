"use strict";

const Joi = require("joi");

exports.pdOpdMapping = Joi.object({
  perangkat_daerah_id: Joi.number().integer().positive().required(),
  opd_penanggung_jawab_id: Joi.number().integer().positive().required(),
});

exports.renstraFromRpjmd = Joi.object({
  periode_id: Joi.number().integer().positive().required(),
  perangkat_daerah_id: Joi.number().integer().positive().required(),
  tahun: Joi.number().integer().min(2000).max(2100).required(),
  judul: Joi.string().max(512).allow(null, "").optional(),
  filter_mode: Joi.string().valid("pd", "all").optional(),
  idempotency: Joi.string().valid("reuse", "error").optional(),
});

exports.rkpdFromRenstra = Joi.object({
  renstra_pd_dokumen_id: Joi.number().integer().positive().required(),
  tahun: Joi.number().integer().min(2000).max(2100).required(),
  judul: Joi.string().max(512).allow(null, "").optional(),
  filter_mode: Joi.string().valid("pd", "all").optional(),
  idempotency: Joi.string().valid("reuse", "error").optional(),
});

exports.renjaFromRkpd = Joi.object({
  rkpd_dokumen_id: Joi.number().integer().positive().required(),
  renstra_pd_dokumen_id: Joi.number().integer().positive().required(),
  tahun: Joi.number().integer().min(2000).max(2100).optional(),
  judul: Joi.string().max(512).allow(null, "").optional(),
  idempotency: Joi.string().valid("reuse", "error").optional(),
});

exports.rkaFromRenja = Joi.object({
  renja_dokumen_id: Joi.number().integer().positive().required(),
  jenis_dokumen: Joi.string().max(64).optional(),
});

exports.dpaFromRka = Joi.object({
  rka_id: Joi.number().integer().positive().optional(),
  renja_legacy_id: Joi.number().integer().positive().optional(),
  jenis_dokumen: Joi.string().max(64).optional(),
  idempotency: Joi.string().valid("reuse", "error").optional(),
})
  .or("rka_id", "renja_legacy_id")
  .messages({
    "object.missing": "Wajib salah satu: rka_id atau renja_legacy_id",
  });

function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details.map((d) => d.message).join("; "),
      });
    }
    req.body = value;
    next();
  };
}

exports.validate = validate;
