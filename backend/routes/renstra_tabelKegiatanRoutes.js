const express = require("express");
const controller = require("../controllers/renstra_tabelKegiatanController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

const router = express.Router();

const READ = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"];
const HISTORY_READ = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS"];
const WRITE = ["SUPER_ADMIN", "ADMINISTRATOR"];
const DELETE = ["SUPER_ADMIN"];

// ========================= READ =========================
router.get("/", verifyToken, allowRoles(READ), controller.findAll);

router.get(
  "/:id/history",
  verifyToken,
  allowRoles(HISTORY_READ),
  controller.history
);

router.get("/:id", verifyToken, allowRoles(READ), controller.findOne);

// ========================= CREATE / UPDATE =========================
router.post("/", verifyToken, allowRoles(WRITE), controller.create);

router.post(
  "/:id/revisi",
  verifyToken,
  allowRoles(WRITE),
  controller.createRevisi
);

router.post(
  "/:id/rebuild-active-from-history",
  verifyToken,
  allowRoles(DELETE),
  controller.rebuildActiveFromHistory
);

// Optional legacy alias
router.post(
  "/:id/rebuild",
  verifyToken,
  allowRoles(DELETE),
  controller.rebuildActiveFromHistory
);

router.put("/:id", verifyToken, allowRoles(WRITE), controller.update);

// ========================= WORKFLOW HISTORY BASED =========================
router.patch(
  "/history/:history_id/verifikasi",
  verifyToken,
  allowRoles(WRITE),
  controller.verifikasiHistory
);

router.patch(
  "/history/:history_id/approve",
  verifyToken,
  allowRoles(DELETE),
  controller.approveHistory
);

router.patch(
  "/history/:history_id/tolak",
  verifyToken,
  allowRoles(DELETE),
  controller.tolakHistory
);

// ========================= DELETE =========================
router.delete("/:id", verifyToken, allowRoles(DELETE), controller.delete);

module.exports = router;