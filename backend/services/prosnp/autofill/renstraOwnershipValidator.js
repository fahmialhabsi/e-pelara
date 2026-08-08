'use strict';

/**
 * Spesifikasi 35 v3 §19 (Koreksi Wajib #2) + §26 — satu titik kebenaran
 * validasi ownership Renstra, dipakai BERSAMA oleh `renstraIndicatorRecallAdapter.js`
 * (saat recall, satu opd_penanggung_jawab_id dari resolveOpdScope()) dan
 * `prosnpMasterIndikatorService.setIndikatorRenstraMapping` (saat admin
 * menyimpan mapping, daftar opd_penanggung_jawab_id "sah" krn master_indikator
 * bersifat global lintas-periode/OPD, §27).
 *
 * `RenstraOPD.opd_id` ber-`belongsTo` `OpdPenanggungJawab` — RUANG ID YANG SAMA
 * dgn `Dpa.opd_id`/hasil `resolveOpdScope()` (dibuktikan read-only, §13/§19).
 * TIDAK ADA bridge kedua di sini — perbandingan langsung.
 */
const { ProsnError } = require('../prosnpWorkflowService');

function isOwnedBy(indikatorRenstra, opdPenanggungJawabId) {
  const renstraOpdId = indikatorRenstra?.renstra?.opd_id;
  if (renstraOpdId === null || renstraOpdId === undefined) return false;
  return Number(renstraOpdId) === Number(opdPenanggungJawabId);
}

/** Dipakai renstraIndicatorRecallAdapter (§19) — konteks satu OPD periode aktif. */
function assertRenstraOwnership(indikatorRenstra, opdPenanggungJawabId) {
  if (!isOwnedBy(indikatorRenstra, opdPenanggungJawabId)) {
    throw new ProsnError(
      'Indikator Renstra yang dipetakan berasal dari OPD yang berbeda dari konteks ProSN aktif.',
      422,
      'INDICATOR_MAPPING_OPD_MISMATCH',
    );
  }
}

/** Dipakai endpoint ADMIN mapping (§27) — konteks daftar OPD "sah" lintas-periode. */
function assertRenstraOwnershipAmong(indikatorRenstra, opdPenanggungJawabIds) {
  const cocok = (opdPenanggungJawabIds || []).some((id) => isOwnedBy(indikatorRenstra, id));
  if (!cocok) {
    throw new ProsnError(
      'Indikator Renstra yang dipilih berasal dari OPD yang tidak tercatat sebagai penanggung jawab/kontributor indikator ProSN ini.',
      422,
      'INDICATOR_MAPPING_OPD_MISMATCH',
    );
  }
}

module.exports = { isOwnedBy, assertRenstraOwnership, assertRenstraOwnershipAmong };
