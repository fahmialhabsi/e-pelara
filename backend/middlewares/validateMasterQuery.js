"use strict";

const { query, validationResult } = require("express-validator");
const { structuredErrorResponse } = require("../utils/responseHelper");
const C = require("../constants/masterErrorCodes");

const intQuery = (name) =>
  query(name)
    .exists({ checkFalsy: true })
    .withMessage(`${name} wajib diisi`)
    .bail()
    .isInt({ min: 1 })
    .withMessage(`${name} harus bilangan bulat positif`);

exports.validateProgramIdQuery = [intQuery("programId")];

exports.validateKegiatanIdQuery = [intQuery("kegiatanId")];

exports.validateSubKegiatanIdQuery = [intQuery("subKegiatanId")];

exports.handleMasterQueryValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const first = errors.array()[0];
    return structuredErrorResponse(res, 400, {
      code: C.MASTER_VALIDATION_ERROR,
      message: first.msg || "Validasi query gagal",
      field: first.path || first.param || null,
      details: errors.array(),
    });
  }
  next();
};
