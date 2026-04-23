"use strict";

const express = require("express");
const router = express.Router();

const controller = require("../controllers/masterReferensiController");

// MASTER CASCADING
router.get("/master-program", controller.getMasterProgram);
router.get("/master-kegiatan", controller.getMasterKegiatan);
router.get("/master-sub-kegiatan", controller.getMasterSubKegiatan);

module.exports = router;