"use strict";

const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");
const ctrl = require("../controllers/planningAuditDashboardController");

/** Admin, QA (pengawas), technical lead sering memetakan ke PENGAWAS — baca saja. */
const auditReaders = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS"];

router.get("/summary", verifyToken, allowRoles(auditReaders), ctrl.summary);
router.get("/", verifyToken, allowRoles(auditReaders), ctrl.list);
router.get("/:recordKey", verifyToken, allowRoles(auditReaders), ctrl.detail);

module.exports = router;
