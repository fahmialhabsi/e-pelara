const express = require("express");
const initController = require("../controllers/rkpdInitController");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

router.post(
  "/init",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  initController.initAll
);

module.exports = router;
