// rpjmd-backend/routes/monev/evaluasiRoutes.js
const express = require("express");
const router = express.Router();
const evaluasiController = require("../../controllers/monev/evaluasiController");

// Route untuk CRUD evaluasi
router.post(
  "/create",
  verifyToken,
  allowRoles(["SUPER ADMIN", "ADMINISTRATOR"]),
  evaluasiController.createEvaluasi
);
router.get(
  "/",
  verifyToken,
  allowRoles(["SUPER ADMIN", "ADMINISTRATOR"]),
  evaluasiController.getEvaluasi
);

module.exports = router;
