"use strict";

/**
 * MR Narrative Draft Routes
 *
 * PHASE 4 — STEP 18C-1C
 * Route untuk AI-assisted proposal-intake narrative preview.
 */

const express = require("express");

const router = express.Router();

const mrNarrativeDraftController = require("../controllers/mr_NarrativeDraftController");

const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

const WRITE = ["SUPER_ADMIN", "ADMINISTRATOR"];

router.post(
  "/proposal-narrative/preview",
  verifyToken,
  allowRoles(WRITE),
  mrNarrativeDraftController.previewProposalNarrative
);

module.exports = router;