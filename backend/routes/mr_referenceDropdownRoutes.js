"use strict";

/**
 * MR Reference Dropdown Routes
 * ---------------------------------------------------------------------------
 * PHASE 4 — STEP 18B-0
 *
 * Read-only bridge untuk dropdown frontend MR.
 */

const express = require("express");

const controller = require("../controllers/mr_referenceDropdownController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

const router = express.Router();

const READ = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"];

router.get(
  "/group/:kodeGroup",
  verifyToken,
  allowRoles(READ),
  controller.getItemsByGroup
);

module.exports = router;