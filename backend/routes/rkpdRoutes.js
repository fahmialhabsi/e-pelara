"use strict";

const express = require("express");
const router = express.Router();
const RkpdController = require("../controllers/rkpdController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");
const guardApproved = require("../middlewares/guardApproved");
const requireChangeReason = require("../middlewares/requireChangeReason");
const {
  validateRkpdCreate,
  validateRkpdUpdate,
} = require("../middlewares/planningRegulasiValidation");

const READ_ROLES = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"];
const WRITE_ROLES = ["SUPER_ADMIN", "ADMINISTRATOR"];
const WORKFLOW_ACTIONS = ["submit", "approve", "reject", "revise", "reset"];

const planningRkpdDokumenRoutes = require("./planningRkpdDokumenRoutes");
router.use(planningRkpdDokumenRoutes);

router.get("/", verifyToken, allowRoles(READ_ROLES), RkpdController.getAll);
router.get("/sync", verifyToken, allowRoles(READ_ROLES), RkpdController.syncFromEPelara);
router.post("/sync", verifyToken, allowRoles(READ_ROLES), RkpdController.syncFromEPelara);

router.get(
  "/export/excel",
  verifyToken,
  allowRoles(WRITE_ROLES),
  RkpdController.exportExcel,
);

router.get(
  "/export/pdf",
  verifyToken,
  allowRoles(WRITE_ROLES),
  RkpdController.exportPdf,
);

router.get(
  "/perubahan",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS"]),
  RkpdController.getPerubahanSkema,
);

router.get(
  "/:id/audit",
  verifyToken,
  allowRoles(READ_ROLES),
  RkpdController.getAudit,
);
router.get("/:id", verifyToken, allowRoles(READ_ROLES), RkpdController.getById);
router.post(
  "/",
  verifyToken,
  allowRoles(WRITE_ROLES),
  validateRkpdCreate,
  requireChangeReason,
  RkpdController.create,
);

router.patch(
  "/:id/status",
  verifyToken,
  allowRoles(WRITE_ROLES),
  requireChangeReason,
  RkpdController.updateStatus,
);
router.post(
  "/:id/actions/:action",
  verifyToken,
  allowRoles(WRITE_ROLES),
  requireChangeReason,
  RkpdController.runStatusAction,
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
    RkpdController.runStatusAction,
  );
});

router.put(
  "/:id",
  verifyToken,
  allowRoles(WRITE_ROLES),
  guardApproved("rkpd"),
  validateRkpdUpdate,
  requireChangeReason,
  RkpdController.update,
);

router.delete(
  "/:id",
  verifyToken,
  allowRoles(WRITE_ROLES),
  guardApproved("rkpd"),
  requireChangeReason,
  RkpdController.delete,
);

module.exports = router;
