const express = require("express");
const router  = express.Router();
const wizardController = require("../controllers/wizardController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles  = require("../middlewares/allowRoles");

router.get(
  "/bootstrap-context",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  wizardController.bootstrapContext
);

module.exports = router;
