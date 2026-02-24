// File: routes/renstraBabRoutes.js
const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const renstraBabController = require("../controllers/renstraBabController");

// GET 1 bab (isi: array subbab)
router.get("/:tahun/bab/:bab", renstraBabController.getBab);

// PUT 1 bab (isi: array subbab/tabel dinamis)
router.put(
  "/:tahun/bab/:bab",
  [
    body("judul_bab").notEmpty().withMessage("Judul bab wajib diisi"),
    body("subbabList")
      .isArray({ min: 1 })
      .withMessage("subbabList harus berupa array dengan minimal satu elemen"),
    body("subbabList.*.nomor")
      .notEmpty()
      .withMessage("Nomor subbab wajib diisi"),
    body("subbabList.*.judul")
      .notEmpty()
      .withMessage("Judul subbab wajib diisi"),
    body("subbabList.*.isi").notEmpty().withMessage("Isi subbab wajib diisi"),
  ],
  renstraBabController.updateBab
);

module.exports = router;
