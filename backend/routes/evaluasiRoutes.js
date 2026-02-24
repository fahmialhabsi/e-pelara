// routes/evaluasiRoutes.js
const express = require("express");
const router = express.Router();
const evaluasiController = require("../controllers/evaluasiController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

router.post(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  evaluasiController.createEvaluasi
);
router.get(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  evaluasiController.getAllEvaluasi
);

module.exports = router;
