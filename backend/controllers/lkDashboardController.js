"use strict";

const db = require("../models");
const { QueryTypes } = require("sequelize");
const { statusCalk } = require("../services/calkService");

const { sequelize } = db;

async function statusSnapshot(table, tahun, statusCol = "dikunci") {
  const rows = await sequelize.query(
    `SELECT COUNT(*) AS n, SUM(CASE WHEN ${statusCol} = 1 THEN 1 ELSE 0 END) AS kunci
     FROM ${table} WHERE tahun_anggaran = :t`,
    { replacements: { t: tahun }, type: QueryTypes.SELECT },
  );
  const row = rows[0];
  const n = Number(row?.n) || 0;
  const k = Number(row?.kunci) || 0;
  if (n === 0) return { ada_data: false, status: "KOSONG" };
  return { ada_data: true, status: k > 0 ? "FINAL" : "DRAFT" };
}

exports.dashboard = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    if (!tahun) return res.status(400).json({ message: "Tahun tidak valid" });
    const tahunStr = String(tahun);

    let anggaran = 0;
    let realisasi = 0;
    try {
      const aggRows = await sequelize.query(
        `SELECT COALESCE(SUM(anggaran),0) AS anggaran, COALESCE(SUM(realisasi),0) AS realisasi
         FROM dpa WHERE tahun = :ts`,
        { replacements: { ts: tahunStr }, type: QueryTypes.SELECT },
      );
      const aggDpa = aggRows[0] || {};
      anggaran = Number(aggDpa?.anggaran) || 0;
      realisasi = Number(aggDpa?.realisasi) || 0;
    } catch {
      /* tabel dpa / kolom belum ada */
    }
    const sisa = anggaran - realisasi;
    const serapan = anggaran > 0 ? (realisasi / anggaran) * 100 : 0;

    let bulanan = [];
    try {
      bulanan = await sequelize.query(
        `SELECT bulan AS bulan, COALESCE(SUM(pengeluaran),0) AS nilai
         FROM bku
         WHERE tahun_anggaran = :t AND status_validasi IN ('VALID','BELUM')
         GROUP BY bulan
         ORDER BY bulan`,
        { replacements: { t: tahun }, type: QueryTypes.SELECT },
      );
    } catch {
      bulanan = [];
    }

    const chart = Array.from({ length: 12 }, (_, i) => {
      const bulan = i + 1;
      const hit = bulanan.find((b) => Number(b.bulan) === bulan);
      return { bulan, label: String(bulan), nilai: Number(hit?.nilai) || 0 };
    });

    const safeSnap = async (table) => {
      try {
        return await statusSnapshot(table, tahun);
      } catch {
        return { ada_data: false, status: "KOSONG" };
      }
    };

    const [lra, neraca, lo, lpe, lak] = await Promise.all([
      safeSnap("lra_snapshot"),
      safeSnap("neraca_snapshot"),
      safeSnap("lo_snapshot"),
      safeSnap("lpe_snapshot"),
      safeSnap("lak_snapshot"),
    ]);

    let calk;
    try {
      calk = await statusCalk(db, tahun);
    } catch {
      calk = { total_bab: 0, final: 0, draft: 0, belum_diisi: 0, persen_final: 0 };
    }

    res.json({
      tahun_anggaran: tahun,
      ringkasan_anggaran: {
        anggaran,
        realisasi,
        sisa,
        persen_serapan: Math.round(serapan * 100) / 100,
      },
      grafik_realisasi_bulanan: chart,
      status_laporan: {
        lra,
        neraca,
        lo,
        lpe,
        lak,
        calk: {
          final: calk.final,
          total: calk.total_bab,
          draft: calk.draft,
          belum_diisi: calk.belum_diisi,
          persen_final: calk.persen_final,
        },
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || "Gagal memuat dashboard LK" });
  }
};
