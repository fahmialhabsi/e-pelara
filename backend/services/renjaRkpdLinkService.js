"use strict";

const { Op } = require("sequelize");
const { Renja, Rkpd } = require("../models");

function norm(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Menautkan baris RKPD yang belum punya renja_id ke Renja berdasarkan tahun + hierarki teks/kode.
 * Idempotent: baris yang sudah punya renja_id dilewati.
 *
 * @param {{ dryRun?: boolean }} opts
 * @returns {Promise<{ examined: number, linked: number, details: Array<{ rkpdId: number, renjaId: number|null, reason: string }> }>}
 */
async function linkRenjaToRkpd(opts = {}) {
  const dryRun = Boolean(opts.dryRun);
  const limit = Math.min(Number(opts.limit) || 5000, 20000);

  const rkpds = await Rkpd.findAll({
    where: {
      [Op.or]: [{ renja_id: null }, { renja_id: { [Op.is]: null } }],
    },
    limit,
    order: [["id", "ASC"]],
  });

  const renjas = await Renja.findAll({ order: [["id", "ASC"]] });

  let linked = 0;
  const details = [];

  for (const r of rkpds) {
    let match = null;
    let reason = "no_match";

    for (const ren of renjas) {
      if (Number(ren.tahun) !== Number(r.tahun)) continue;

      const subR = norm(r.nama_sub_kegiatan);
      const subRen = norm(ren.sub_kegiatan);
      const kodeSub = norm(r.kode_sub_kegiatan);
      if (subR && subRen && subR === subRen) {
        match = ren;
        reason = "nama_sub_kegiatan";
        break;
      }
      if (kodeSub && subRen && kodeSub === subRen) {
        match = ren;
        reason = "kode_vs_sub_renja";
        break;
      }

      const progR = norm(r.nama_program);
      const progRen = norm(ren.program);
      const kegR = norm(r.nama_kegiatan);
      const kegRen = norm(ren.kegiatan);
      if (progR && kegR && progRen && kegRen && progR === progRen && kegR === kegRen) {
        match = ren;
        reason = "program_kegiatan";
        break;
      }
    }

    if (match) {
      linked += 1;
      details.push({ rkpdId: r.id, renjaId: match.id, reason });
      if (!dryRun) {
        await r.update({ renja_id: match.id });
      }
    } else {
      details.push({ rkpdId: r.id, renjaId: null, reason });
    }
  }

  return {
    examined: rkpds.length,
    linked,
    dryRun,
    renjaCount: renjas.length,
    details: details.slice(0, 100),
    details_truncated: details.length > 100,
  };
}

module.exports = { linkRenjaToRkpd };
