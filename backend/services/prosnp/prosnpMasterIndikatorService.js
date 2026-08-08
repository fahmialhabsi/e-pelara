'use strict';

/**
 * Admin-only edit kriteria_skor master_indikator (spek 34 §6/§8, koreksi #2) —
 * endpoint yang belum ada sebelumnya (master_indikator hanya diseed). Wajib
 * ada agar daftar_komponen_wajib MBG 2.2 benar-benar configurable tanpa
 * deploy kode baru.
 */
const db = require('../../models');
const { ProsnError, isAdmin } = require('./prosnpWorkflowService');
const { assertRenstraOwnershipAmong } = require('./autofill/renstraOwnershipValidator');

async function updateKriteriaSkor(id, payload, actor) {
  if (!isAdmin(actor)) throw new ProsnError('Hanya Administrator yang dapat mengubah kriteria skor master indikator.', 403, 'PROSNP_FORBIDDEN');
  if (!payload || typeof payload.kriteria_skor !== 'object' || payload.kriteria_skor === null) {
    throw new ProsnError('kriteria_skor wajib berupa objek/array JSON.');
  }
  const master = await db.ProsnMasterIndikator.findByPk(id);
  if (!master) throw new ProsnError('Master indikator tidak ditemukan.', 404, 'PROSNP_NOT_FOUND');
  await master.update({ kriteria_skor: payload.kriteria_skor });
  return master;
}

/**
 * Spesifikasi 35 v3 §27 — daftar opd_penanggung_jawab_id "sah" untuk sebuah
 * master_indikator (bersifat global lintas-tenant/periode, BUKAN per-OPD
 * seperti prosnp_indikator). Dikumpulkan dari data existing (periode yang
 * memakai indikator ini, responsible_opd_id/data_owner_opd_id, dan kontributor
 * D4 spek 34) — TIDAK di-hardcode ke Dinas Pangan (D4).
 */
async function daftarOpdPenanggungJawabSahUntukMasterIndikator(masterIndikatorId, transaction) {
  const indikatorList = await db.ProsnIndikator.findAll({
    where: { master_indikator_id: masterIndikatorId },
    include: [{ model: db.ProsnPeriode, as: 'periode', attributes: ['perangkat_daerah_id'] }],
    attributes: ['id', 'responsible_opd_id', 'data_owner_opd_id'],
    transaction,
  });
  const perangkatDaerahIds = new Set();
  const indikatorIds = [];
  for (const item of indikatorList) {
    indikatorIds.push(item.id);
    if (item.periode?.perangkat_daerah_id) perangkatDaerahIds.add(Number(item.periode.perangkat_daerah_id));
    if (item.responsible_opd_id) perangkatDaerahIds.add(Number(item.responsible_opd_id));
    if (item.data_owner_opd_id) perangkatDaerahIds.add(Number(item.data_owner_opd_id));
  }
  if (indikatorIds.length) {
    const kontributor = await db.ProsnIndikatorKontributor.findAll({ where: { indikator_id: indikatorIds }, attributes: ['opd_id'], transaction });
    kontributor.forEach((k) => { if (k.opd_id) perangkatDaerahIds.add(Number(k.opd_id)); });
  }
  if (!perangkatDaerahIds.size) return [];
  const mapping = await db.PerangkatDaerahOpdMapping.findAll({ where: { perangkat_daerah_id: [...perangkatDaerahIds] }, attributes: ['opd_penanggung_jawab_id'], transaction });
  return [...new Set(mapping.map((m) => Number(m.opd_penanggung_jawab_id)))];
}

/**
 * §27 — endpoint ADMIN `PUT /master-indikator/:id/mapping-renstra`. Ownership
 * divalidasi via `renstraOwnershipValidator` (satu titik kebenaran, dipakai
 * ulang oleh recall §19) dan tercatat via `ActivityLog` existing (bukan
 * subsistem audit baru).
 */
async function setIndikatorRenstraMapping(masterIndikatorId, indikatorRenstraId, actor, tenantId) {
  if (!isAdmin(actor)) throw new ProsnError('Hanya Administrator yang dapat mengubah pemetaan Indikator Renstra.', 403, 'PROSNP_FORBIDDEN');
  return db.sequelize.transaction(async (transaction) => {
    const master = await db.ProsnMasterIndikator.findByPk(masterIndikatorId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!master) throw new ProsnError('Master indikator tidak ditemukan.', 404, 'PROSNP_NOT_FOUND');
    const mappingPrevious = master.indikator_renstra_id;
    const mappingNewRaw = indikatorRenstraId === undefined || indikatorRenstraId === null ? null : Number(indikatorRenstraId);

    if (mappingNewRaw !== null) {
      const indikatorRenstra = await db.IndikatorRenstra.findByPk(mappingNewRaw, { include: [{ association: 'renstra' }], transaction });
      if (!indikatorRenstra || !indikatorRenstra.renstra) throw new ProsnError('Indikator Renstra tidak ditemukan.', 404, 'PROSNP_NOT_FOUND');
      const opdSahList = await daftarOpdPenanggungJawabSahUntukMasterIndikator(masterIndikatorId, transaction);
      assertRenstraOwnershipAmong(indikatorRenstra, opdSahList);
    }

    await master.update({ indikator_renstra_id: mappingNewRaw }, { transaction });
    await db.ActivityLog.create({
      user_id: actor.id,
      action: 'prosnp_set_indikator_renstra_mapping',
      entity_type: 'prosnp_master_indikator',
      entity_id: master.id,
      old_data: { indikator_renstra_id: mappingPrevious },
      new_data: { indikator_renstra_id: mappingNewRaw },
    }, { transaction });

    return { master_indikator: master, mapping_previous: mappingPrevious, mapping_new: mappingNewRaw };
  });
}

module.exports = { updateKriteriaSkor, setIndikatorRenstraMapping };
