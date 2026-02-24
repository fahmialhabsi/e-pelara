// routes/subKegiatanRoutes.js
const express = require("express");
const router = express.Router();
const subKegiatanController = require("../controllers/subKegiatanController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");
const { validateSubKegiatan } = require("../utils/entityValidator");

// Role dengan hak penuh
const adminOnly = ["SUPER_ADMIN", "ADMINISTRATOR"];
// Role hanya baca
const readOnly = [...adminOnly, "PENGAWAS", "PELAKSANA"];

// GET list dengan paginasi dan filter
router.get("/", verifyToken, allowRoles(readOnly), subKegiatanController.list);

// GET detail by ID
router.get(
  "/:id",
  verifyToken,
  allowRoles(readOnly),
  subKegiatanController.getById
);

// POST buat sub kegiatan
router.post(
  "/",
  verifyToken,
  allowRoles(adminOnly),
  validateSubKegiatan,
  subKegiatanController.create
);

// PUT update sub kegiatan
router.put(
  "/:id",
  verifyToken,
  allowRoles(adminOnly),
  validateSubKegiatan,
  subKegiatanController.update
);

// DELETE hapus sub kegiatan
router.delete(
  "/:id",
  verifyToken,
  allowRoles(adminOnly),
  subKegiatanController.delete
);

module.exports = router;
