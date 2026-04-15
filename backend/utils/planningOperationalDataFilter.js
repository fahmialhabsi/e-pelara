"use strict";

/**
 * Memisahkan baris uji vs operasional:
 * 1) Kolom DB `is_test === true` (disarankan untuk data smoke).
 * 2) Heuristik judul/kode (fallback, selaras skrip smoke-planning-api-temp.js).
 *
 * Query ?include_test=1 pada referensi mengembalikan SEMUA baris (debug).
 */

function isDbTestRow(row) {
  return row && row.is_test === true;
}

function isLikelySmokeTestPerangkatDaerah(row) {
  if (!row) return false;
  if (isDbTestRow(row)) return true;
  const nama = String(row.nama ?? "").trim();
  const kode = String(row.kode ?? "")
    .trim()
    .toUpperCase();
  if (kode === "SMOKE") return true;
  if (/smoke\s*test/i.test(nama)) return true;
  if (/^smoke\s*-/i.test(nama)) return true;
  return false;
}

function isLikelySmokeTestDokumenJudul(judul) {
  const j = String(judul ?? "").trim();
  if (!j) return false;
  if (/\(api test\)/i.test(j)) return true;
  if (/^smoke[\s_-]/i.test(j)) return true;
  if (/smoke\s*rkpd/i.test(j)) return true;
  if (/smoke\s*renstra/i.test(j)) return true;
  return false;
}

function filterPerangkatDaerah(rows, { includeTest }) {
  if (includeTest) return rows;
  return (rows || []).filter((r) => !isLikelySmokeTestPerangkatDaerah(r));
}

function filterDokumenByJudul(rows, { includeTest }) {
  if (includeTest) return rows;
  return (rows || []).filter((r) => {
    if (isDbTestRow(r)) return false;
    return !isLikelySmokeTestDokumenJudul(r.judul);
  });
}

/**
 * @param {{ rkpdDokumen?: object[], renstraPdDokumen?: object[], perangkatDaerah?: object[] }} data
 * @param {{ includeTest?: boolean }} opts
 */
function filterReferensiBuatDokumenRenja(data, opts = {}) {
  const includeTest = !!opts.includeTest;
  return {
    rkpdDokumen: filterDokumenByJudul(data.rkpdDokumen, { includeTest }),
    renstraPdDokumen: filterDokumenByJudul(data.renstraPdDokumen, { includeTest }),
    perangkatDaerah: filterPerangkatDaerah(data.perangkatDaerah, { includeTest }),
  };
}

module.exports = {
  isLikelySmokeTestPerangkatDaerah,
  isLikelySmokeTestDokumenJudul,
  filterReferensiBuatDokumenRenja,
};
