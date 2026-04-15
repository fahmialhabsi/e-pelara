/**
 * Panggil handler audit tanpa HTTP (tanpa JWT) untuk memverifikasi tidak ada error SQL kolom.
 *   node scripts/invokeAuditPerencanaanConsistency.js
 */
"use strict";

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const ctrl = require("../controllers/auditPerencanaanController");

const req = {};
const res = {
  statusCode: 200,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    const code = this.statusCode;
    if (code >= 400) {
      console.error("FAIL", code, payload);
      process.exit(1);
    }
    console.log("OK", code, "success=", payload.success, "issues=", payload.data?.issue_count);
    process.exit(0);
  },
};

ctrl.getPerencanaanConsistency(req, res).catch((e) => {
  console.error(e);
  process.exit(1);
});
