// === routes/roleRoutes.js ===
const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");
const roleController = require("../controllers/roleController");

// 👮‍♂️ SUPER_ADMIN dapat membuat role baru
router.post(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN"]),
  roleController.createRole
);

// 👀 SUPER_ADMIN dan ADMINISTRATOR dapat melihat daftar role
router.get(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  roleController.getRoles
);

// 🔎 Lihat detail role berdasarkan ID
router.get(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PELAKSANA"]),
  roleController.getRoleById
);

// ✏️ Update hanya oleh SUPER_ADMIN
router.put(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN"]),
  roleController.updateRole
);

// 🗑️ Hapus role hanya oleh SUPER_ADMIN
router.delete(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN"]),
  roleController.deleteRole
);

module.exports = router;
