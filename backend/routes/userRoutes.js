// === routes/userRoutes.js ===
const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

// Cek apakah SUPER ADMIN sudah ada
router.get("/check-superadmin", userController.checkSuperAdmin);

// Tambah pengguna (SUPER ADMIN & ADMINISTRATOR)
router.post(
  "/users",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  userController.createUser
);

// Ambil semua pengguna (SUPER ADMIN, ADMINISTRATOR, PENGAWAS)
router.get(
  "/users",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS"]),
  userController.getUsers
);

// Ambil profil diri sendiri
router.get(
  "/users/me",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  userController.getMe
);

// Ambil detail pengguna berdasarkan ID
router.get(
  "/users/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  userController.getUserById
);

// Update pengguna (SUPER ADMIN & ADMINISTRATOR)
router.put(
  "/users/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  userController.updateUser
);

// Hapus pengguna (hanya SUPER ADMIN)
router.delete(
  "/users/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN"]),
  userController.deleteUser
);

module.exports = router;
