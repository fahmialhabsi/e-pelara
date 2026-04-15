/**
 * kodeRekeningRoutes.js
 * Mounted at /api/rekening
 *
 * JANGAN gunakan path param seperti /:kode untuk kode rekening (berisi titik).
 * Express 5 + path-to-regexp v8 menolak pola lama seperti /:kode(*).
 */
const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");
const ctrl = require("../controllers/kodeRekeningController");

const ALL = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"];

router.use(verifyToken);

router.get("/search", allowRoles(ALL), ctrl.search);
router.post("/validate", allowRoles(ALL), ctrl.validateBatch);
// Detail: GET /api/rekening/detail?kode=5.1.01.01
router.get("/detail", allowRoles(ALL), ctrl.getByKode);

module.exports = router;
