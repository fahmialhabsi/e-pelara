"use strict";

const express = require("express");
const router = express.Router();
const migrationController = require("../controllers/migrationController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

const adminRoles = ["SUPER_ADMIN", "ADMINISTRATOR"];

router.post(
  "/run-auto-mapping",
  verifyToken,
  allowRoles(adminRoles),
  migrationController.runAutoMapping,
);

/** Alias go-live / SIGAP-style path & body (regulasi_versi_from_id / _to_id) */
router.post(
  "/run-auto-mapping-lite",
  verifyToken,
  allowRoles(adminRoles),
  migrationController.runAutoMapping,
);

router.get(
  "/status",
  verifyToken,
  allowRoles(adminRoles),
  migrationController.status,
);

router.post(
  "/preview",
  verifyToken,
  allowRoles(adminRoles),
  migrationController.preview,
);

router.post(
  "/apply",
  verifyToken,
  allowRoles(adminRoles),
  migrationController.apply,
);

router.post(
  "/test-propagate",
  verifyToken,
  allowRoles(adminRoles),
  migrationController.testPropagate,
);

router.post(
  "/resolve-split",
  verifyToken,
  allowRoles(adminRoles),
  migrationController.resolveSplit,
);

router.post(
  "/test-resolve-split",
  verifyToken,
  allowRoles(adminRoles),
  migrationController.testResolveSplit,
);

router.get(
  "/split-resolutions",
  verifyToken,
  allowRoles(adminRoles),
  migrationController.listSplitResolutions,
);

router.get(
  "/split-coverage",
  verifyToken,
  allowRoles(adminRoles),
  migrationController.getSplitCoverage,
);

module.exports = router;
