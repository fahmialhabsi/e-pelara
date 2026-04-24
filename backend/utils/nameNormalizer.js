"use strict";

const DEFAULT_STOPWORDS = new Set([
  "dan",
  "yang",
  "untuk",
  "dengan",
  "serta",
  "pada",
  "dari",
  "ke",
  "di",
  "atau",
  "bidang",
  "urusan",
  "kegiatan",
  "program",
  "sub",
]);

function normalizeName(value, opts = {}) {
  const stopwords = opts.stopwords || DEFAULT_STOPWORDS;
  const raw = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!raw) return "";

  const tokens = raw
    .split(" ")
    .map((x) => x.trim())
    .filter(Boolean)
    .filter((x) => !stopwords.has(x));

  return tokens.join(" ").trim();
}

function normalizeCode(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .toLowerCase();
}

module.exports = {
  normalizeName,
  normalizeCode,
  DEFAULT_STOPWORDS,
};

