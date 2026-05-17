const express = require("express");
const controller = require("../controllers/renstra_tabelStrategiController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");
const router = express.Router();

const READ  = ["SUPER_ADMIN","ADMINISTRATOR","PENGAWAS","PELAKSANA"];
const WRITE = ["SUPER_ADMIN","ADMINISTRATOR"];

router.post("/", verifyToken, allowRoles(WRITE), controller.create);

router.get("/:id/history", verifyToken, allowRoles(READ), controller.history);

router.post("/:id/revisi", verifyToken, allowRoles(WRITE), controller.createRevisi);

router.post(
  "/:id/rebuild",
  verifyToken,
  allowRoles(["SUPER_ADMIN"]),
  controller.rebuild
);

router.patch(
  "/history/:history_id/verifikasi",
  verifyToken,
  allowRoles(WRITE),
  controller.verifikasiHistory
);

router.patch(
  "/history/:history_id/approve",
  verifyToken,
  allowRoles(["SUPER_ADMIN"]),
  controller.approveHistory
);

router.patch(
  "/history/:history_id/tolak",
  verifyToken,
  allowRoles(["SUPER_ADMIN"]),
  controller.tolakHistory
);

router.get("/", verifyToken, allowRoles(READ), controller.findAll);
router.get("/:id", verifyToken, allowRoles(READ), controller.findOne);
router.put("/:id", verifyToken, allowRoles(WRITE), controller.update);
router.delete("/:id", verifyToken, allowRoles(WRITE), controller.delete);

module.exports = router;
