/**
 * Job terjadwal: POST /api/v1/app-policy/compliance-snapshot/record (Bearer JWT admin).
 *
 *   cd backend && node scripts/recordComplianceSnapshotJob.js
 *
 * Token (salah satu):
 *   EPELARA_COMPLIANCE_RECORD_JWT — JWT admin (tanpa awalan Bearer)
 *   EPELARA_COMPLIANCE_RECORD_JWT_FILE — path file, satu baris JWT
 *   EPELARA_COMPLIANCE_RECORD_LOGIN_EMAIL + EPELARA_COMPLIANCE_RECORD_LOGIN_PASSWORD —
 *     login HTTP ke /api/auth/login (user harus SUPER_ADMIN atau ADMINISTRATOR)
 *
 * Lainnya:
 *   EPELARA_COMPLIANCE_RECORD_BASE_URL — default http://127.0.0.1:${PORT||3000}
 */
"use strict";

const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", ".env");
const envLocalPath = path.join(__dirname, "..", ".env.local");

require("dotenv").config({ path: envPath });
require("dotenv").config({ path: envLocalPath, override: true });

const ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMINISTRATOR"]);

/** Selaras dengan middleware allowRoles: spasi → underscore, uppercase. */
function normalizeRoleName(role) {
  return String(role || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

function formatNetworkError(err) {
  const parts = [err?.message || String(err)];
  const c = err?.cause;
  if (c) {
    if (c.code) parts.push(`code=${c.code}`);
    if (c.message && c.message !== err.message) parts.push(c.message);
    if (c.errno != null) parts.push(`errno=${c.errno}`);
  }
  return parts.join(" | ");
}

function resolveJwtFromEnvOrFile() {
  const fromEnv = String(
    process.env.EPELARA_COMPLIANCE_RECORD_JWT ||
      process.env.EPELARA_COMPLIANCE_RECORD_TOKEN ||
      "",
  ).trim();
  if (fromEnv) return fromEnv.replace(/^Bearer\s+/i, "");

  const filePath = String(
    process.env.EPELARA_COMPLIANCE_RECORD_JWT_FILE || "",
  ).trim();
  if (!filePath) return "";

  try {
    const abs = path.isAbsolute(filePath)
      ? filePath
      : path.join(__dirname, "..", filePath);
    const raw = fs.readFileSync(abs, "utf8");
    const line = raw
      .split(/\r?\n/)
      .find((l) => l.trim() && !l.trim().startsWith("#"));
    return line ? line.trim().replace(/^Bearer\s+/i, "") : "";
  } catch (e) {
    console.error(
      "[recordComplianceSnapshotJob] Cannot read EPELARA_COMPLIANCE_RECORD_JWT_FILE:",
      e.message || e,
    );
    return "";
  }
}

function getBaseUrl() {
  const baseRaw =
    process.env.EPELARA_COMPLIANCE_RECORD_BASE_URL ||
    `http://127.0.0.1:${process.env.PORT || 3000}`;
  return String(baseRaw).replace(/\/+$/, "");
}

async function fetchTokenViaLogin(base) {
  const email = String(
    process.env.EPELARA_COMPLIANCE_RECORD_LOGIN_EMAIL || "",
  ).trim();
  const password = String(
    process.env.EPELARA_COMPLIANCE_RECORD_LOGIN_PASSWORD || "",
  ).trim();
  if (!email || !password) return "";

  const loginUrl = `${base}/api/auth/login`;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 15000);
  let res;
  try {
    res = await fetch(loginUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
      signal: ac.signal,
    });
  } catch (e) {
    console.error(
      "[recordComplianceSnapshotJob] login request failed:",
      formatNetworkError(e),
    );
    console.error("  URL:", loginUrl);
    return "";
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }

  if (!res.ok) {
    console.error(
      "[recordComplianceSnapshotJob] login failed:",
      res.status,
      body.message || body,
    );
    return "";
  }

  const role = normalizeRoleName(body.user?.role);
  if (!ADMIN_ROLES.has(role)) {
    console.error(
      "[recordComplianceSnapshotJob] login OK but role is not admin:",
      body.user?.role,
      "→",
      role,
      "(need SUPER_ADMIN or ADMINISTRATOR)",
    );
    return "";
  }

  const tok = String(body.token || "").trim();
  if (!tok) {
    console.error("[recordComplianceSnapshotJob] login response missing token.");
    return "";
  }
  return tok;
}

async function resolveToken(base) {
  const fromFile = resolveJwtFromEnvOrFile();
  if (fromFile) return fromFile;
  return fetchTokenViaLogin(base);
}

function printMissingTokenHelp(base) {
  const hasJwtFileVar = !!String(
    process.env.EPELARA_COMPLIANCE_RECORD_JWT_FILE || "",
  ).trim();
  const jwtFileHint = hasJwtFileVar
    ? "\n  (EPELARA_COMPLIANCE_RECORD_JWT_FILE di-set tapi file tidak terbaca / kosong — cek path relatif ke folder backend.)"
    : "";

  console.error(
    "[recordComplianceSnapshotJob] Token admin belum tersedia.",
    "\n\n  Pilih salah satu di backend/.env atau backend/.env.local (jangan commit):",
    "\n\n  A) JWT langsung:",
    "\n     EPELARA_COMPLIANCE_RECORD_JWT=<salin dari respons login, field token>",
    "\n\n  B) File satu baris:",
    "\n     EPELARA_COMPLIANCE_RECORD_JWT_FILE=.secrets/compliance-record.jwt",
    "\n\n  C) Login otomatis (user khusus job, role admin):",
    "\n     EPELARA_COMPLIANCE_RECORD_LOGIN_EMAIL=...",
    "\n     EPELARA_COMPLIANCE_RECORD_LOGIN_PASSWORD=...",
    jwtFileHint,
    "\n\n  Pastikan backend jalan di:",
    `     ${base}`,
    "\n  File .env utama:",
    `     ${envPath}`,
  );
}

async function main() {
  const base = getBaseUrl();
  const url = `${base}/api/v1/app-policy/compliance-snapshot/record`;

  const token = await resolveToken(base);
  if (!token) {
    printMissingTokenHelp(base);
    process.exit(1);
  }

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 30000);

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: ac.signal,
    });
  } catch (e) {
    console.error(
      "[recordComplianceSnapshotJob] request failed:",
      formatNetworkError(e),
    );
    console.error("  URL:", url);
    console.error(
      "  Cek: terminal lain menjalankan `npm run dev` di folder backend; PORT di .env sama dengan URL di atas.",
    );
    process.exit(1);
  } finally {
    clearTimeout(t);
  }

  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }

  if (!res.ok) {
    console.error("[recordComplianceSnapshotJob]", res.status, body);
    process.exit(1);
  }

  console.log(
    "[recordComplianceSnapshotJob] OK",
    res.status,
    body.message || "",
    body.data?.generatedAt ? `generatedAt=${body.data.generatedAt}` : "",
  );
  process.exit(0);
}

main();
