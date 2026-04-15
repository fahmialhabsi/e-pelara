"use strict";

/**
 * Cek minimal: kolom change tracking ada di renja_item / rkpd_item.
 * Dipakai sebelum query berat agar error DB lebih jelas (bukan "Unknown column").
 */
async function ensureChangeTrackingColumnsReady(sequelize) {
  const qi = sequelize.getQueryInterface();
  const renja = await qi.describeTable("renja_item").catch(() => null);
  const rkpd = await qi.describeTable("rkpd_item").catch(() => null);
  if (!renja || !rkpd) {
    return {
      ok: false,
      code: "SCHEMA_NOT_READY",
      message: "Tabel renja_item atau rkpd_item tidak ditemukan.",
      hint: "Pastikan migrasi perencanaan sudah dijalankan: npx sequelize-cli db:migrate",
    };
  }
  const needRenja = ["change_state", "current_renja_item_version_id", "pagu_source", "pagu_line_version_id"];
  const needRkpd = ["change_state", "current_rkpd_item_version_id", "pagu_source", "pagu_line_version_id"];
  const miss = [];
  for (const c of needRenja) {
    if (!renja[c]) miss.push(`renja_item.${c}`);
  }
  for (const c of needRkpd) {
    if (!rkpd[c]) miss.push(`rkpd_item.${c}`);
  }
  if (miss.length) {
    return {
      ok: false,
      code: "SCHEMA_NOT_READY",
      message: `Kolom change tracking belum ada: ${miss.join(", ")}.`,
      hint:
        "Jalankan migrasi: npx sequelize-cli db:migrate — minimal file 20260415110000-production-change-tracking-v2.js. Verifikasi: npm run verify:planning-schema",
    };
  }
  return { ok: true };
}

module.exports = {
  ensureChangeTrackingColumnsReady,
};
