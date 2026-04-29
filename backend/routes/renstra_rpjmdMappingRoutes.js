"use strict";

const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");
const requireChangeReason = require("../middlewares/requireChangeReason");

const ctrl = require("../controllers/renstraRpjmdMappingController");

const WRITE_ROLES = ["SUPER_ADMIN", "ADMINISTRATOR"];

router.post(
  "/apply",
  verifyToken,
  allowRoles(WRITE_ROLES),
  requireChangeReason,
  ctrl.applyMapping,
);

module.exports = router;

