'use strict';

/**
 * Recall RenstraOPD dari sumber RPJMD (Kegiatan/SubKegiatan).
 *
 * RenstraProgram/RenstraKegiatan/RenstraSubkegiatan dibuat manual satu-satu
 * lewat form "Tambah ..." (lihat renstra_subkegiatanController.js `update`,
 * yang selalu menyalin ulang kode_sub_kegiatan/nama_sub_kegiatan dari
 * SubKegiatan RPJMD terkait tiap kali baris disimpan). Tidak ada mekanisme
 * bulk-clone RPJMD->Renstra yang sudah ada, jadi recall ini menerapkan pola
 * yang sama (selalu sinkron kode/nama dari sumber; field OPD hanya diisi
 * kalau kosong) secara massal untuk seluruh baris RenstraOPD sekaligus,
 * alih-alih mewajibkan user membuka & menyimpan ulang tiap baris manual.
 */

const { Op } = require('sequelize');

function kosong(v) {
  return v == null || String(v).trim() === '';
}

async function recallRenstraOpd(db, renstraOpdId) {
  const { RenstraOPD, RenstraProgram, RenstraKegiatan, RenstraSubkegiatan, Kegiatan, SubKegiatan } =
    db;

  const renstraOpd = await RenstraOPD.findByPk(renstraOpdId);
  if (!renstraOpd) throw new Error('RenstraOPD tidak ditemukan.');

  const programs = await RenstraProgram.findAll({
    where: { renstra_id: renstraOpdId },
    attributes: ['id'],
  });
  const programIds = programs.map((p) => p.id);

  const laporan = { kegiatan: { diperiksa: 0, disegarkan: 0 }, sub_kegiatan: { diperiksa: 0, disegarkan: 0 } };

  if (programIds.length) {
    const renstraKegiatanRows = await RenstraKegiatan.findAll({
      where: { program_id: { [Op.in]: programIds } },
    });
    laporan.kegiatan.diperiksa = renstraKegiatanRows.length;

    for (const rk of renstraKegiatanRows) {
      if (!rk.rpjmd_kegiatan_id) continue;
      const sumber = await Kegiatan.findByPk(rk.rpjmd_kegiatan_id, {
        attributes: ['kode_kegiatan', 'nama_kegiatan'],
      });
      if (!sumber) continue;

      const patch = {};
      if (sumber.kode_kegiatan && rk.kode_kegiatan !== sumber.kode_kegiatan) {
        patch.kode_kegiatan = sumber.kode_kegiatan;
      }
      if (sumber.nama_kegiatan && rk.nama_kegiatan !== sumber.nama_kegiatan) {
        patch.nama_kegiatan = sumber.nama_kegiatan;
      }
      if (Object.keys(patch).length) {
        await rk.update(patch);
        laporan.kegiatan.disegarkan += 1;
      }
    }

    const renstraSubRows = await RenstraSubkegiatan.findAll({
      where: { renstra_program_id: { [Op.in]: programIds } },
    });
    laporan.sub_kegiatan.diperiksa = renstraSubRows.length;

    for (const rs of renstraSubRows) {
      if (!rs.sub_kegiatan_id) continue;
      const sumber = await SubKegiatan.findByPk(rs.sub_kegiatan_id, {
        attributes: [
          'kode_sub_kegiatan',
          'nama_sub_kegiatan',
          'nama_opd',
          'nama_bidang_opd',
          'sub_bidang_opd',
        ],
      });
      if (!sumber) continue;

      const patch = {};
      if (sumber.kode_sub_kegiatan && rs.kode_sub_kegiatan !== sumber.kode_sub_kegiatan) {
        patch.kode_sub_kegiatan = sumber.kode_sub_kegiatan;
      }
      if (sumber.nama_sub_kegiatan && rs.nama_sub_kegiatan !== sumber.nama_sub_kegiatan) {
        patch.nama_sub_kegiatan = sumber.nama_sub_kegiatan;
      }
      // Field OPD hanya diisi kalau kosong — sama seperti mergeOpdFromSubKegiatan
      // di renstra_subkegiatanController.js, jangan timpa pilihan manual user.
      if (kosong(rs.nama_opd) && sumber.nama_opd) patch.nama_opd = sumber.nama_opd;
      if (kosong(rs.nama_bidang_opd) && sumber.nama_bidang_opd) {
        patch.nama_bidang_opd = sumber.nama_bidang_opd;
      }
      if (kosong(rs.sub_bidang_opd) && sumber.sub_bidang_opd) {
        patch.sub_bidang_opd = sumber.sub_bidang_opd;
      }

      if (Object.keys(patch).length) {
        await rs.update(patch);
        laporan.sub_kegiatan.disegarkan += 1;
      }
    }
  }

  await renstraOpd.update({
    needs_recall: false,
    recall_reason: null,
    last_recall_at: new Date(),
  });

  return laporan;
}

module.exports = { recallRenstraOpd };
