const express = require("express");
const router = express.Router();
const controller = require("../controllers/renstra_pagu_cacheController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");


const READ = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"];
const WRITE = ["SUPER_ADMIN", "ADMINISTRATOR"];



router.get("/", verifyToken, allowRoles(READ), controller.findAll);


module.exports = router;