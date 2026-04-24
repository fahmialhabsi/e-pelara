"use strict";

const util = require("util");

const MAX_DEPTH = 8;
const MAX_LEN = 1200;

/**
 * Beberapa baris stack (tanpa baris judul error generik) untuk fallback saat pesan kosong / hanya "AggregateError".
 */
function stackSnippet(e) {
  const st = e && typeof e.stack === "string" ? e.stack : "";
  if (!st) return "";
  const lines = st
    .split("\n")
    .map((l) => l.trim())
    .filter(
      (l) =>
        l &&
        !/^aggregateerror:?$/i.test(l) &&
        !/^error:\s*aggregateerror$/i.test(l) &&
        !/^error:?$/i.test(l),
    );
  return lines.slice(0, 8).join(" | ");
}

/**
 * Ubah Error / Sequelize / MySQL2 / AggregateError menjadi string untuk response API & log.
 * @param {unknown} e
 * @param {number} [depth]
 */
function nodeErrorMessage(e, depth = 0) {
  if (!e) return "";
  if (depth > MAX_DEPTH) return "(error nested terlalu dalam)";

  /** Sequelize sering membungkus mysql2; `e.message` kadang hanya "AggregateError" sementara detail di `parent`. */
  if (e && typeof e === "object") {
    const sn = String(e.name || "");
    if (
      sn.startsWith("SequelizeConnection") ||
      sn === "SequelizeHostNotFoundError" ||
      sn === "SequelizeAccessDeniedError"
    ) {
      const parent = e.parent || e.original;
      const fromParent = parent && String(parent.message || parent.code || "").trim();
      const ownMsg = String(e.message || "").trim();
      const readable =
        (fromParent && fromParent !== "AggregateError" && fromParent) ||
        (ownMsg && ownMsg !== "AggregateError" && ownMsg) ||
        "";
      if (readable) return `${sn}: ${readable}`.slice(0, MAX_LEN);
      if (sn.includes("Refused")) {
        return (
          `${sn}: tidak dapat menyambung ke server basis data. ` +
          `Pastikan layanan MySQL/MariaDB berjalan, lalu periksa DB_HOST, DB_PORT, DB_USER, DB_NAME, dan DB_PASSWORD ` +
          `(variabel .env atau backend/config/config.json).`
        ).slice(0, MAX_LEN);
      }
      return `${sn}: periksa koneksi dan kredensial basis data.`.slice(0, MAX_LEN);
    }
  }

  if (typeof e === "string") {
    const t = e.trim();
    if (!t) return "";
    if (t === "AggregateError") {
      return "AggregateError (tanpa detail teks; periksa koneksi DB atau log server).";
    }
    return t;
  }

  if (e.name === "AggregateError") {
    if (Array.isArray(e.errors) && e.errors.length > 0) {
      const parts = e.errors.map((sub) => nodeErrorMessage(sub, depth + 1)).filter(Boolean);
      if (parts.length) return parts.join(" | ").slice(0, MAX_LEN);
    }
    try {
      const ins = util
        .inspect(e, { depth: 6, maxArrayLength: 20, breakLength: 120 })
        .slice(0, MAX_LEN);
      if (ins && ins !== "AggregateError {}" && ins.length > 18) return ins;
    } catch {
      /* ignore */
    }
  }

  const sql =
    e.parent?.sqlMessage ||
    e.original?.sqlMessage ||
    e.sqlMessage ||
    (e.parent && String(e.parent).trim());
  if (sql) return String(sql).trim().slice(0, MAX_LEN);

  if (Array.isArray(e.errors) && e.errors.length > 0) {
    const parts = e.errors
      .map((er) => (typeof er === "string" ? er : nodeErrorMessage(er, depth + 1) || er?.message))
      .filter(Boolean);
    if (parts.length) return parts.join("; ").slice(0, MAX_LEN);
  }

  const msg = String(e.message || "").trim();
  if (msg && msg !== "AggregateError") return msg.slice(0, MAX_LEN);

  if (e.cause != null) {
    const c = nodeErrorMessage(e.cause, depth + 1);
    if (c) return c.slice(0, MAX_LEN);
  }

  if (e.code) {
    const codeLine = [e.code, e.errno, e.syscall, e.address, e.port, e.path]
      .filter((x) => x != null && String(x).trim() !== "")
      .join(" ");
    if (codeLine) return codeLine.slice(0, MAX_LEN);
  }

  try {
    const s = JSON.stringify(e);
    if (s && s !== "{}") return s.slice(0, MAX_LEN);
  } catch {
    /* ignore */
  }

  const snap = stackSnippet(e);
  if (snap) return snap.slice(0, MAX_LEN);

  if (e.name === "AggregateError" || msg === "AggregateError") {
    try {
      const ins = util.inspect(e, { depth: 5, maxArrayLength: 10, breakLength: 100 }).slice(0, MAX_LEN);
      if (ins && ins !== "{}") return ins;
    } catch {
      /* ignore */
    }
    return "AggregateError: detail tidak tersedia (biasanya koneksi database / pool; lihat log server).";
  }

  const asStr = String(e);
  if (asStr && asStr !== "AggregateError") return asStr.slice(0, MAX_LEN);

  try {
    return util.inspect(e, { depth: 4, maxArrayLength: 8 }).slice(0, MAX_LEN);
  } catch {
    return "Kesalahan tidak terbaca (periksa log server).";
  }
}

function nodeErrorMessageSafe(e) {
  const out = nodeErrorMessage(e);
  if (out && out !== "AggregateError") return out;
  return out ? `${out} (periksa log server / koneksi DB)` : "Kesalahan tidak terbaca (periksa log server).";
}

module.exports = { nodeErrorMessage, nodeErrorMessageSafe };
