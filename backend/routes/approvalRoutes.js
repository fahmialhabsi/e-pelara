// routes/approvalRoutes.js
// Workflow persetujuan: submit → approve/reject/revise

const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");
const {
  getStatus,
  getHistory,
  submit,
  approve,
  reject,
  revise,
  getPending,
} = require("../controllers/approvalController");

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMINISTRATOR"];

// Semua route butuh login
router.use(verifyToken);

// GET  /api/approval/status?entity_type=misi&entity_id=5
router.get("/status", getStatus);

// GET  /api/approval/history?entity_type=misi&entity_id=5
router.get("/history", getHistory);

// GET  /api/approval/pending  — daftar menunggu persetujuan (admin only)
router.get("/pending", allowRoles(ADMIN_ROLES), getPending);

// POST /api/approval/submit
router.post("/submit", submit);

// POST /api/approval/approve  — admin only
router.post("/approve", allowRoles(ADMIN_ROLES), approve);

// POST /api/approval/reject   — admin only
router.post("/reject", allowRoles(ADMIN_ROLES), reject);

// POST /api/approval/revise   — admin only
router.post("/revise", allowRoles(ADMIN_ROLES), revise);

module.exports = router;
