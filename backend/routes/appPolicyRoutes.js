"use strict";

const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");
const appPolicyController = require("../controllers/appPolicyController");

const adminOnly = ["SUPER_ADMIN", "ADMINISTRATOR"];
const readComplianceRoles = [...adminOnly, "PENGAWAS", "PELAKSANA"];

router.get(
  "/operational-mode",
  verifyToken,
  appPolicyController.getOperationalMode,
);

router.get(
  "/compliance-snapshot",
  verifyToken,
  allowRoles(readComplianceRoles),
  appPolicyController.getComplianceSnapshot,
);

router.post(
  "/compliance-snapshot/record",
  verifyToken,
  allowRoles(adminOnly),
  appPolicyController.postComplianceSnapshotRecord,
);

router.put(
  "/operational-mode",
  verifyToken,
  allowRoles(adminOnly),
  appPolicyController.putOperationalMode,
);

module.exports = router;
