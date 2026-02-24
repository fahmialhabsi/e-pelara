// backend/utils/entityValidator.js
const { body } = require("express-validator");

// Program Validator
exports.validateProgram = [
  (req, res, next) => {
    console.log("[validateProgram] Validasi program:", req.method, req.body);
    next();
  },
  body("sasaran_id").notEmpty().withMessage("sasaran_id wajib diisi"),
  body("nama_program").notEmpty().withMessage("nama_program wajib diisi"),
  body("kode_program").notEmpty().withMessage("kode_program wajib diisi"),
  body("rpjmd_id").notEmpty().withMessage("rpjmd_id wajib diisi"),
  body("prioritas").notEmpty().withMessage("prioritas wajib diisi"),
  body("tahun").notEmpty().withMessage("tahun wajib diisi").isInt(),
  body("jenis_dokumen").notEmpty().withMessage("jenis_dokumen wajib diisi"),
];

// Kegiatan Validator
exports.validateKegiatan = [
  body("program_id").notEmpty().withMessage("program_id wajib diisi"),
  body("nama_kegiatan").notEmpty().withMessage("nama_kegiatan wajib diisi"),
  body("kode_kegiatan").notEmpty().withMessage("kode_kegiatan wajib diisi"),
  body("jenis_dokumen").notEmpty().withMessage("jenis_dokumen wajib diisi"),
  body("tahun").notEmpty().withMessage("tahun wajib diisi").isInt(),
];

// Sub Kegiatan Validator
exports.validateSubKegiatan = [
  body("kegiatan_id").notEmpty().withMessage("kegiatan_id wajib diisi"),
  body("kode_sub_kegiatan")
    .notEmpty()
    .withMessage("kode_sub_kegiatan wajib diisi"),
  body("nama_sub_kegiatan")
    .notEmpty()
    .withMessage("nama_sub_kegiatan wajib diisi"),
  body("nama_opd").notEmpty().withMessage("nama_opd wajib diisi"),
  body("nama_bidang_opd").notEmpty().withMessage("nama_bidang_opd wajib diisi"),
  body("sub_bidang_opd").notEmpty().withMessage("sub_bidang_opd wajib diisi"),
  body("jenis_dokumen").notEmpty().withMessage("jenis_dokumen wajib diisi"),
  body("tahun").notEmpty().withMessage("tahun wajib diisi").isInt(),
];

// Periode Validator
const validatePeriode = [
  body("tahun_awal")
    .notEmpty()
    .withMessage("Tahun awal wajib diisi.")
    .isInt({ min: 1900 })
    .withMessage("Tahun awal harus berupa angka yang valid."),
  body("tahun_akhir")
    .notEmpty()
    .withMessage("Tahun akhir wajib diisi.")
    .isInt({ min: 1900 })
    .withMessage("Tahun akhir harus berupa angka yang valid."),
  body("tahun_akhir").custom((value, { req }) => {
    if (value < req.body.tahun_awal) {
      throw new Error("Tahun akhir tidak boleh lebih kecil dari tahun awal.");
    }
    return true;
  }),
];

exports.validatePeriode = validatePeriode;
