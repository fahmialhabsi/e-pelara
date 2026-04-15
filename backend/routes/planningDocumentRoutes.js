"use strict";

const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");
const requireChangeReason = require("../middlewares/requireChangeReason");
const ctrl = require("../controllers/planningDocumentVersionController");

const READ = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"];
const WRITE = ["SUPER_ADMIN", "ADMINISTRATOR"];

router.get(
  "/trace/:documentType/:documentId",
  verifyToken,
  allowRoles(READ),
  ctrl.getTrace,
);

router.get(
  "/versions/:documentType/:documentId",
  verifyToken,
  allowRoles(READ),
  ctrl.listVersions,
);

router.get("/versions/detail/:versionId", verifyToken, allowRoles(READ), ctrl.getVersionDetail);

router.get("/versions/compare", verifyToken, allowRoles(READ), ctrl.compareVersions);

router.post(
  "/versions/:versionId/restore",
  verifyToken,
  allowRoles(WRITE),
  requireChangeReason,
  ctrl.restoreFromVersion,
);

module.exports = router;
