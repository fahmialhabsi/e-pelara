// backend/validators/renstraTargetValidator.js
const { body } = require("express-validator");

exports.createOrUpdateRenstraTarget = [
  // Safe validation (transisi):
  // - Controller create akan memaksa indikator_id + details lengkap untuk data baru.
  // - Endpoint update boleh tidak mengirim indikator_id/details agar tidak memblok edit data legacy.
  body("indikator_id")
    .optional()
    .isInt({ min: 1 })
    .withMessage("indikator_id harus berupa angka (>=1)"),

  body("details")
    .optional()
    .isArray({ min: 1 })
    .withMessage("details harus berupa array dan tidak boleh kosong jika dikirim"),

  body("details.*.tahun")
    .optional()
    .isInt({ min: 2000, max: 2100 })
    .withMessage("details.tahun harus angka (2000-2100)"),

  body("details.*.level")
    .optional()
    .isString()
    .withMessage("details.level harus berupa teks"),

  body("details.*.target_value")
    .optional()
    .isDecimal()
    .withMessage("details.target_value harus berupa angka desimal"),

  body("lokasi").optional().isString().withMessage("lokasi harus berupa teks"),
];
