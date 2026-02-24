const express = require("express");
const router = express.Router();
const RenstraExportController = require("../controllers/renstra_exportController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

// Endpoint: /api/renstra/export
router.get(
  "/export",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  RenstraExportController.getAll
);

module.exports = router;
