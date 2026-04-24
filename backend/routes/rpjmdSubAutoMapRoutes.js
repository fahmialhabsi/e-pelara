"use strict";

const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");
const ctrl = require("../controllers/rpjmdSubAutoMapController");

const adminOnly = ["SUPER_ADMIN", "ADMINISTRATOR"];

router.post("/preview", verifyToken, allowRoles(adminOnly), ctrl.preview);
router.post("/execute", verifyToken, allowRoles(adminOnly), ctrl.execute);

module.exports = router;
