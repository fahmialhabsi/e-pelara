"use strict";

/**
 * Satu-satunya sumber daftar controller yang memanggil writePlanningAudit.
 * Dipakai script `verifyPlanningAuditSnapshots.js` agar tim IT bisa memverifikasi
 * konvensi snapshot tanpa mengandalkan ingatan manual.
 */
const PLANNING_AUDIT_CONTROLLER_FILES = [
  "controllers/rpjmdController.js",
  "controllers/renstraController.js",
  "controllers/renjaController.js",
  "controllers/rkpdController.js",
  "controllers/rkaController.js",
  "controllers/dpaController.js",
  "controllers/planningRenjaDokumenController.js",
  "controllers/planningRkpdDokumenController.js",
  "controllers/planningDocumentVersionController.js",
];

module.exports = { PLANNING_AUDIT_CONTROLLER_FILES };
