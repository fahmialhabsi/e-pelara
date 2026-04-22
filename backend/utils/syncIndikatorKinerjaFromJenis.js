"use strict";

/**
 * Samakan `jenis` ↔ `indikator_kinerja` pada objek payload (mutasi in-place).
 * Template Excel sering mengisi salah satu saja; hook/model mengharapkan keduanya konsisten.
 *
 * @param {object|null|undefined} item
 */
function syncIndikatorKinerjaFromJenis(item) {
  if (item == null || typeof item !== "object") return;

  const jenisStr =
    item.jenis != null && String(item.jenis).trim() !== ""
      ? String(item.jenis).trim()
      : "";
  const ikStr =
    item.indikator_kinerja != null &&
    String(item.indikator_kinerja).trim() !== ""
      ? String(item.indikator_kinerja).trim()
      : "";

  if (!jenisStr && ikStr) {
    item.jenis = ikStr;
  } else if (jenisStr && !ikStr) {
    item.indikator_kinerja = jenisStr;
  }
}

module.exports = { syncIndikatorKinerjaFromJenis };
