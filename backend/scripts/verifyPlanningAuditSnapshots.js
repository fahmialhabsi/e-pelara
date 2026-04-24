#!/usr/bin/env node
"use strict";

/**
 * Memverifikasi: setiap `await writePlanningAudit(` dalam controller terdaftar
 * didahului oleh pemanggilan `auditValuesFromRows(` dalam jendela konteks
 * tetap (~1500 char), sehingga old_value/new_value tidak berasal dari objek raw acak.
 *
 * Jalankan: npm run verify:planning-audit-snapshots
 */

const fs = require("fs");
const path = require("path");
const { PLANNING_AUDIT_CONTROLLER_FILES } = require("../constants/planningAuditMutationManifest");

const BACKEND_ROOT = path.join(__dirname, "..");
const WINDOW = 1500;

let exitCode = 0;

const controllersDir = path.join(BACKEND_ROOT, "controllers");
if (fs.existsSync(controllersDir)) {
  for (const f of fs.readdirSync(controllersDir)) {
    if (!f.endsWith(".js")) continue;
    const rel = `controllers/${f}`;
    const abs = path.join(controllersDir, f);
    const c = fs.readFileSync(abs, "utf8");
    if (!c.includes("writePlanningAudit")) continue;
    if (!PLANNING_AUDIT_CONTROLLER_FILES.includes(rel)) {
      console.error(
        `${rel} memanggil writePlanningAudit tetapi belum didaftarkan di constants/planningAuditMutationManifest.js`,
      );
      exitCode = 1;
    }
  }
}

for (const rel of PLANNING_AUDIT_CONTROLLER_FILES) {
  const abs = path.join(BACKEND_ROOT, rel);
  if (!fs.existsSync(abs)) {
    console.error(`MISSING FILE: ${rel}`);
    exitCode = 1;
    continue;
  }
  const content = fs.readFileSync(abs, "utf8");
  const re = /await\s+writePlanningAudit\s*\(/g;
  let match;
  while ((match = re.exec(content)) !== null) {
    const pos = match.index;
    const preceding = content.slice(Math.max(0, pos - WINDOW), pos);
    if (!preceding.includes("auditValuesFromRows(")) {
      const line = content.slice(0, pos).split("\n").length;
      console.error(
        `${rel}:${line} — await writePlanningAudit tanpa auditValuesFromRows dalam ${WINDOW} char sebelumnya`,
      );
      exitCode = 1;
    }
  }
}

if (exitCode === 0) {
  console.log(
    `verifyPlanningAuditSnapshots: OK (${PLANNING_AUDIT_CONTROLLER_FILES.length} file, semua await writePlanningAudit berpasangan dengan auditValuesFromRows).`,
  );
}

process.exit(exitCode);
