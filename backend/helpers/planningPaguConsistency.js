"use strict";

const TOL = 0.02;

/**
 * Validasi: jika total_pagu / pagu_total dan semua tahun terisi, jumlah tahun ≈ total.
 * Mendukung nama kolom pagu_tahun_* (Renstra) atau pagu_year_* (dokumen lain).
 */
function validateMultiYearPaguAgainstTotal(row = {}) {
  const years = [];
  for (let i = 1; i <= 5; i += 1) {
    const v =
      row[`pagu_year_${i}`] ??
      row[`pagu_tahun_${i}`] ??
      null;
    if (v === null || v === undefined || v === "") {
      years.push(null);
    } else {
      const n = Number(v);
      years.push(Number.isFinite(n) ? n : null);
    }
  }
  const totalRaw =
    row.pagu_total != null
      ? row.pagu_total
      : row.total_pagu != null
        ? row.total_pagu
        : null;
  if (totalRaw === null || totalRaw === undefined || totalRaw === "") {
    return { ok: true };
  }
  const total = Number(totalRaw);
  if (!Number.isFinite(total)) return { ok: true };

  const filled = years.filter((x) => x != null);
  if (filled.length === 0) return { ok: true };
  if (filled.length < 5 && filled.length > 0) {
    return { ok: true };
  }
  if (filled.length === 5) {
    const sum = years.reduce((a, b) => a + (b || 0), 0);
    if (Math.abs(sum - total) > TOL) {
      return {
        ok: false,
        message: `total pagu (${total}) tidak sama dengan jumlah pagu multi-tahun (${sum})`,
      };
    }
  }
  return { ok: true };
}

module.exports = { validateMultiYearPaguAgainstTotal };
