const express = require("express");
const router = express.Router();
const controller = require("../controllers/indikatorTujuanController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

// Roles
const allRoles = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"];
const adminRoles = ["SUPER_ADMIN", "ADMINISTRATOR"];

// ✅ GET all indikator
router.get("/", verifyToken, allowRoles(allRoles), controller.findAll);

// ✅ GET indikator by tujuan_id (query)
router.get(
  "/by-tujuan",
  verifyToken,
  allowRoles(allRoles),
  controller.listByTujuan
);

// ✅ GET context tujuan + sub_kegiatan
router.get(
  "/context",
  verifyToken,
  allowRoles(allRoles),
  controller.getContext
);

// ✅ POST bulk detail (wizard step)
router.post(
  "/wizard/:indikatorId/detail",
  verifyToken,
  allowRoles(adminRoles),
  controller.bulkCreateDetail
);

// ✅ GET next kode indikator
router.get(
  "/:tujuan_id/next-kode",
  verifyToken,
  allowRoles(allRoles),
  controller.getNextKode
);

// ✅ GET context dari sub_kegiatan
router.get(
  "/context/sub-kegiatan/:sub_kegiatan_id",
  verifyToken,
  allowRoles(allRoles),
  controller.getSubKegiatanContext
);

// ✅ GET one indikator
router.get("/:id", verifyToken, allowRoles(allRoles), controller.findOne);

// ✅ POST create indikator
router.post("/", verifyToken, allowRoles(adminRoles), controller.create);

// ✅ PUT update indikator
router.put("/:id", verifyToken, allowRoles(adminRoles), controller.update);

// ✅ DELETE indikator
router.delete("/:id", verifyToken, allowRoles(adminRoles), controller.remove);

module.exports = router;
