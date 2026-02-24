const express = require("express");
const router = express.Router();
const indikatorControllerDetail = require("../controllers/indikatorControllerDetail");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

// Create new Indikator
router.post(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  indikatorControllerDetail.createIndikator
);

// Get all Indikator
router.get(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  indikatorControllerDetail.getIndikators
);

// Get one Indikator by ID
router.get(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  indikatorControllerDetail.getIndikatorById
);

// Update an Indikator
router.put(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS"]),
  indikatorControllerDetail.updateIndikator
);

// Delete an Indikator
router.delete(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  indikatorControllerDetail.deleteIndikator
);

module.exports = router;
