"use strict";

const { fn, col, Op } = require("sequelize");
const { Renja, Rkpd } = require("../models");

/**
 * GET /api/dashboard/renja-summary
 * Query: ?tahun=2025 (opsional — filter tahun)
 */
exports.getRenjaRkpdSummary = async (req, res) => {
  try {
    const tahun = req.query.tahun ? parseInt(String(req.query.tahun), 10) : null;
    const renjaWhere = tahun && Number.isFinite(tahun) ? { tahun } : {};
    const rkpdWhere = tahun && Number.isFinite(tahun) ? { tahun } : {};

    const renjaCount = await Renja.count({ where: renjaWhere });
    const rkpdCount = await Rkpd.count({ where: rkpdWhere });

    const totalPaguRow = await Rkpd.findOne({
      attributes: [[fn("COALESCE", fn("SUM", col("pagu_anggaran")), 0), "total"]],
      where: rkpdWhere,
      raw: true,
    });
    const totalPagu = Number(totalPaguRow?.total || 0);

    const perRenja = await Rkpd.findAll({
      attributes: [
        "renja_id",
        [fn("COUNT", col("id")), "rkpd_count"],
        [fn("COALESCE", fn("SUM", col("pagu_anggaran")), 0), "total_pagu"],
      ],
      where: {
        ...rkpdWhere,
        renja_id: { [Op.ne]: null },
      },
      group: ["renja_id"],
      raw: true,
    });

    const renjaIds = perRenja.map((r) => r.renja_id).filter(Boolean);
    const renjaRows =
      renjaIds.length > 0
        ? await Renja.findAll({
            where: { id: renjaIds },
            attributes: ["id", "tahun", "judul", "program", "perangkat_daerah"],
          })
        : [];
    const renjaMap = new Map(renjaRows.map((x) => [x.id, x]));

    const rkpd_per_renja = perRenja.map((row) => {
      const meta = renjaMap.get(row.renja_id);
      return {
        renja_id: row.renja_id,
        rkpd_count: Number(row.rkpd_count || 0),
        total_pagu: Number(row.total_pagu || 0),
        renja: meta
          ? {
              id: meta.id,
              tahun: meta.tahun,
              judul: meta.judul,
              program: meta.program,
              perangkat_daerah: meta.perangkat_daerah,
            }
          : null,
      };
    });

    return res.json({
      success: true,
      data: {
        jumlah_renja: renjaCount,
        jumlah_rkpd: rkpdCount,
        total_pagu: totalPagu,
        filter_tahun: tahun && Number.isFinite(tahun) ? tahun : null,
        rkpd_per_renja,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Gagal memuat ringkasan Renja/RKPD",
      error: err.message,
    });
  }
};
