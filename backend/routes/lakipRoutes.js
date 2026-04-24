const express = require("express");
const router = express.Router();
const LakipController = require("../controllers/lakipController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");
const guardApproved = require("../middlewares/guardApproved");

router.get(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  LakipController.getAll
);
router.get(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  LakipController.getById
);
router.post(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  LakipController.create
);
router.put(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  guardApproved("lakip"),
  LakipController.update
);
router.delete(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  guardApproved("lakip"),
  LakipController.destroy
);

module.exports = router;
