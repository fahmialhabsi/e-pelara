const express = require("express");
const controller = require("../controllers/renstra_tabelPrioritasController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");
const router = express.Router();

const READ  = ["SUPER_ADMIN","ADMINISTRATOR","PENGAWAS","PELAKSANA"];
const WRITE = ["SUPER_ADMIN","ADMINISTRATOR"];

router.get("/",       verifyToken, allowRoles(READ),  controller.findAll);
router.get("/:id",    verifyToken, allowRoles(READ),  controller.findOne);
router.post("/",      verifyToken, allowRoles(WRITE), controller.create);
router.put("/:id",    verifyToken, allowRoles(WRITE), controller.update);
router.delete("/:id", verifyToken, allowRoles(WRITE), controller.delete);

module.exports = router;
