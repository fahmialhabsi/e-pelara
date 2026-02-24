// routes/prioritasNasional.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/prioritasNasionalController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

// Daftar & detail bisa diakses semua level
router.get(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  controller.getAll
);
router.get(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  controller.getById
);

// Buat, edit, hapus khusus SUPER_ADMIN & ADMINISTRATOR
router.post("/", verifyToken, allowRoles(["SUPER_ADMIN"]), controller.create);
router.put("/:id", verifyToken, allowRoles(["SUPER_ADMIN"]), controller.update);
router.delete(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  controller.remove
);

module.exports = router;
