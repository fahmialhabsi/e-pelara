'use strict';

/**
 * Spesifikasi 35 v3 §12/§14 — wrapper tipis atas whitelist nomenklatur ProSN
 * existing (`ProsnNomenklaturMapping`, `DEFAULT_STATUSES` di-reuse langsung
 * dari `prosnpDpaSourceService.js` yang SUDAH mengekspornya — tidak menulis
 * ulang daftar status). TIDAK mengubah `prosnpDpaSourceService.js`.
 */
const db = require('../../../../models');
const { DEFAULT_STATUSES } = require('../../prosnpDpaSourceService');

/**
 * Cari kandidat kode_sub_kegiatan whitelist yang benar-benar punya data DPA
 * pada tahun+OPD yang diminta. HIGH bila tepat 1 kandidat, MEDIUM bila >1
 * (ambigu, user pilih manual), NONE bila tidak ada sama sekali.
 */
async function resolveNomenclature(masterIndikatorId, tahun, opdPenanggungJawabId, { includeContextOnly = false } = {}) {
  const statuses = includeContextOnly ? [...DEFAULT_STATUSES, 'context_only'] : DEFAULT_STATUSES;
  const mapping = await db.ProsnNomenklaturMapping.findAll({ where: { master_indikator_id: masterIndikatorId, status_relevansi: statuses, is_active: true }, raw: true });
  const kodeList = mapping.map((m) => m.kode_sub_kegiatan);
  if (!kodeList.length) return { candidates: [], confidence: 'NONE' };

  const dpaRows = await db.Dpa.findAll({
    where: { kode_sub_kegiatan: kodeList, tahun: String(tahun), opd_id: opdPenanggungJawabId },
    attributes: ['id', 'kode_sub_kegiatan', 'sub_kegiatan', 'kode_program', 'program', 'kode_kegiatan', 'kegiatan', 'anggaran'],
    raw: true,
  });
  const confidence = dpaRows.length === 1 ? 'HIGH' : dpaRows.length > 1 ? 'MEDIUM' : 'NONE';
  return { candidates: dpaRows, confidence };
}

module.exports = { resolveNomenclature };
