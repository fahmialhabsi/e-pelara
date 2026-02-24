// backend/validators/renstraTargetValidator.js
const { body } = require("express-validator");

exports.createOrUpdateRenstraTarget = [
  body("indikator_id")
    .isInt({ min: 1 })
    .withMessage("Indikator ID harus berupa angka dan wajib diisi"),

  body("tahun")
    .isInt({ min: 2000, max: 2100 })
    .withMessage("Tahun harus berupa angka antara 2000 - 2100"),

  body("target_value")
    .optional()
    .isDecimal()
    .withMessage("Target value harus berupa angka desimal"),

  body("pagu_anggaran")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Pagu anggaran harus berupa angka bulat"),

  body("satuan").optional().isString().withMessage("Satuan harus berupa teks"),

  body("lokasi").optional().isString().withMessage("Lokasi harus berupa teks"),
];
