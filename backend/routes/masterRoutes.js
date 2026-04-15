"use strict";

const express = require("express");
const router = express.Router();
const masterController = require("../controllers/masterController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");
const {
  validateProgramIdQuery,
  validateKegiatanIdQuery,
  validateSubKegiatanIdQuery,
  handleMasterQueryValidation,
} = require("../middlewares/validateMasterQuery");

const readOnly = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"];

router.get(
  "/program",
  verifyToken,
  allowRoles(readOnly),
  masterController.listPrograms,
);

router.get(
  "/kegiatan",
  verifyToken,
  allowRoles(readOnly),
  validateProgramIdQuery,
  handleMasterQueryValidation,
  masterController.listKegiatan,
);

router.get(
  "/sub-kegiatan",
  verifyToken,
  allowRoles(readOnly),
  validateKegiatanIdQuery,
  handleMasterQueryValidation,
  masterController.listSubKegiatan,
);

router.get(
  "/indikator",
  verifyToken,
  allowRoles(readOnly),
  validateSubKegiatanIdQuery,
  handleMasterQueryValidation,
  masterController.listIndikator,
);

router.post(
  "/validate-hierarchy",
  verifyToken,
  allowRoles(readOnly),
  masterController.validateHierarchy,
);

module.exports = router;
