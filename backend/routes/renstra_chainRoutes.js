const express = require("express");
const router = express.Router();
const controller = require("../controllers/renstra_chainController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

const READ = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"];
const WRITE = ["SUPER_ADMIN", "ADMINISTRATOR"];

router.get("/validate", verifyToken, allowRoles(READ), controller.validate);
router.post("/repair", verifyToken, allowRoles(WRITE), controller.repair);

module.exports = router;