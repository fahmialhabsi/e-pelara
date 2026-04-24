const express = require("express");
const router = express.Router();
const RkaController = require("../controllers/rkaController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");
const guardApproved = require("../middlewares/guardApproved");
const requireChangeReason = require("../middlewares/requireChangeReason");

router.get(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  RkaController.getAll
);

router.get(
  "/:id/audit",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  RkaController.getAudit
);

router.get(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  RkaController.getById
);

router.post(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  requireChangeReason,
  RkaController.create,
);

router.put(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  guardApproved("rka"),
  requireChangeReason,
  RkaController.update
);

router.delete(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  guardApproved("rka"),
  requireChangeReason,
  RkaController.destroy
);

module.exports = router;
