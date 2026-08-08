'use strict';

/**
 * Spesifikasi 35 v3 §20 — wrapper tipis `prosnpDpaSourceService.ambilSnapshot`
 * existing, TIDAK SATU BARIS pun kode aslinya diubah.
 */
const dpaSourceService = require('../../prosnpDpaSourceService');

async function recall({ masterIndikatorId, tahun, opdPenanggungJawabId, kodeSubKegiatan }) {
  try {
    const snapshot = await dpaSourceService.ambilSnapshot(masterIndikatorId, tahun, opdPenanggungJawabId, kodeSubKegiatan);
    return {
      value: snapshot.source_pagu_dpa,
      source_type: 'DPA_RECALL',
      source_reference: { dpa_id: snapshot.source_dpa_id, kode_sub_kegiatan: kodeSubKegiatan },
      confidence: 'HIGH',
      requires_review: false,
      detail: snapshot,
    };
  } catch (error) {
    if (error.code === 'PROSNP_DPA_SOURCE_NOT_FOUND' || error.code === 'PROSNP_DPA_SOURCE_NOT_WHITELISTED') {
      return { value: null, source_type: 'NOT_FOUND', code: 'DPA_NOT_FOUND', confidence: 'NONE', requires_review: true, detail: null };
    }
    throw error;
  }
}

module.exports = { recall };
