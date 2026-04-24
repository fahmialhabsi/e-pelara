"use strict";

const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");
const ctrl = require("../controllers/planningRkpdDokumenController");
const dashCtrl = require("../controllers/planningDashboardController");
const exportCtrl = require("../controllers/planningDocumentExportController");
const schemas = require("../middlewares/planningDomainSchemas");
const requireChangeReason = require("../middlewares/requireChangeReason");

const READ_ROLES = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"];
/** Draft perencanaan v2: izinkan PELAKSANA mengisi dokumen/item (selain final gate di service). */
const WRITE_ROLES = ["SUPER_ADMIN", "ADMINISTRATOR", "PELAKSANA"];

router.get(
  "/dashboard-v2",
  verifyToken,
  allowRoles(READ_ROLES),
  dashCtrl.rkpdDashboardV2,
);

router.get("/dokumen", verifyToken, allowRoles(READ_ROLES), ctrl.listDokumen);
router.get(
  "/dokumen/:id/audit",
  verifyToken,
  allowRoles(READ_ROLES),
  ctrl.getDokumenAudit,
);
router.get(
  "/dokumen/:id/change-log",
  verifyToken,
  allowRoles(READ_ROLES),
  ctrl.getDokumenChangeLog,
);
router.get("/dokumen/:id", verifyToken, allowRoles(READ_ROLES), ctrl.getDokumenById);
router.get(
  "/dokumen/:id/validate-official",
  verifyToken,
  allowRoles(READ_ROLES),
  exportCtrl.rkpdDokumenValidateOfficial,
);
router.post(
  "/dokumen",
  verifyToken,
  allowRoles(WRITE_ROLES),
  schemas.validate(schemas.rkpdDokumenCreate),
  requireChangeReason,
  ctrl.createDokumen,
);
router.put(
  "/dokumen/:id",
  verifyToken,
  allowRoles(WRITE_ROLES),
  schemas.validate(schemas.rkpdDokumenUpdate),
  requireChangeReason,
  ctrl.updateDokumen,
);

router.post(
  "/dokumen/:id/generate-docx",
  verifyToken,
  allowRoles(READ_ROLES),
  exportCtrl.rkpdDokumenGenerateDocx,
);
router.post(
  "/dokumen/:id/generate-pdf",
  verifyToken,
  allowRoles(READ_ROLES),
  exportCtrl.rkpdDokumenGeneratePdf,
);
router.post(
  "/dokumen/:id/generate-official-docx",
  verifyToken,
  allowRoles(READ_ROLES),
  exportCtrl.rkpdDokumenGenerateOfficialDocx,
);
router.post(
  "/dokumen/:id/generate-official-pdf",
  verifyToken,
  allowRoles(READ_ROLES),
  exportCtrl.rkpdDokumenGenerateOfficialPdf,
);

router.get("/item", verifyToken, allowRoles(READ_ROLES), ctrl.listItem);
router.post(
  "/item",
  verifyToken,
  allowRoles(WRITE_ROLES),
  schemas.validate(schemas.rkpdItemCreate),
  requireChangeReason,
  ctrl.createItem,
);
router.put(
  "/item/:id",
  verifyToken,
  allowRoles(WRITE_ROLES),
  schemas.validate(schemas.rkpdItemUpdate),
  requireChangeReason,
  ctrl.updateItem,
);

module.exports = router;
