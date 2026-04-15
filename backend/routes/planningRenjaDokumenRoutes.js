"use strict";

const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");
const ctrl = require("../controllers/planningRenjaDokumenController");
const dashCtrl = require("../controllers/planningDashboardController");
const govCtrl = require("../controllers/renjaGovernanceController");
const exportCtrl = require("../controllers/planningDocumentExportController");
const schemas = require("../middlewares/planningDomainSchemas");
const requireChangeReason = require("../middlewares/requireChangeReason");

const READ_ROLES = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"];
const WRITE_ROLES = ["SUPER_ADMIN", "ADMINISTRATOR", "PELAKSANA"];

router.get("/dashboard-v2", verifyToken, allowRoles(READ_ROLES), dashCtrl.renjaDashboardV2);

// Dashboard contract endpoints (requested)
router.get("/dashboard/summary", verifyToken, allowRoles(READ_ROLES), govCtrl.getDashboardSummary);
router.get(
  "/dashboard/recent-documents",
  verifyToken,
  allowRoles(READ_ROLES),
  govCtrl.getDashboardRecent,
);
router.get(
  "/dashboard/action-items",
  verifyToken,
  allowRoles(READ_ROLES),
  govCtrl.getDashboardActionItems,
);
router.get(
  "/dashboard/mismatch-alerts",
  verifyToken,
  allowRoles(READ_ROLES),
  govCtrl.getDashboardMismatchAlerts,
);

router.get(
  "/referensi/buat-dokumen",
  verifyToken,
  allowRoles(READ_ROLES),
  ctrl.referensiBuatDokumen,
);

router.get("/dokumen", verifyToken, allowRoles(READ_ROLES), ctrl.listDokumen);
router.get("/dokumen/:id/audit", verifyToken, allowRoles(READ_ROLES), ctrl.getDokumenAudit);
router.get(
  "/dokumen/:id/change-log",
  verifyToken,
  allowRoles(READ_ROLES),
  ctrl.getDokumenChangeLog,
);
router.get("/dokumen/:id", verifyToken, allowRoles(READ_ROLES), ctrl.getDokumenById);
router.get("/dokumen/:id/export", verifyToken, allowRoles(READ_ROLES), govCtrl.exportDocument);
router.get(
  "/dokumen/:id/validate-official",
  verifyToken,
  allowRoles(READ_ROLES),
  exportCtrl.renjaDokumenValidateOfficial,
);
router.post(
  "/dokumen",
  verifyToken,
  allowRoles(WRITE_ROLES),
  schemas.validate(schemas.renjaDokumenCreate),
  requireChangeReason,
  ctrl.createDokumen,
);
router.put(
  "/dokumen/:id",
  verifyToken,
  allowRoles(WRITE_ROLES),
  schemas.validate(schemas.renjaDokumenUpdate),
  requireChangeReason,
  ctrl.updateDokumen,
);

router.post(
  "/dokumen/:id/generate-docx",
  verifyToken,
  allowRoles(READ_ROLES),
  exportCtrl.renjaDokumenGenerateDocx,
);
router.post(
  "/dokumen/:id/generate-pdf",
  verifyToken,
  allowRoles(READ_ROLES),
  exportCtrl.renjaDokumenGeneratePdf,
);
router.post(
  "/dokumen/:id/generate-official-docx",
  verifyToken,
  allowRoles(READ_ROLES),
  exportCtrl.renjaDokumenGenerateOfficialDocx,
);
router.post(
  "/dokumen/:id/generate-official-pdf",
  verifyToken,
  allowRoles(READ_ROLES),
  exportCtrl.renjaDokumenGenerateOfficialPdf,
);

router.get("/item", verifyToken, allowRoles(READ_ROLES), ctrl.listItem);
router.post(
  "/item",
  verifyToken,
  allowRoles(WRITE_ROLES),
  schemas.validate(schemas.renjaItemCreate),
  requireChangeReason,
  ctrl.createItem,
);
router.put(
  "/item/:id",
  verifyToken,
  allowRoles(WRITE_ROLES),
  schemas.validate(schemas.renjaItemUpdate),
  requireChangeReason,
  ctrl.updateItem,
);

router.post(
  "/item/:id/link-rkpd",
  verifyToken,
  allowRoles(WRITE_ROLES),
  schemas.validate(schemas.linkRkpdBody),
  requireChangeReason,
  ctrl.linkRkpd,
);
router.get("/item/:id/rkpd-link", verifyToken, allowRoles(READ_ROLES), ctrl.getRkpdLink);

// REST v2 alias (diprefix /v2 agar tidak bentrok endpoint legacy /api/renja)
router.get("/v2", verifyToken, allowRoles(READ_ROLES), ctrl.listDokumen);
router.get("/v2/:id", verifyToken, allowRoles(READ_ROLES), ctrl.getDokumenById);
router.post(
  "/v2",
  verifyToken,
  allowRoles(WRITE_ROLES),
  schemas.validate(schemas.renjaDokumenCreate),
  requireChangeReason,
  ctrl.createDokumen,
);
router.put(
  "/v2/:id",
  verifyToken,
  allowRoles(WRITE_ROLES),
  schemas.validate(schemas.renjaDokumenUpdate),
  requireChangeReason,
  ctrl.updateDokumen,
);
router.delete("/v2/:id", verifyToken, allowRoles(WRITE_ROLES), requireChangeReason, govCtrl.deleteDokumen);

// Workflow + versioning
router.post(
  "/v2/:id/submit",
  verifyToken,
  allowRoles(WRITE_ROLES),
  requireChangeReason,
  (req, _res, next) => {
    req.params.action = "submit";
    next();
  },
  govCtrl.workflowAction,
);
router.post(
  "/v2/:id/review",
  verifyToken,
  allowRoles(WRITE_ROLES),
  requireChangeReason,
  (req, _res, next) => {
    req.params.action = "review";
    next();
  },
  govCtrl.workflowAction,
);
router.post(
  "/v2/:id/approve",
  verifyToken,
  allowRoles(WRITE_ROLES),
  requireChangeReason,
  (req, _res, next) => {
    req.params.action = "approve";
    next();
  },
  govCtrl.workflowAction,
);
router.post(
  "/v2/:id/publish",
  verifyToken,
  allowRoles(WRITE_ROLES),
  requireChangeReason,
  (req, _res, next) => {
    req.params.action = "publish";
    next();
  },
  govCtrl.workflowAction,
);
router.post(
  "/v2/:id/create-revision",
  verifyToken,
  allowRoles(WRITE_ROLES),
  schemas.validate(schemas.renjaCreateRevision),
  requireChangeReason,
  govCtrl.createRevision,
);
router.get("/v2/:id/versions", verifyToken, allowRoles(READ_ROLES), govCtrl.listVersions);
router.get("/v2/:id/compare", verifyToken, allowRoles(READ_ROLES), govCtrl.compareVersions);
router.get("/v2/:id/export", verifyToken, allowRoles(READ_ROLES), govCtrl.exportDocument);

// Sections BAB I-V
router.get("/v2/:id/sections", verifyToken, allowRoles(READ_ROLES), govCtrl.getSections);
router.put(
  "/v2/:id/sections/:sectionKey",
  verifyToken,
  allowRoles(WRITE_ROLES),
  schemas.validate(schemas.renjaSectionUpdate),
  requireChangeReason,
  govCtrl.putSection,
);

// Item management per dokumen
router.get("/v2/:id/items", verifyToken, allowRoles(READ_ROLES), govCtrl.listItems);
router.post(
  "/v2/:id/items",
  verifyToken,
  allowRoles(WRITE_ROLES),
  schemas.validate(schemas.renjaItemCreate),
  requireChangeReason,
  govCtrl.createItem,
);
router.put(
  "/v2/:id/items/:itemId",
  verifyToken,
  allowRoles(WRITE_ROLES),
  schemas.validate(schemas.renjaItemUpdate),
  requireChangeReason,
  govCtrl.updateItem,
);
router.delete(
  "/v2/:id/items/:itemId",
  verifyToken,
  allowRoles(WRITE_ROLES),
  requireChangeReason,
  govCtrl.deleteItem,
);

// Sync + validation
router.post("/v2/:id/sync/renstra", verifyToken, allowRoles(WRITE_ROLES), requireChangeReason, govCtrl.syncRenstra);
router.post("/v2/:id/sync/rkpd", verifyToken, allowRoles(WRITE_ROLES), requireChangeReason, govCtrl.syncRkpd);
router.get("/v2/:id/validation/mismatch", verifyToken, allowRoles(READ_ROLES), govCtrl.getValidationMismatch);

// Dropdown hierarchy
router.get("/dropdowns/opd", verifyToken, allowRoles(READ_ROLES), govCtrl.dropdownOpd);
router.get("/dropdowns/renstra", verifyToken, allowRoles(READ_ROLES), govCtrl.dropdownRenstra);
router.get("/dropdowns/rkpd", verifyToken, allowRoles(READ_ROLES), govCtrl.dropdownRkpd);
router.get("/dropdowns/sasaran", verifyToken, allowRoles(READ_ROLES), govCtrl.dropdownSasaran);
router.get("/dropdowns/programs", verifyToken, allowRoles(READ_ROLES), govCtrl.dropdownPrograms);
router.get("/dropdowns/kegiatan", verifyToken, allowRoles(READ_ROLES), govCtrl.dropdownKegiatan);
router.get("/dropdowns/sub-kegiatan", verifyToken, allowRoles(READ_ROLES), govCtrl.dropdownSubKegiatan);

module.exports = router;
