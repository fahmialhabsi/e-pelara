"use strict";

const express = require("express");
const router = express.Router();
const RenjaController = require("../controllers/renjaController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");
const guardApproved = require("../middlewares/guardApproved");
const requireChangeReason = require("../middlewares/requireChangeReason");
const {
  validateRenjaCreate,
  validateRenjaUpdate,
} = require("../middlewares/planningRegulasiValidation");

const READ_ROLES = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"];
const WRITE_ROLES = ["SUPER_ADMIN", "ADMINISTRATOR"];
const WORKFLOW_ACTIONS = ["submit", "approve", "reject", "revise", "reset"];

const planningRenjaDokumenRoutes = require("./planningRenjaDokumenRoutes");
router.use(planningRenjaDokumenRoutes);

router.get("/", verifyToken, allowRoles(READ_ROLES), RenjaController.getAll);
router.get("/sync", verifyToken, allowRoles(READ_ROLES), RenjaController.syncFromEPelara);
router.post(
  "/link-rkpd",
  verifyToken,
  allowRoles(WRITE_ROLES),
  RenjaController.postLinkRkpd,
);
router.get(
  "/:id/rkpd",
  verifyToken,
  allowRoles(READ_ROLES),
  RenjaController.listRenjaRkpd,
);
router.get(
  "/:id/audit",
  verifyToken,
  allowRoles(READ_ROLES),
  RenjaController.getAudit,
);
router.get("/:id", verifyToken, allowRoles(READ_ROLES), RenjaController.getById);

router.post(
  "/",
  verifyToken,
  allowRoles(WRITE_ROLES),
  validateRenjaCreate,
  requireChangeReason,
  RenjaController.create,
);

router.patch(
  "/:id/status",
  verifyToken,
  allowRoles(WRITE_ROLES),
  requireChangeReason,
  RenjaController.updateStatus,
);
router.post(
  "/:id/actions/:action",
  verifyToken,
  allowRoles(WRITE_ROLES),
  requireChangeReason,
  RenjaController.runStatusAction,
);
WORKFLOW_ACTIONS.forEach((action) => {
  router.post(
    `/:id/${action}`,
    verifyToken,
    allowRoles(WRITE_ROLES),
    requireChangeReason,
    (req, _res, next) => {
      req.params.action = action;
      next();
    },
    RenjaController.runStatusAction,
  );
});

router.put(
  "/:id",
  verifyToken,
  allowRoles(WRITE_ROLES),
  guardApproved("renja"),
  validateRenjaUpdate,
  requireChangeReason,
  RenjaController.update,
);

router.delete(
  "/:id",
  verifyToken,
  allowRoles(WRITE_ROLES),
  guardApproved("renja"),
  requireChangeReason,
  RenjaController.destroy,
);

module.exports = router;
