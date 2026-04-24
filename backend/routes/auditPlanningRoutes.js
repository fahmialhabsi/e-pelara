"use strict";

const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");
const ctrl = require("../controllers/auditPerencanaanController");

const READ_ROLES = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"];

router.get(
  "/perencanaan-consistency",
  verifyToken,
  allowRoles(READ_ROLES),
  ctrl.getPerencanaanConsistency,
);

module.exports = router;
