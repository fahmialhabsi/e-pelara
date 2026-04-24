"use strict";

/**
 * Cascading Gap Audit Service (READ-ONLY)
 * - Menjalankan query agregat untuk mendeteksi titik putus cascading RPJMD → Renstra OPD.
 * - Tanpa migrasi FK, tanpa update data.
 */

async function listTables(sequelize) {
  const qi = sequelize.getQueryInterface();
  const tables = await qi.showAllTables();
  // `showAllTables()` bisa mengembalikan array string atau object (tergantung dialect/versi).
  const names = (tables || [])
    .map((t) => {
      if (typeof t === "string" || typeof t === "number") return String(t);
      if (t && typeof t === "object") {
        return (
          t.tableName ||
          t.table_name ||
          t.name ||
          t.TABLE_NAME
        );
      }
      return null;
    })
    .filter((n) => n != null && String(n).trim() !== "")
    .map((n) => String(n).toLowerCase());

  return new Set(names);
}

async function safeCount(sequelize, sql) {
  const [rows] = await sequelize.query(sql, { raw: true });
  const first = Array.isArray(rows) ? rows[0] : null;
  const val = first ? Object.values(first)[0] : 0;
  return Number(val) || 0;
}

async function safeSamples(sequelize, sql, limit = 20) {
  const q = `${sql}\nLIMIT ${Number(limit) || 20}`;
  const [rows] = await sequelize.query(q, { raw: true });
  return Array.isArray(rows) ? rows : [];
}

function recommendationFor(code) {
  switch (code) {
    case "ORPHAN_SASARAN_TUJUAN":
      return "Perbaiki sasaran.tujuan_id (relink ke tujuan valid atau set NULL), lalu batasi delete tujuan (RESTRICT) / guard delete.";
    case "ORPHAN_STRATEGI_SASARAN":
      return "Perbaiki strategi.sasaran_id dan tambahkan guard delete sasaran bila punya strategi.";
    case "ORPHAN_ARAH_STRATEGI":
      return "Perbaiki arah_kebijakan.strategi_id dan tambahkan guard delete strategi bila punya arah kebijakan.";
    case "ORPHAN_PROGRAM_SASARAN":
      return "Perbaiki program.sasaran_id; wajibkan sasaran valid untuk program baru.";
    case "ORPHAN_KEGIATAN_PROGRAM":
      return "Perbaiki kegiatan.program_id; tolak delete program bila punya kegiatan.";
    case "ORPHAN_SUB_KEGIATAN_KEGIATAN":
      return "Perbaiki sub_kegiatan.kegiatan_id; tolak delete kegiatan bila punya sub kegiatan.";
    case "PROGRAM_NO_ARAH_KEBIJAKAN":
      return "Wajibkan minimal 1 arah kebijakan saat create/update Program dan rapikan pivot program_arah_kebijakan.";
    case "PIVOT_PROGRAM_ARAH_INVALID":
      return "Hapus baris pivot invalid atau relink ke parent yang benar sebelum menambah FK.";
    case "PIVOT_PROGRAM_STRATEGI_INVALID":
      return "Hapus baris pivot invalid atau relink sebelum enforcement.";
    case "ORPHAN_RENSTRA_TUJUAN_OPD":
    case "ORPHAN_RENSTRA_SASARAN_OPD":
    case "ORPHAN_RENSTRA_STRATEGI_OPD":
    case "ORPHAN_RENSTRA_KEBIJAKAN_OPD":
      return "Pastikan renstra_id menunjuk renstra_opd yang ada; bila renstra_opd diganti id baru, pertimbangkan mapping sibling ids seperti helper renstraOpdProgramFilter.";
    case "MISMATCH_RENSTRA_SASARAN_TUJUAN_RPJMD":
      return "Perbaiki renstra_sasaran.tujuan_id (renstra_tujuan) agar konsisten dengan sasaran RPJMD yang dipilih.";
    case "MISMATCH_RENSTRA_STRATEGI_SASARAN_RPJMD":
      return "Perbaiki renstra_strategi.sasaran_id / rpjmd_strategi_id agar strategi RPJMD turun dari sasaran RPJMD yang benar.";
    case "MISMATCH_RENSTRA_KEBIJAKAN_STRATEGI_RPJMD":
      return "Perbaiki renstra_kebijakan.strategi_id / rpjmd_arah_id agar arah kebijakan RPJMD turun dari strategi RPJMD yang benar.";
    case "RENSTRA_TARGET_DETAIL_DUP":
      return "Dedupe renstra_target_detail per (renstra_target_id,tahun,level); setelah bersih, tambah unique index.";
    case "RENSTRA_TARGET_DETAIL_INCOMPLETE":
      return "Lengkapi details tahunan sesuai rentang renstra_opd (tahun_mulai..tahun_akhir) untuk setiap renstra_target.";
    case "RENSTRA_TUJUAN_RPJMD_TUJUAN_ID_NON_NUMERIC":
      return "Untuk data baru, gunakan rpjmd_tujuan_id numerik (string angka). Untuk data lama, siapkan kolom int baru dan backfill bertahap.";
    case "RENSTRA_TUJUAN_RPJMD_TUJUAN_ID_MISSING":
      return "Relink rpjmd_tujuan_id ke tujuan RPJMD yang valid atau kosongkan jika tidak dapat dipulihkan.";
    default:
      return "Rapikan data sesuai aturan cascading dan tambahkan constraint bertahap.";
  }
}

function buildCheck({
  code,
  label,
  severity = "error",
  count = 0,
  samples = [],
}) {
  return {
    code,
    label,
    severity,
    count,
    sample: samples,
    recommendation: recommendationFor(code),
  };
}

function isOrphanCheck(code) {
  return String(code || "").startsWith("ORPHAN_") || String(code || "").startsWith("PIVOT_");
}

function isBrokenChainCheck(code) {
  return (
    code === "PROGRAM_NO_ARAH_KEBIJAKAN" ||
    String(code || "").startsWith("MISMATCH_") ||
    String(code || "").startsWith("RENSTRA_TARGET_DETAIL_") ||
    String(code || "").startsWith("RENSTRA_TUJUAN_RPJMD_TUJUAN_ID_")
  );
}

function topRecommendations(checks, limit = 5) {
  const rows = [...(checks || [])]
    .filter((c) => Number(c.count) > 0)
    .sort((a, b) => Number(b.count) - Number(a.count));
  return rows.slice(0, limit).map((c) => ({
    code: c.code,
    count: c.count,
    recommendation: c.recommendation,
  }));
}

async function runCascadingGapAudit(sequelize) {
  const tables = await listTables(sequelize);
  const has = (t) => tables.has(String(t).toLowerCase());

  const checks = [];
  const metrics = {};

  if (has("program")) {
    metrics.total_program = await safeCount(sequelize, "SELECT COUNT(*) AS c FROM program");
  }
  if (has("renstra_opd")) {
    metrics.total_renstra_opd = await safeCount(sequelize, "SELECT COUNT(*) AS c FROM renstra_opd");
  }
  if (has("renstra_target")) {
    metrics.total_renstra_target = await safeCount(sequelize, "SELECT COUNT(*) AS c FROM renstra_target");
  }

  // RPJMD chain orphans
  if (has("sasaran") && has("tujuan")) {
    const count = await safeCount(
      sequelize,
      `SELECT COUNT(*) AS c
       FROM sasaran s
       LEFT JOIN tujuan t ON t.id = s.tujuan_id
       WHERE s.tujuan_id IS NOT NULL AND t.id IS NULL`,
    );
    const sample = await safeSamples(
      sequelize,
      `SELECT s.id, s.tujuan_id
       FROM sasaran s
       LEFT JOIN tujuan t ON t.id = s.tujuan_id
       WHERE s.tujuan_id IS NOT NULL AND t.id IS NULL`,
    );
    checks.push(
      buildCheck({
        code: "ORPHAN_SASARAN_TUJUAN",
        label: "Sasaran tanpa parent Tujuan",
        count,
        samples: sample,
      }),
    );
  }

  if (has("strategi") && has("sasaran")) {
    const count = await safeCount(
      sequelize,
      `SELECT COUNT(*) AS c
       FROM strategi st
       LEFT JOIN sasaran s ON s.id = st.sasaran_id
       WHERE st.sasaran_id IS NOT NULL AND s.id IS NULL`,
    );
    const sample = await safeSamples(
      sequelize,
      `SELECT st.id, st.sasaran_id
       FROM strategi st
       LEFT JOIN sasaran s ON s.id = st.sasaran_id
       WHERE st.sasaran_id IS NOT NULL AND s.id IS NULL`,
    );
    checks.push(
      buildCheck({
        code: "ORPHAN_STRATEGI_SASARAN",
        label: "Strategi tanpa parent Sasaran",
        count,
        samples: sample,
      }),
    );
  }

  if (has("arah_kebijakan") && has("strategi")) {
    const count = await safeCount(
      sequelize,
      `SELECT COUNT(*) AS c
       FROM arah_kebijakan a
       LEFT JOIN strategi st ON st.id = a.strategi_id
       WHERE a.strategi_id IS NOT NULL AND st.id IS NULL`,
    );
    const sample = await safeSamples(
      sequelize,
      `SELECT a.id, a.strategi_id
       FROM arah_kebijakan a
       LEFT JOIN strategi st ON st.id = a.strategi_id
       WHERE a.strategi_id IS NOT NULL AND st.id IS NULL`,
    );
    checks.push(
      buildCheck({
        code: "ORPHAN_ARAH_STRATEGI",
        label: "Arah Kebijakan tanpa parent Strategi",
        count,
        samples: sample,
      }),
    );
  }

  if (has("program") && has("sasaran")) {
    const count = await safeCount(
      sequelize,
      `SELECT COUNT(*) AS c
       FROM program p
       LEFT JOIN sasaran s ON s.id = p.sasaran_id
       WHERE p.sasaran_id IS NOT NULL AND s.id IS NULL`,
    );
    const sample = await safeSamples(
      sequelize,
      `SELECT p.id, p.sasaran_id, p.kode_program, p.nama_program
       FROM program p
       LEFT JOIN sasaran s ON s.id = p.sasaran_id
       WHERE p.sasaran_id IS NOT NULL AND s.id IS NULL`,
    );
    checks.push(
      buildCheck({
        code: "ORPHAN_PROGRAM_SASARAN",
        label: "Program tanpa parent Sasaran",
        count,
        samples: sample,
      }),
    );
  }

  if (has("kegiatan") && has("program")) {
    const count = await safeCount(
      sequelize,
      `SELECT COUNT(*) AS c
       FROM kegiatan k
       LEFT JOIN program p ON p.id = k.program_id
       WHERE k.program_id IS NOT NULL AND p.id IS NULL`,
    );
    const sample = await safeSamples(
      sequelize,
      `SELECT k.id, k.program_id, k.kode_kegiatan, k.nama_kegiatan
       FROM kegiatan k
       LEFT JOIN program p ON p.id = k.program_id
       WHERE k.program_id IS NOT NULL AND p.id IS NULL`,
    );
    checks.push(
      buildCheck({
        code: "ORPHAN_KEGIATAN_PROGRAM",
        label: "Kegiatan tanpa parent Program",
        count,
        samples: sample,
      }),
    );
  }

  if (has("sub_kegiatan") && has("kegiatan")) {
    const count = await safeCount(
      sequelize,
      `SELECT COUNT(*) AS c
       FROM sub_kegiatan sk
       LEFT JOIN kegiatan k ON k.id = sk.kegiatan_id
       WHERE sk.kegiatan_id IS NOT NULL AND k.id IS NULL`,
    );
    const sample = await safeSamples(
      sequelize,
      `SELECT sk.id, sk.kegiatan_id, sk.kode_sub_kegiatan, sk.nama_sub_kegiatan
       FROM sub_kegiatan sk
       LEFT JOIN kegiatan k ON k.id = sk.kegiatan_id
       WHERE sk.kegiatan_id IS NOT NULL AND k.id IS NULL`,
    );
    checks.push(
      buildCheck({
        code: "ORPHAN_SUB_KEGIATAN_KEGIATAN",
        label: "Sub Kegiatan tanpa parent Kegiatan",
        count,
        samples: sample,
      }),
    );
  }

  // Program tanpa arah kebijakan
  if (has("program") && has("program_arah_kebijakan")) {
    const count = await safeCount(
      sequelize,
      `SELECT COUNT(*) AS c
       FROM (
         SELECT p.id
         FROM program p
         LEFT JOIN program_arah_kebijakan pak ON pak.program_id = p.id
         GROUP BY p.id
         HAVING COUNT(pak.arah_kebijakan_id) = 0
       ) x`,
    );
    const sample = await safeSamples(
      sequelize,
      `SELECT p.id, p.kode_program, p.nama_program
       FROM program p
       LEFT JOIN program_arah_kebijakan pak ON pak.program_id = p.id
       GROUP BY p.id
       HAVING COUNT(pak.arah_kebijakan_id) = 0`,
    );
    checks.push(
      buildCheck({
        code: "PROGRAM_NO_ARAH_KEBIJAKAN",
        label: "Program tanpa Arah Kebijakan",
        severity: "error",
        count,
        samples: sample,
      }),
    );
    if (metrics.total_program != null) {
      metrics.total_program_with_arah_kebijakan = Math.max(
        0,
        Number(metrics.total_program) - Number(count || 0),
      );
    }
  }

  // Pivot invalid
  if (has("program_arah_kebijakan") && has("program") && has("arah_kebijakan")) {
    const count = await safeCount(
      sequelize,
      `SELECT COUNT(*) AS c
       FROM program_arah_kebijakan pak
       LEFT JOIN program p ON p.id = pak.program_id
       LEFT JOIN arah_kebijakan a ON a.id = pak.arah_kebijakan_id
       WHERE p.id IS NULL OR a.id IS NULL`,
    );
    const sample = await safeSamples(
      sequelize,
      `SELECT pak.program_id, pak.arah_kebijakan_id
       FROM program_arah_kebijakan pak
       LEFT JOIN program p ON p.id = pak.program_id
       LEFT JOIN arah_kebijakan a ON a.id = pak.arah_kebijakan_id
       WHERE p.id IS NULL OR a.id IS NULL`,
    );
    checks.push(
      buildCheck({
        code: "PIVOT_PROGRAM_ARAH_INVALID",
        label: "Pivot program_arah_kebijakan invalid (parent hilang)",
        count,
        samples: sample,
      }),
    );
  }

  if (has("program_strategi") && has("program") && has("strategi")) {
    const count = await safeCount(
      sequelize,
      `SELECT COUNT(*) AS c
       FROM program_strategi ps
       LEFT JOIN program p ON p.id = ps.program_id
       LEFT JOIN strategi st ON st.id = ps.strategi_id
       WHERE p.id IS NULL OR st.id IS NULL`,
    );
    const sample = await safeSamples(
      sequelize,
      `SELECT ps.program_id, ps.strategi_id
       FROM program_strategi ps
       LEFT JOIN program p ON p.id = ps.program_id
       LEFT JOIN strategi st ON st.id = ps.strategi_id
       WHERE p.id IS NULL OR st.id IS NULL`,
    );
    checks.push(
      buildCheck({
        code: "PIVOT_PROGRAM_STRATEGI_INVALID",
        label: "Pivot program_strategi invalid (parent hilang)",
        count,
        samples: sample,
      }),
    );
  }

  // Renstra chain orphan (normalized)
  if (has("renstra_tujuan") && has("renstra_opd")) {
    const count = await safeCount(
      sequelize,
      `SELECT COUNT(*) AS c
       FROM renstra_tujuan rt
       LEFT JOIN renstra_opd ro ON ro.id = rt.renstra_id
       WHERE rt.renstra_id IS NOT NULL AND ro.id IS NULL`,
    );
    checks.push(
      buildCheck({
        code: "ORPHAN_RENSTRA_TUJUAN_OPD",
        label: "Renstra Tujuan tanpa parent Renstra OPD",
        count,
        samples: [],
      }),
    );
  }

  if (has("renstra_program") && has("renstra_opd")) {
    const count = await safeCount(
      sequelize,
      `SELECT COUNT(*) AS c
       FROM renstra_program rp
       LEFT JOIN renstra_opd ro ON ro.id = rp.renstra_id
       WHERE rp.renstra_id IS NOT NULL AND ro.id IS NULL`,
    );
    checks.push(
      buildCheck({
        code: "ORPHAN_RENSTRA_PROGRAM_OPD",
        label: "Renstra Program tanpa parent Renstra OPD",
        count,
        samples: [],
      }),
    );
  }

  if (has("renstra_kegiatan") && has("renstra_opd")) {
    const count = await safeCount(
      sequelize,
      `SELECT COUNT(*) AS c
       FROM renstra_kegiatan rk
       LEFT JOIN renstra_opd ro ON ro.id = rk.renstra_id
       WHERE rk.renstra_id IS NOT NULL AND ro.id IS NULL`,
    );
    checks.push(
      buildCheck({
        code: "ORPHAN_RENSTRA_KEGIATAN_OPD",
        label: "Renstra Kegiatan tanpa parent Renstra OPD",
        count,
        samples: [],
      }),
    );
  }

  if (has("renstra_kegiatan") && has("renstra_program")) {
    const count = await safeCount(
      sequelize,
      `SELECT COUNT(*) AS c
       FROM renstra_kegiatan rk
       LEFT JOIN renstra_program rp ON rp.id = rk.program_id
       WHERE rk.program_id IS NOT NULL AND rp.id IS NULL`,
    );
    checks.push(
      buildCheck({
        code: "ORPHAN_RENSTRA_KEGIATAN_PROGRAM",
        label: "Renstra Kegiatan tanpa parent Renstra Program",
        count,
        samples: [],
      }),
    );
  }

  if (has("renstra_subkegiatan") && has("renstra_program")) {
    const count = await safeCount(
      sequelize,
      `SELECT COUNT(*) AS c
       FROM renstra_subkegiatan rsk
       LEFT JOIN renstra_program rp ON rp.id = rsk.renstra_program_id
       WHERE rsk.renstra_program_id IS NOT NULL AND rp.id IS NULL`,
    );
    checks.push(
      buildCheck({
        code: "ORPHAN_RENSTRA_SUBKEGIATAN_PROGRAM",
        label: "Renstra SubKegiatan tanpa parent Renstra Program",
        count,
        samples: [],
      }),
    );
  }

  if (has("renstra_subkegiatan") && has("renstra_kegiatan")) {
    const count = await safeCount(
      sequelize,
      `SELECT COUNT(*) AS c
       FROM renstra_subkegiatan rsk
       LEFT JOIN renstra_kegiatan rk ON rk.id = rsk.kegiatan_id
       WHERE rsk.kegiatan_id IS NOT NULL AND rk.id IS NULL`,
    );
    checks.push(
      buildCheck({
        code: "ORPHAN_RENSTRA_SUBKEGIATAN_KEGIATAN",
        label: "Renstra SubKegiatan tanpa parent Renstra Kegiatan",
        count,
        samples: [],
      }),
    );
  }

  if (has("renstra_subkegiatan") && has("sub_kegiatan")) {
    const count = await safeCount(
      sequelize,
      `SELECT COUNT(*) AS c
       FROM renstra_subkegiatan rsk
       LEFT JOIN sub_kegiatan sk ON sk.id = rsk.sub_kegiatan_id
       WHERE rsk.sub_kegiatan_id IS NOT NULL AND sk.id IS NULL`,
    );
    checks.push(
      buildCheck({
        code: "ORPHAN_RENSTRA_SUBKEGIATAN_SUBMASTER",
        label: "Renstra SubKegiatan tanpa master sub_kegiatan",
        count,
        samples: [],
      }),
    );
  }

  // Cross-link Renstra Program → RPJMD Program (best-effort; field sering string)
  if (has("renstra_program")) {
    const nonNumeric = await safeCount(
      sequelize,
      `SELECT COUNT(*) AS c
       FROM renstra_program
       WHERE rpjmd_program_id IS NOT NULL
         AND TRIM(rpjmd_program_id) <> ''
         AND rpjmd_program_id NOT REGEXP '^[0-9]+$'`,
    );
    checks.push(
      buildCheck({
        code: "RENSTRA_PROGRAM_RPJMD_PROGRAM_ID_NON_NUMERIC",
        label: "renstra_program.rpjmd_program_id non-numerik (indikasi mismatch tipe)",
        severity: "warning",
        count: nonNumeric,
        samples: [],
      }),
    );
  }

  if (has("renstra_program") && has("program")) {
    const missing = await safeCount(
      sequelize,
      `SELECT COUNT(*) AS c
       FROM renstra_program rp
       LEFT JOIN program p ON p.id = CAST(rp.rpjmd_program_id AS UNSIGNED)
       WHERE rp.rpjmd_program_id REGEXP '^[0-9]+$'
         AND p.id IS NULL`,
    );
    checks.push(
      buildCheck({
        code: "RENSTRA_PROGRAM_RPJMD_PROGRAM_ID_MISSING",
        label: "renstra_program.rpjmd_program_id numerik tapi Program RPJMD tidak ditemukan",
        severity: "error",
        count: missing,
        samples: [],
      }),
    );
  }

  if (has("renstra_sasaran") && has("renstra_opd")) {
    const count = await safeCount(
      sequelize,
      `SELECT COUNT(*) AS c
       FROM renstra_sasaran rs
       LEFT JOIN renstra_opd ro ON ro.id = rs.renstra_id
       WHERE rs.renstra_id IS NOT NULL AND ro.id IS NULL`,
    );
    checks.push(
      buildCheck({
        code: "ORPHAN_RENSTRA_SASARAN_OPD",
        label: "Renstra Sasaran tanpa parent Renstra OPD",
        count,
        samples: [],
      }),
    );
  }

  if (has("renstra_strategi") && has("renstra_opd")) {
    const count = await safeCount(
      sequelize,
      `SELECT COUNT(*) AS c
       FROM renstra_strategi rstr
       LEFT JOIN renstra_opd ro ON ro.id = rstr.renstra_id
       WHERE rstr.renstra_id IS NOT NULL AND ro.id IS NULL`,
    );
    checks.push(
      buildCheck({
        code: "ORPHAN_RENSTRA_STRATEGI_OPD",
        label: "Renstra Strategi tanpa parent Renstra OPD",
        count,
        samples: [],
      }),
    );
  }

  if (has("renstra_kebijakan") && has("renstra_opd")) {
    const count = await safeCount(
      sequelize,
      `SELECT COUNT(*) AS c
       FROM renstra_kebijakan rk
       LEFT JOIN renstra_opd ro ON ro.id = rk.renstra_id
       WHERE rk.renstra_id IS NOT NULL AND ro.id IS NULL`,
    );
    checks.push(
      buildCheck({
        code: "ORPHAN_RENSTRA_KEBIJAKAN_OPD",
        label: "Renstra Kebijakan tanpa parent Renstra OPD",
        count,
        samples: [],
      }),
    );
  }

  // Consistency Renstra→RPJMD
  if (has("renstra_sasaran") && has("renstra_tujuan") && has("sasaran")) {
    const count = await safeCount(
      sequelize,
      `SELECT COUNT(*) AS c
       FROM renstra_sasaran rs
       JOIN renstra_tujuan rt ON rt.id = rs.tujuan_id
       JOIN sasaran s ON s.id = rs.rpjmd_sasaran_id
       WHERE rt.rpjmd_tujuan_id REGEXP '^[0-9]+$'
         AND s.tujuan_id IS NOT NULL
         AND s.tujuan_id <> CAST(rt.rpjmd_tujuan_id AS UNSIGNED)`,
    );
    checks.push(
      buildCheck({
        code: "MISMATCH_RENSTRA_SASARAN_TUJUAN_RPJMD",
        label: "Mismatch: Renstra Sasaran tidak sesuai Tujuan RPJMD (child-parent)",
        count,
        samples: [],
      }),
    );
  }

  if (has("renstra_strategi") && has("renstra_sasaran") && has("strategi")) {
    const count = await safeCount(
      sequelize,
      `SELECT COUNT(*) AS c
       FROM renstra_strategi rstr
       JOIN renstra_sasaran rs ON rs.id = rstr.sasaran_id
       JOIN strategi st ON st.id = rstr.rpjmd_strategi_id
       WHERE rs.rpjmd_sasaran_id IS NOT NULL
         AND st.sasaran_id IS NOT NULL
         AND st.sasaran_id <> rs.rpjmd_sasaran_id`,
    );
    checks.push(
      buildCheck({
        code: "MISMATCH_RENSTRA_STRATEGI_SASARAN_RPJMD",
        label: "Mismatch: Renstra Strategi tidak sesuai Sasaran RPJMD",
        count,
        samples: [],
      }),
    );
  }

  if (has("renstra_kebijakan") && has("renstra_strategi") && has("arah_kebijakan")) {
    const count = await safeCount(
      sequelize,
      `SELECT COUNT(*) AS c
       FROM renstra_kebijakan rk
       JOIN renstra_strategi rstr ON rstr.id = rk.strategi_id
       JOIN arah_kebijakan a ON a.id = rk.rpjmd_arah_id
       WHERE rstr.rpjmd_strategi_id IS NOT NULL
         AND a.strategi_id IS NOT NULL
         AND a.strategi_id <> rstr.rpjmd_strategi_id`,
    );
    checks.push(
      buildCheck({
        code: "MISMATCH_RENSTRA_KEBIJAKAN_STRATEGI_RPJMD",
        label: "Mismatch: Renstra Kebijakan tidak sesuai Strategi RPJMD",
        count,
        samples: [],
      }),
    );
  }

  // Renstra target details: duplicate + incomplete
  if (has("renstra_target_detail")) {
    const count = await safeCount(
      sequelize,
      `SELECT COUNT(*) AS c
       FROM (
         SELECT renstra_target_id, tahun, level, COUNT(*) AS c
         FROM renstra_target_detail
         GROUP BY renstra_target_id, tahun, level
         HAVING c > 1
       ) x`,
    );
    const sample = await safeSamples(
      sequelize,
      `SELECT renstra_target_id, tahun, level, COUNT(*) AS c
       FROM renstra_target_detail
       GROUP BY renstra_target_id, tahun, level
       HAVING c > 1`,
    );
    checks.push(
      buildCheck({
        code: "RENSTRA_TARGET_DETAIL_DUP",
        label: "Duplikasi renstra_target_detail (tahun+level)",
        severity: "error",
        count,
        samples: sample,
      }),
    );
  }

  if (has("renstra_target") && has("renstra_target_detail") && has("indikator_renstra") && has("renstra_opd")) {
    const count = await safeCount(
      sequelize,
      `SELECT COUNT(*) AS c
       FROM (
         SELECT
           rt.id,
           (ro.tahun_akhir - ro.tahun_mulai + 1) AS expected_years,
           COUNT(DISTINCT d.tahun) AS actual_years
         FROM renstra_target rt
         JOIN indikator_renstra ir ON ir.id = rt.indikator_id
         JOIN renstra_opd ro ON ro.id = ir.renstra_id
         LEFT JOIN renstra_target_detail d ON d.renstra_target_id = rt.id
         GROUP BY rt.id, expected_years
         HAVING expected_years BETWEEN 1 AND 10
            AND actual_years < expected_years
       ) x`,
    );
    checks.push(
      buildCheck({
        code: "RENSTRA_TARGET_DETAIL_INCOMPLETE",
        label: "Renstra target: details tahunan tidak lengkap",
        severity: "error",
        count,
        samples: [],
      }),
    );
  }

  // Mismatch rpjmd_tujuan_id type/content
  if (has("renstra_tujuan")) {
    const nonNumeric = await safeCount(
      sequelize,
      `SELECT COUNT(*) AS c
       FROM renstra_tujuan
       WHERE rpjmd_tujuan_id IS NOT NULL
         AND TRIM(rpjmd_tujuan_id) <> ''
         AND rpjmd_tujuan_id NOT REGEXP '^[0-9]+$'`,
    );
    checks.push(
      buildCheck({
        code: "RENSTRA_TUJUAN_RPJMD_TUJUAN_ID_NON_NUMERIC",
        label: "renstra_tujuan.rpjmd_tujuan_id non-numerik (indikasi mismatch tipe)",
        severity: "warning",
        count: nonNumeric,
        samples: [],
      }),
    );
  }

  if (has("renstra_tujuan") && has("tujuan")) {
    const missing = await safeCount(
      sequelize,
      `SELECT COUNT(*) AS c
       FROM renstra_tujuan rt
       LEFT JOIN tujuan t ON t.id = CAST(rt.rpjmd_tujuan_id AS UNSIGNED)
       WHERE rt.rpjmd_tujuan_id REGEXP '^[0-9]+$'
         AND t.id IS NULL`,
    );
    checks.push(
      buildCheck({
        code: "RENSTRA_TUJUAN_RPJMD_TUJUAN_ID_MISSING",
        label: "renstra_tujuan.rpjmd_tujuan_id numerik tapi tujuan RPJMD tidak ditemukan",
        severity: "error",
        count: missing,
        samples: [],
      }),
    );
  }

  const totals = checks.reduce(
    (acc, c) => {
      acc.total_issues += Number(c.count) || 0;
      if (c.severity === "error") acc.total_errors += Number(c.count) || 0;
      if (c.severity === "warning") acc.total_warnings += Number(c.count) || 0;
      return acc;
    },
    { total_issues: 0, total_errors: 0, total_warnings: 0 },
  );

  const total_orphan = checks
    .filter((c) => isOrphanCheck(c.code))
    .reduce((s, c) => s + (Number(c.count) || 0), 0);
  const total_missing_parent = total_orphan; // definisi Phase 1: orphan == missing parent
  const total_broken_chain = checks
    .filter((c) => isBrokenChainCheck(c.code))
    .reduce((s, c) => s + (Number(c.count) || 0), 0);

  const byCode = Object.fromEntries(checks.map((c) => [c.code, Number(c.count) || 0]));
  const safeSub = (a, b) => (a == null ? null : Math.max(0, Number(a) - Number(b || 0)));

  const total_program = metrics.total_program ?? null;
  const program_valid_min =
    total_program == null
      ? null
      : Math.max(
          0,
          Number(total_program) -
            (byCode.ORPHAN_PROGRAM_SASARAN || 0) -
            (byCode.PROGRAM_NO_ARAH_KEBIJAKAN || 0),
        );

  const total_renstra_target = metrics.total_renstra_target ?? null;
  const renstra_target_complete_min =
    total_renstra_target == null
      ? null
      : safeSub(total_renstra_target, byCode.RENSTRA_TARGET_DETAIL_INCOMPLETE || 0);

  // Total "valid" tidak bisa dihitung presisi tanpa dedupe lintas check.
  // Berikan minimal metrics yang deterministik + transparan.
  const meta = {
    note:
      "Angka total_issues adalah penjumlahan per-check (bisa double count bila 1 record melanggar beberapa aturan).",
  };

  return {
    scanned_at: new Date().toISOString(),
    summary: {
      // "valid_min" = perhitungan minimal (konservatif) berbasis pengurangan beberapa check utama.
      total_data_valid: {
        program_valid_min,
        renstra_target_complete_min,
      },
      total_orphan,
      total_missing_parent,
      total_broken_chain,
      recommendation_top: topRecommendations(checks, 5),
    },
    totals,
    metrics,
    checks,
    meta,
  };
}

module.exports = {
  runCascadingGapAudit,
};
