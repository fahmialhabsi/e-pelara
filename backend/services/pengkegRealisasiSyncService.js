'use strict';

/**
 * Sync realisasi fisik (%) dari Pengkeg -> IndikatorRenstra (stage sub_kegiatan).
 *
 * Chain: Pengkeg.dpa_id -> Dpa.kode_sub_kegiatan -> RenstraTabelSubkegiatan
 * (match kode_subkegiatan) -> RenstraTabelSubkegiatan.indikator_id -> IndikatorRenstra.id
 * (stage='sub_kegiatan') -> upsert RealisasiIndikatorRenstra {indikator_renstra_id, tahun}.
 *
 * Dipanggil otomatis tiap kali satu baris Pengkeg dibuat/diupdate (bukan sinkron
 * massal per tahun seperti realisasi anggaran Rp, karena di sini relasinya 1:1
 * per baris Pengkeg -> 1 Sub Kegiatan).
 */

const { Pengkeg, Dpa, RenstraTabelSubkegiatan, RealisasiIndikatorRenstra } = require('../models');

async function syncPengkegRealisasiIndikator(pengkegId) {
  const pengkeg = await Pengkeg.findByPk(pengkegId);
  if (
    !pengkeg ||
    !pengkeg.dpa_id ||
    pengkeg.realisasi_fisik === null ||
    pengkeg.realisasi_fisik === undefined
  ) {
    return { synced: false, reason: 'dpa_id atau realisasi_fisik kosong' };
  }

  const dpa = await Dpa.findByPk(pengkeg.dpa_id);
  if (!dpa || !dpa.kode_sub_kegiatan) {
    return { synced: false, reason: 'DPA tidak ditemukan / tidak punya kode_sub_kegiatan' };
  }

  const subKegiatan = await RenstraTabelSubkegiatan.findOne({
    where: { kode_subkegiatan: dpa.kode_sub_kegiatan },
  });
  if (!subKegiatan || !subKegiatan.indikator_id) {
    return { synced: false, reason: 'Sub Kegiatan Renstra / indikator_id tidak ditemukan' };
  }

  const [row] = await RealisasiIndikatorRenstra.findOrCreate({
    where: { indikator_renstra_id: subKegiatan.indikator_id, tahun: String(pengkeg.tahun) },
    defaults: { nilai_realisasi: pengkeg.realisasi_fisik },
  });
  await row.update({ nilai_realisasi: pengkeg.realisasi_fisik });

  return {
    synced: true,
    indikator_renstra_id: subKegiatan.indikator_id,
    tahun: String(pengkeg.tahun),
  };
}

module.exports = { syncPengkegRealisasiIndikator };
