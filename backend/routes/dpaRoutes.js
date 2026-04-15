const express = require("express");
const router = express.Router();
const DpaController = require("../controllers/dpaController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");
const guardApproved = require("../middlewares/guardApproved");
const requireChangeReason = require("../middlewares/requireChangeReason");

router.get(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  DpaController.getAll
);

router.get(
  "/:id/audit",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  DpaController.getAudit
);

router.get(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  DpaController.getById
);

router.post(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  requireChangeReason,
  DpaController.create,
);

router.put(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  guardApproved("dpa"),
  requireChangeReason,
  DpaController.update
);

router.delete(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  guardApproved("dpa"),
  requireChangeReason,
  DpaController.destroy
);

module.exports = router;
