"use strict";

const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");
const ctrl = require("../controllers/tenantController");

const superOnly = ["SUPER_ADMIN"];

router.get(
  "/subscriptions-overview",
  verifyToken,
  allowRoles(superOnly),
  ctrl.listTenantsSubscriptionsOverview,
);
router.get("/", verifyToken, allowRoles(superOnly), ctrl.listTenants);
router.post("/", verifyToken, allowRoles(superOnly), ctrl.createTenant);
router.put(
  "/:id/subscription",
  verifyToken,
  allowRoles(superOnly),
  ctrl.updateTenantSubscription,
);
router.put("/:id", verifyToken, allowRoles(superOnly), ctrl.updateTenant);

module.exports = router;
