"use strict";

const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const ctrl = require("../controllers/planController");

router.get("/catalog", verifyToken, ctrl.catalog);

module.exports = router;
