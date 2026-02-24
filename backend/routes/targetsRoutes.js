// routes/targetsRoutes.js
const express = require("express");
const router = express.Router();
const targetsController = require("../controllers/targetsController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

router.get(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  targetsController.getAllTargets
);

module.exports = router;
