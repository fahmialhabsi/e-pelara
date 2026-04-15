"use strict";

const express = require("express");
const router = express.Router();
const RenstraController = require("../controllers/renstraController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");
const guardApproved = require("../middlewares/guardApproved");
const requireChangeReason = require("../middlewares/requireChangeReason");

const READ_ROLES = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"];
const WRITE_ROLES = ["SUPER_ADMIN", "ADMINISTRATOR"];
const WORKFLOW_ACTIONS = ["submit", "approve", "reject", "revise", "reset"];

router.get("/", verifyToken, allowRoles(READ_ROLES), RenstraController.getAll);
router.get("/sync", verifyToken, allowRoles(READ_ROLES), RenstraController.syncFromEPelara);
router.get(
  "/:id/audit",
  verifyToken,
  allowRoles(READ_ROLES),
  RenstraController.getAudit,
);
router.get("/:id", verifyToken, allowRoles(READ_ROLES), RenstraController.getById);

router.post(
  "/",
  verifyToken,
  allowRoles(WRITE_ROLES),
  requireChangeReason,
  RenstraController.create,
);

router.patch(
  "/:id/status",
  verifyToken,
  allowRoles(WRITE_ROLES),
  requireChangeReason,
  RenstraController.updateStatus,
);
router.post(
  "/:id/actions/:action",
  verifyToken,
  allowRoles(WRITE_ROLES),
  requireChangeReason,
  RenstraController.runStatusAction,
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
    RenstraController.runStatusAction,
  );
});

router.put(
  "/:id",
  verifyToken,
  allowRoles(WRITE_ROLES),
  guardApproved("renstra"),
  requireChangeReason,
  RenstraController.update,
);

router.delete(
  "/:id",
  verifyToken,
  allowRoles(WRITE_ROLES),
  guardApproved("renstra"),
  requireChangeReason,
  RenstraController.destroy,
);

module.exports = router;
