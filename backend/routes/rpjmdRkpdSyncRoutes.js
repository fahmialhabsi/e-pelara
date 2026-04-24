"use strict";

const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");
const ctrl = require("../controllers/rpjmdRkpdSyncController");

const adminOnly = ["SUPER_ADMIN", "ADMINISTRATOR"];

router.post("/preview", verifyToken, allowRoles(adminOnly), ctrl.preview);
router.post("/commit", verifyToken, allowRoles(adminOnly), ctrl.commit);

module.exports = router;
