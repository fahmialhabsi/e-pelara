'use strict';

/**
 * Spesifikasi 35 v3 §19 — Target/Realisasi Indicator Resolution (Koreksi
 * Wajib #2, P0 OPD Ownership Validation). Deterministic-mapping-only: TIDAK
 * ADA name-matching/heuristik pencarian indikator Renstra — HANYA via FK
 * `prosnp_master_indikator.indikator_renstra_id` yang dikurasi Admin (§27).
 *
 * Resolusi tahun->kolom `target_tahun_N` REUSE FORMULA `pilihTargetTahun()`
 * (`backend/services/lakipBridgeService.js:14-18`, `offset = tahunTarget -
 * tahunAwalRenstra + 1`) TANPA reuse fungsinya (fungsi itu meng-CLAMP offset
 * di luar [1,6] ke kolom terdekat — tidak cocok dgn kontrak
 * `RENSTRA_YEAR_OUT_OF_RANGE` §19 langkah 6 di sini).
 */
const db = require('../../../../models');
const { assertRenstraOwnership } = require('../renstraOwnershipValidator');
const { ProsnError } = require('../../prosnpWorkflowService');

const notFound = (code) => ({ value: null, source_type: 'NOT_FOUND', code, confidence: 'NONE', requires_review: true });

/** §19 langkah 6 — HANYA formula, bukan pemanggilan `pilihTargetTahun()` apa adanya (lihat catatan di atas). */
async function resolveTahunAwalRenstra(renstra, transaction) {
  if (renstra.rpjmd_id) {
    const periodeRpjmd = await db.PeriodeRpjmd.findByPk(renstra.rpjmd_id, { transaction });
    if (periodeRpjmd?.tahun_awal) return Number(periodeRpjmd.tahun_awal);
  }
  if (renstra.tahun_akhir) return Number(renstra.tahun_akhir) - 5; // fallback: periode Renstra selalu 6 tahun (target_tahun_1..6)
  return null;
}

async function recall({ masterIndikatorId, tahun, opdPenanggungJawabId, transaction }) {
  // Langkah 1
  const master = await db.ProsnMasterIndikator.findByPk(masterIndikatorId, { transaction });
  // Langkah 2
  if (!master?.indikator_renstra_id) {
    return { target: notFound('INDICATOR_MAPPING_NOT_FOUND'), realisasi: notFound('INDICATOR_MAPPING_NOT_FOUND') };
  }

  // Langkah 3
  const indikator = await db.IndikatorRenstra.findByPk(master.indikator_renstra_id, { include: [{ association: 'renstra' }], transaction });
  // Langkah 4
  if (!indikator || !indikator.renstra) {
    return { target: notFound('INDICATOR_MAPPING_NOT_FOUND'), realisasi: notFound('INDICATOR_MAPPING_NOT_FOUND') };
  }

  // Langkah 5 — OWNERSHIP VALIDATION (P0, WAJIB)
  try {
    assertRenstraOwnership(indikator, opdPenanggungJawabId);
  } catch (error) {
    if (error instanceof ProsnError && error.code === 'INDICATOR_MAPPING_OPD_MISMATCH') {
      return { target: notFound('INDICATOR_MAPPING_OPD_MISMATCH'), realisasi: notFound('INDICATOR_MAPPING_OPD_MISMATCH') };
    }
    throw error;
  }

  // Langkah 6 — resolusi tahun -> kolom target_tahun_N, dgn boundary check (TIDAK clamp)
  const tahunAwalRenstra = await resolveTahunAwalRenstra(indikator.renstra, transaction);
  let target;
  if (tahunAwalRenstra === null) {
    target = notFound('INDICATOR_VALUE_NOT_FOUND');
  } else {
    const offset = Number(tahun) - tahunAwalRenstra + 1;
    if (offset < 1 || offset > 6) {
      target = notFound('RENSTRA_YEAR_OUT_OF_RANGE');
    } else {
      const kolomTarget = `target_tahun_${offset}`;
      const targetValue = indikator[kolomTarget];
      target = (targetValue === null || targetValue === undefined)
        ? notFound('INDICATOR_VALUE_NOT_FOUND')
        : { value: Number(targetValue), source_type: 'INDIKATOR_RENSTRA_RECALL', source_reference: { indikator_renstra_id: indikator.id, kolom: kolomTarget }, confidence: 'HIGH', requires_review: false };
    }
  }

  // Langkah 8-9 — realisasi (keyed langsung oleh tahun STRING, tidak terpengaruh boundary offset di atas)
  const realisasiRow = await db.RealisasiIndikatorRenstra.findOne({ where: { indikator_renstra_id: indikator.id, tahun: String(tahun) }, transaction });
  const realisasi = (realisasiRow?.nilai_realisasi === null || realisasiRow?.nilai_realisasi === undefined)
    ? notFound('INDICATOR_VALUE_NOT_FOUND')
    : { value: Number(realisasiRow.nilai_realisasi), source_type: 'RENSTRA_RECALL', source_reference: { indikator_renstra_id: indikator.id }, confidence: 'HIGH', requires_review: false };

  return { target, realisasi };
}

module.exports = { recall, resolveTahunAwalRenstra };
