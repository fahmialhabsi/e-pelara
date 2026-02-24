const express = require("express");
const controller = require("../controllers/renstra_tabelKegiatanController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

const router = express.Router();

// 🔹 CRUD RenstraTabelKegiatan
router.post(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  controller.create
);

router.put(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  controller.update
);

router.delete(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN"]),
  controller.delete
);

// 🔹 Get all / one
router.get(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  controller.findAll
);

router.get(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  controller.findOne
);

router.get(
  "/available-pagu",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  controller.availablePagu
);

module.exports = router;
