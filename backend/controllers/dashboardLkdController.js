/**
 * dashboardLkdController.js
 * Dashboard LKD (Laporan Keuangan Dinas) — data real dari DB.
 *
 * Sumber data:
 *   - lk_dispang  → anggaran, realisasi per program/kegiatan
 *   - dpa         → pagu anggaran per program
 *   - program     → referensi program
 *   - kegiatan    → referensi kegiatan
 *   - sipd_ref_*  → referensi SIPD
 *
 * Endpoints:
 *   GET /api/lkd/summary
 *   GET /api/lkd/per-program
 *   GET /api/lkd/top-kegiatan
 *   GET /api/lkd/indikator-progress
 *   GET /api/lkd/tahun-list
 *   GET /api/lkd/program-list
 *   GET /api/lkd/export/csv
 *   GET /api/lkd/export/excel
 */

const { sequelize } = require("../models");
const ExcelJS        = require("exceljs");

// ── Helper: build WHERE clause dari filter ────────────────────────────────────
function buildWhere(params, tableAlias = "l") {
  const { tahun, program, periode_id } = params;
  const conds = [];
  const replacements = {};

  if (tahun)      { conds.push(`${tableAlias}.tahun = :tahun`);           replacements.tahun = String(tahun); }
  if (program)    { conds.push(`${tableAlias}.program LIKE :program`);    replacements.program = `%${program}%`; }
  if (periode_id) { conds.push(`${tableAlias}.periode_id = :periode_id`); replacements.periode_id = parseInt(periode_id); }

  return { whereStr: conds.length ? "WHERE " + conds.join(" AND ") : "", replacements };
}

function fmtRp(n) { return parseFloat(n) || 0; }

// ── 1. Summary ─────────────────────────────────────────────────────────────────
exports.getSummary = async (req, res) => {
  try {
    const { whereStr, replacements } = buildWhere(req.query);

    // Data dari lk_dispang
    const [[lkd]] = await sequelize.query(`
      SELECT
        COUNT(*) AS cnt_records,
        COUNT(DISTINCT program) AS cnt_program,
        COUNT(DISTINCT kegiatan) AS cnt_kegiatan,
        COALESCE(SUM(anggaran), 0) AS total_anggaran,
        COALESCE(SUM(realisasi), 0) AS total_realisasi,
        COALESCE(AVG(persen_realisasi), 0) AS avg_persen
      FROM lk_dispang l
      ${whereStr}
    `, { replacements });

    // Fallback ke DPA jika lk_dispang kosong
    const [[dpa]] = await sequelize.query(`
      SELECT
        COUNT(*) AS cnt_dpa,
        COUNT(DISTINCT program) AS cnt_program_dpa,
        COUNT(DISTINCT kegiatan) AS cnt_kegiatan_dpa,
        COALESCE(SUM(anggaran), 0) AS total_pagu_dpa
      FROM dpa d
      ${req.query.tahun ? "WHERE d.tahun = :tahun" : ""}
    `, { replacements: req.query.tahun ? { tahun: String(req.query.tahun) } : {} });

    const useLkd = parseInt(lkd.cnt_records) > 0;

    return res.json({
      success: true,
      data: {
        sumber_data: useLkd ? "lk_dispang" : (parseInt(dpa.cnt_dpa) > 0 ? "dpa" : "kosong"),
        cnt_program:   useLkd ? lkd.cnt_program   : dpa.cnt_program_dpa,
        cnt_kegiatan:  useLkd ? lkd.cnt_kegiatan  : dpa.cnt_kegiatan_dpa,
        total_anggaran:  useLkd ? fmtRp(lkd.total_anggaran) : fmtRp(dpa.total_pagu_dpa),
        total_realisasi: fmtRp(lkd.total_realisasi),
        avg_persen:      Math.round(fmtRp(lkd.avg_persen)),
        persen_realisasi: lkd.total_anggaran > 0
          ? Math.round((lkd.total_realisasi / lkd.total_anggaran) * 100)
          : 0,
        has_data: useLkd || parseInt(dpa.cnt_dpa) > 0,
      },
    });
  } catch (err) {
    console.error("[lkd] summary:", err.message);
    return res.status(500).json({ success: false, message: "Gagal ambil summary: " + err.message });
  }
};

// ── 2. Per Program ─────────────────────────────────────────────────────────────
exports.getPerProgram = async (req, res) => {
  try {
    const { whereStr, replacements } = buildWhere(req.query);

    // Coba dari lk_dispang dulu
    const [lkdRows] = await sequelize.query(`
      SELECT
        program,
        tahun,
        COUNT(*) AS cnt_kegiatan,
        COALESCE(SUM(anggaran), 0) AS total_anggaran,
        COALESCE(SUM(realisasi), 0) AS total_realisasi,
        CASE WHEN COALESCE(SUM(anggaran),0)=0 THEN 0
             ELSE ROUND(SUM(realisasi)/SUM(anggaran)*100, 2)
        END AS persen_realisasi
      FROM lk_dispang l
      ${whereStr}
      GROUP BY program, tahun
      ORDER BY total_anggaran DESC
      LIMIT 20
    `, { replacements });

    if (lkdRows.length > 0) {
      return res.json({ success: true, sumber: "lk_dispang", data: lkdRows });
    }

    // Fallback ke DPA
    const { whereStr: dpaWhere, replacements: dpaRep } = buildWhere(req.query, "d");
    const [dpaRows] = await sequelize.query(`
      SELECT
        program,
        tahun,
        COUNT(*) AS cnt_kegiatan,
        COALESCE(SUM(anggaran), 0) AS total_anggaran,
        0 AS total_realisasi,
        0 AS persen_realisasi
      FROM dpa d
      ${dpaWhere}
      GROUP BY program, tahun
      ORDER BY total_anggaran DESC
      LIMIT 20
    `, { replacements: dpaRep });

    // Fallback ke SIPD ref programs
    if (dpaRows.length === 0) {
      const [sipdRows] = await sequelize.query(`
        SELECT kode AS program, 'N/A' AS tahun,
               0 AS cnt_kegiatan, 0 AS total_anggaran,
               0 AS total_realisasi, 0 AS persen_realisasi,
               nama AS nama_program
        FROM sipd_ref_program LIMIT 10
      `);
      return res.json({ success: true, sumber: "sipd_ref_program", data: sipdRows });
    }

    return res.json({ success: true, sumber: "dpa", data: dpaRows });
  } catch (err) {
    console.error("[lkd] perProgram:", err.message);
    return res.status(500).json({ success: false, message: "Gagal ambil per-program: " + err.message });
  }
};

// ── 3. Top Kegiatan ────────────────────────────────────────────────────────────
exports.getTopKegiatan = async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  try {
    const { whereStr, replacements } = buildWhere(req.query);

    const [rows] = await sequelize.query(`
      SELECT
        kegiatan,
        program,
        tahun,
        COALESCE(SUM(anggaran), 0) AS total_anggaran,
        COALESCE(SUM(realisasi), 0) AS total_realisasi,
        CASE WHEN COALESCE(SUM(anggaran),0)=0 THEN 0
             ELSE ROUND(SUM(realisasi)/SUM(anggaran)*100,2)
        END AS persen_realisasi
      FROM lk_dispang l
      ${whereStr}
      GROUP BY kegiatan, program, tahun
      ORDER BY total_anggaran DESC
      LIMIT :limit
    `, { replacements: { ...replacements, limit } });

    if (rows.length > 0) {
      return res.json({ success: true, sumber: "lk_dispang", data: rows });
    }

    // Fallback DPA
    const { whereStr: dWhere, replacements: dRep } = buildWhere(req.query, "d");
    const [dpaRows] = await sequelize.query(`
      SELECT
        kegiatan,
        program,
        tahun,
        COALESCE(SUM(anggaran),0) AS total_anggaran,
        0 AS total_realisasi,
        0 AS persen_realisasi
      FROM dpa d
      ${dWhere}
      GROUP BY kegiatan, program, tahun
      ORDER BY total_anggaran DESC
      LIMIT :limit
    `, { replacements: { ...dRep, limit } });

    // Fallback SIPD kegiatan ref
    if (dpaRows.length === 0) {
      const [sipdK] = await sequelize.query(`
        SELECT k.nama AS kegiatan, p.nama AS program,
               'N/A' AS tahun, 0 AS total_anggaran, 0 AS total_realisasi, 0 AS persen_realisasi
        FROM sipd_ref_kegiatan k
        LEFT JOIN sipd_ref_program p ON k.program_id = p.id
        LIMIT :limit
      `, { replacements: { limit } });
      return res.json({ success: true, sumber: "sipd_ref", data: sipdK });
    }

    return res.json({ success: true, sumber: "dpa", data: dpaRows });
  } catch (err) {
    console.error("[lkd] topKegiatan:", err.message);
    return res.status(500).json({ success: false, message: "Gagal ambil top kegiatan: " + err.message });
  }
};

// ── 4. Indikator Progress ──────────────────────────────────────────────────────
exports.getIndikatorProgress = async (req, res) => {
  try {
    const { tahun } = req.query;
    const tahunFilter = tahun ? "AND i.tahun = :tahun" : "";

    const [rows] = await sequelize.query(`
      SELECT
        i.id,
        i.nama_indikator,
        i.satuan,
        i.tahun,
        COALESCE(i.target_tahun_1, 0) AS target,
        COALESCE(r.nilai_realisasi, i.capaian_tahun_1, 0) AS realisasi,
        CASE
          WHEN COALESCE(i.target_tahun_1, 0) = 0 THEN 0
          ELSE ROUND(COALESCE(r.nilai_realisasi, i.capaian_tahun_1, 0)
               / i.target_tahun_1 * 100, 2)
        END AS pct_capaian,
        i.jenis_dokumen,
        i.level_dokumen
      FROM indikator i
      LEFT JOIN (
        SELECT indikator_id, MAX(nilai_realisasi) AS nilai_realisasi
        FROM realisasi_indikator
        GROUP BY indikator_id
      ) r ON r.indikator_id = i.id
      WHERE i.stage IN ('sasaran','program','kegiatan') ${tahunFilter}
      ORDER BY pct_capaian DESC
      LIMIT 20
    `, { replacements: tahun ? { tahun } : {} });

    const tercapai = rows.filter((r) => parseFloat(r.pct_capaian) >= 100).length;
    const hampir   = rows.filter((r) => { const p = parseFloat(r.pct_capaian); return p >= 75 && p < 100; }).length;
    const belum    = rows.filter((r) => parseFloat(r.pct_capaian) < 75).length;

    return res.json({
      success: true,
      data: rows,
      summary: { total: rows.length, tercapai, hampir, belum },
    });
  } catch (err) {
    console.error("[lkd] indikatorProgress:", err.message);
    return res.status(500).json({ success: false, message: "Gagal ambil indikator progress: " + err.message });
  }
};

// ── 5. Tahun list ──────────────────────────────────────────────────────────────
exports.getTahunList = async (req, res) => {
  try {
    const [rows] = await sequelize.query(`
      SELECT DISTINCT tahun FROM lk_dispang WHERE tahun IS NOT NULL
      UNION
      SELECT DISTINCT tahun FROM dpa WHERE tahun IS NOT NULL
      UNION
      SELECT DISTINCT CAST(tahun AS CHAR) FROM indikator WHERE tahun IS NOT NULL
      ORDER BY tahun DESC
      LIMIT 10
    `);
    const tahunList = rows.map((r) => r.tahun).filter(Boolean);
    if (!tahunList.length) {
      // Return default range
      const cur = new Date().getFullYear();
      return res.json({ success: true, data: [cur, cur-1, cur-2].map(String) });
    }
    return res.json({ success: true, data: tahunList });
  } catch (err) {
    const cur = new Date().getFullYear();
    return res.json({ success: true, data: [cur, cur-1].map(String) });
  }
};

// ── 6. Program list (autocomplete) ────────────────────────────────────────────
exports.getProgramList = async (req, res) => {
  try {
    const [rows] = await sequelize.query(`
      SELECT DISTINCT program FROM lk_dispang WHERE program IS NOT NULL
      UNION
      SELECT DISTINCT program FROM dpa WHERE program IS NOT NULL
      ORDER BY program ASC
      LIMIT 50
    `);
    const list = rows.map((r) => r.program).filter(Boolean);
    if (!list.length) {
      const [sipd] = await sequelize.query("SELECT nama AS program FROM sipd_ref_program LIMIT 10");
      return res.json({ success: true, data: sipd.map((r) => r.program) });
    }
    return res.json({ success: true, data: list });
  } catch (err) {
    return res.json({ success: true, data: [] });
  }
};

// ── 7. Export CSV ──────────────────────────────────────────────────────────────
exports.exportCsv = async (req, res) => {
  try {
    const { whereStr, replacements } = buildWhere(req.query);
    const tahun = req.query.tahun || new Date().getFullYear();

    // Ambil data dari lk_dispang, fallback DPA
    const [lkdRows] = await sequelize.query(`
      SELECT
        tahun, program, kegiatan, sub_kegiatan,
        akun_belanja, jenis_belanja, sumber_dana,
        anggaran, realisasi, sisa, persen_realisasi
      FROM lk_dispang l
      ${whereStr}
      ORDER BY program, kegiatan
    `, { replacements });

    let csvRows = lkdRows;
    let header  = ["Tahun","Program","Kegiatan","Sub Kegiatan","Akun Belanja","Jenis Belanja","Sumber Dana","Anggaran","Realisasi","Sisa","% Realisasi"];

    if (!csvRows.length) {
      // Fallback DPA
      const { whereStr: dw, replacements: dr } = buildWhere(req.query, "d");
      const [dpaRows] = await sequelize.query(`
        SELECT tahun, program, kegiatan, sub_kegiatan,
               indikator AS akun_belanja, jenis_dokumen AS jenis_belanja, NULL AS sumber_dana,
               anggaran, 0 AS realisasi, anggaran AS sisa, 0 AS persen_realisasi
        FROM dpa d
        ${dw}
        ORDER BY program, kegiatan
      `, { replacements: dr });
      csvRows = dpaRows;
    }

    // Build CSV
    const lines = [header.join(",")];
    for (const r of csvRows) {
      lines.push([
        `"${r.tahun||""}"`,
        `"${(r.program||"").replace(/"/g,'""')}"`,
        `"${(r.kegiatan||"").replace(/"/g,'""')}"`,
        `"${(r.sub_kegiatan||"").replace(/"/g,'""')}"`,
        `"${(r.akun_belanja||"").replace(/"/g,'""')}"`,
        `"${(r.jenis_belanja||"").replace(/"/g,'""')}"`,
        `"${(r.sumber_dana||"").replace(/"/g,'""')}"`,
        r.anggaran||0,
        r.realisasi||0,
        r.sisa||0,
        r.persen_realisasi||0,
      ].join(","));
    }

    const csv      = lines.join("\r\n");
    const filename = `dashboard_lkd_ringkasan_${tahun}.csv`;
    res.setHeader("Content-Type",        "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control",       "no-store");
    // BOM untuk Excel Windows
    return res.end("\uFEFF" + csv);
  } catch (err) {
    console.error("[lkd] exportCsv:", err.message);
    return res.status(500).json({ success: false, message: "Gagal export CSV: " + err.message });
  }
};

// ── 8. Export Excel ─────────────────────────────────────────────────────────────
exports.exportExcel = async (req, res) => {
  try {
    const { whereStr, replacements } = buildWhere(req.query);
    const tahun = req.query.tahun || new Date().getFullYear();

    const [lkdRows] = await sequelize.query(`
      SELECT tahun, program, kegiatan, sub_kegiatan,
             akun_belanja, jenis_belanja, sumber_dana,
             anggaran, realisasi, sisa, persen_realisasi
      FROM lk_dispang l
      ${whereStr}
      ORDER BY program, kegiatan
    `, { replacements });

    let rows = lkdRows;
    if (!rows.length) {
      const { whereStr: dw, replacements: dr } = buildWhere(req.query, "d");
      const [dpaRows] = await sequelize.query(`
        SELECT tahun, program, kegiatan, sub_kegiatan,
               indikator AS akun_belanja, jenis_dokumen AS jenis_belanja,
               NULL AS sumber_dana, anggaran, 0 AS realisasi, anggaran AS sisa, 0 AS persen_realisasi
        FROM dpa d
        ${dw}
        ORDER BY program, kegiatan
      `, { replacements: dr });
      rows = dpaRows;
    }

    // Build Excel dengan ExcelJS
    const wb = new ExcelJS.Workbook();
    wb.creator  = "ePeLARA";
    wb.created  = new Date();
    const ws    = wb.addWorksheet(`LKD ${tahun}`);

    // Header style
    ws.columns = [
      { header: "Tahun",         key: "tahun",         width: 8  },
      { header: "Program",       key: "program",       width: 35 },
      { header: "Kegiatan",      key: "kegiatan",      width: 35 },
      { header: "Sub Kegiatan",  key: "sub_kegiatan",  width: 30 },
      { header: "Akun Belanja",  key: "akun_belanja",  width: 20 },
      { header: "Jenis Belanja", key: "jenis_belanja", width: 18 },
      { header: "Sumber Dana",   key: "sumber_dana",   width: 15 },
      { header: "Anggaran (Rp)", key: "anggaran",      width: 18, style: { numFmt: "#,##0" } },
      { header: "Realisasi (Rp)",key: "realisasi",     width: 18, style: { numFmt: "#,##0" } },
      { header: "Sisa (Rp)",     key: "sisa",          width: 18, style: { numFmt: "#,##0" } },
      { header: "% Realisasi",   key: "persen_realisasi", width: 12, style: { numFmt: "0.00" } },
    ];

    // Style header row
    const headerRow = ws.getRow(1);
    headerRow.font    = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill    = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };
    headerRow.height  = 22;

    // Data rows
    for (const r of rows) {
      ws.addRow({
        tahun:          r.tahun,
        program:        r.program || "",
        kegiatan:       r.kegiatan || "",
        sub_kegiatan:   r.sub_kegiatan || "",
        akun_belanja:   r.akun_belanja || "",
        jenis_belanja:  r.jenis_belanja || "",
        sumber_dana:    r.sumber_dana || "",
        anggaran:        parseFloat(r.anggaran)  || 0,
        realisasi:       parseFloat(r.realisasi) || 0,
        sisa:            parseFloat(r.sisa)      || 0,
        persen_realisasi: parseFloat(r.persen_realisasi) || 0,
      });
    }

    // Summary row
    const lastRow = rows.length + 2;
    const totalAnggaran  = rows.reduce((s, r) => s + (parseFloat(r.anggaran)  || 0), 0);
    const totalRealisasi = rows.reduce((s, r) => s + (parseFloat(r.realisasi) || 0), 0);
    const pct = totalAnggaran > 0 ? Math.round(totalRealisasi/totalAnggaran*100*100)/100 : 0;
    ws.addRow({});
    const sumRow = ws.addRow({
      program: "TOTAL",
      anggaran:  totalAnggaran,
      realisasi: totalRealisasi,
      persen_realisasi: pct,
    });
    sumRow.font = { bold: true };
    sumRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E7FF" } };

    // Info sheet
    const wsInfo = wb.addWorksheet("Info");
    wsInfo.addRow(["Dokumen",   `Dashboard LKD Tahun ${tahun}`]);
    wsInfo.addRow(["Diexport",  new Date().toLocaleString("id-ID")]);
    wsInfo.addRow(["Sistem",    "ePeLARA — Dinas Ketahanan Pangan Maluku Utara"]);
    wsInfo.addRow(["Total Data", `${rows.length} baris`]);

    const filename = `dashboard_lkd_ringkasan_${tahun}.xlsx`;
    res.setHeader("Content-Type",        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control",       "no-store");

    const buf = await wb.xlsx.writeBuffer();
    return res.end(Buffer.from(buf));

  } catch (err) {
    console.error("[lkd] exportExcel:", err.message);
    return res.status(500).json({ success: false, message: "Gagal export Excel: " + err.message });
  }
};
