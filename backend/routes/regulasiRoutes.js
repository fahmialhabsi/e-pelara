"use strict";

const express = require("express");
const router = express.Router();
const regulasiController = require("../controllers/regulasiController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

const readRoles = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"];

router.get(
  "/versi",
  verifyToken,
  allowRoles(readRoles),
  regulasiController.listVersi,
);

router.get(
  "/compare",
  verifyToken,
  allowRoles(readRoles),
  regulasiController.compare,
);

module.exports = router;
