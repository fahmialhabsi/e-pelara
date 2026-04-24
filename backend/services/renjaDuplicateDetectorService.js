"use strict";

function normalizeKey(v) {
  return String(v == null ? "" : v).trim().toLowerCase();
}

function buildBusinessKey(item) {
  return [
    item.program_id || "",
    item.kegiatan_id || "",
    item.sub_kegiatan_id || "",
    normalizeKey(item.indikator),
    normalizeKey(item.lokasi),
  ].join("|");
}

function detectDuplicateItems(items = []) {
  const seen = new Map();
  const duplicates = [];

  for (const item of items) {
    const key = buildBusinessKey(item);
    if (!key.replace(/\|/g, "")) continue;
    if (!seen.has(key)) {
      seen.set(key, [item]);
      continue;
    }
    const arr = seen.get(key);
    arr.push(item);
    seen.set(key, arr);
  }

  for (const [key, rows] of seen.entries()) {
    if (rows.length <= 1) continue;
    for (const row of rows) {
      duplicates.push({
        key,
        item: row,
        count: rows.length,
      });
    }
  }

  return duplicates;
}

module.exports = {
  detectDuplicateItems,
  buildBusinessKey,
};
