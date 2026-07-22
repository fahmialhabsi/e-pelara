'use strict';

/**
 * Auto-generate baris `lakip` (BAB II — Akuntabilitas Program & Kegiatan)
 * langsung dari Renstra + realisasi yang sudah mengalir dari
 * RealisasiKinerjaTerpadu (level Kegiatan) — tidak bergantung pada proses
 * generate dokumen Renja (beda dengan lakipBridgeService.js) dan tidak
 * bergantung pada renstra_tabel_subkegiatan (yang masih kosong).
 *
 * Grain: 1 baris per Kegiatan (stage='kegiatan' di IndikatorRenstra, ref_id
 * langsung = RenstraKegiatan.id), sesuai judul BAB II yang memang level
 * Program & Kegiatan, bukan Sub Kegiatan.
 */

const { sequelize, Lakip, IndikatorRenstra, RealisasiIndikatorRenstra } = require('../models');
const { pilihTargetTahun } = require('./lakipBridgeService');

async function generateLakipDariRenstraTahun(tahun) {
  const [[renstraAktif]] = await sequelize.query(
    `SELECT id, tahun_mulai FROM renstra_opd WHERE is_aktif = 1 LIMIT 1`,
  );
  if (!renstraAktif) {
    return { updated: 0, skipped: 0, message: 'Tidak ada Renstra OPD aktif.' };
  }

  const [[periode]] = await sequelize.query(
    `SELECT id FROM periode_rpjmds WHERE :tahun BETWEEN tahun_awal AND tahun_akhir LIMIT 1`,
    { replacements: { tahun } },
  );
  const periodeId = periode?.id || 1;

  const [kegiatanRows] = await sequelize.query(
    `SELECT id, program_id, nama_kegiatan FROM renstra_kegiatan WHERE renstra_id = :renstraId`,
    { replacements: { renstraId: renstraAktif.id } },
  );
  const [programRows] = await sequelize.query(
    `SELECT id, nama_program FROM renstra_program WHERE renstra_id = :renstraId`,
    { replacements: { renstraId: renstraAktif.id } },
  );
  const kegiatanById = new Map(kegiatanRows.map((k) => [k.id, k]));
  const programById = new Map(programRows.map((p) => [p.id, p]));

  const indikatorRows = await IndikatorRenstra.findAll({
    where: { renstra_id: renstraAktif.id, stage: 'kegiatan' },
  });

  let updated = 0;
  let skipped = 0;

  for (const ir of indikatorRows) {
    const kegiatan = kegiatanById.get(ir.ref_id);
    const program = kegiatan ? programById.get(kegiatan.program_id) : null;
    const key = String(ir.nama_indikator || '').trim();

    if (!kegiatan || !key) {
      skipped++;
      continue;
    }

    const target = pilihTargetTahun(ir, tahun, renstraAktif.tahun_mulai);

    const realisasiRow = await RealisasiIndikatorRenstra.findOne({
      where: { indikator_renstra_id: ir.id, tahun: String(tahun) },
    });

    const existing = await Lakip.findOne({
      where: { tahun: String(tahun), indikator_kinerja: key, renstra_id: renstraAktif.id },
    });

    const payload = {
      tahun: String(tahun),
      periode_id: periodeId,
      program: program?.nama_program || null,
      kegiatan: kegiatan.nama_kegiatan,
      indikator_kinerja: key,
      target,
      realisasi: realisasiRow ? realisasiRow.nilai_realisasi : (existing?.realisasi ?? null),
      renstra_id: renstraAktif.id,
      jenis_dokumen: 'LAKIP',
    };

    if (existing) {
      await existing.update(payload);
    } else {
      await Lakip.create(payload);
    }
    updated++;
  }

  return { updated, skipped, total: indikatorRows.length, tahun: String(tahun) };
}

module.exports = { generateLakipDariRenstraTahun };
