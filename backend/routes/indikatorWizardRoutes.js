const express = require("express");
const router = express.Router();
const wizardCtl = require("../controllers/indikatorWizardController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

// Langkah wizard: hanya untuk role tertentu (mis. PELAKSANA)
const roles = ["SUPER_ADMIN", "ADMINISTRATOR", "PELAKSANA"];

// ======== STATIS HARUS DI ATAS ==============
router.get(
  "/count",
  verifyToken,
  allowRoles(roles),
  wizardCtl.countIndikatorWizard
);

// Step 1: buat draft
router.post("/", verifyToken, allowRoles(roles), wizardCtl.createDraft);

// Steps 2–5: update FK + stage
router.put("/:id", verifyToken, allowRoles(roles), wizardCtl.updateStep);

// Simpan kinerjaRows detail
router.post("/:id/detail", verifyToken, allowRoles(roles), wizardCtl.addDetail);

// Report per-step
router.get("/", verifyToken, allowRoles(roles), wizardCtl.getByStage);

// routes/indikatorWizard.js

router.delete(
  "/:id",
  verifyToken,
  allowRoles(roles),
  wizardCtl.deleteIndikator
);

module.exports = router;
