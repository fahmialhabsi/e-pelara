const express = require("express");
const router = express.Router();
const controller = require("../controllers/lakipRealisasiAnggaranController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

const WRITE = ["SUPER_ADMIN", "ADMINISTRATOR"];

router.post("/sync", verifyToken, allowRoles(WRITE), controller.sync);

module.exports = router;
