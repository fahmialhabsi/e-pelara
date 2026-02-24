const express = require("express");
const router = express.Router();
const { register, login } = require("../controllers/authController");
const authController = require("../controllers/authController");
const rateLimit = require("express-rate-limit");

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 menit
  max: process.env.NODE_ENV === "production" ? 10 : 1000,
  message: "Terlalu banyak percobaan, coba lagi nanti.",
});

// Logout route (TAMBAHKAN INI)
router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  return res.json({ message: "Logout berhasil!" });
});

// Rute untuk registrasi pengguna baru (rate limit aktif!)
router.post(
  "/register",
  authLimiter,
  (req, res, next) => {
    console.log("POST /register hit");
    next();
  },
  register
);

// Rute untuk login pengguna (rate limit aktif!)
router.post("/login", authLimiter, login);

router.post("/refresh-token", authController.refreshToken);

module.exports = router;
