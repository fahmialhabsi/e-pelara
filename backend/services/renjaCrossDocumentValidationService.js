"use strict";

const {
  normalizeText,
  diceSimilarity,
  deviationPct,
  resolveThresholdConfig,
} = require("./renjaThresholdMismatchService");
const { enrichRuleRegistry } = require("./renjaGovernanceSeverityService");

const RENJA_CROSS_DOCUMENT_RULES = [
  {
    code: "RENSTRA_PROGRAM_EXISTS_IN_RKPD",
    description: "Program RENSTRA relevan harus punya padanan di RKPD.",
    severity: "warning",
    is_blocking: false,
    scope: "document",
    source_type: "IRISAN",
  },
  {
    code: "RKPD_PROGRAM_EXISTS_IN_RENJA",
    description: "Program/item RKPD prioritas harus masuk RENJA.",
    severity: "warning",
    is_blocking: false,
    scope: "document",
    source_type: "RKPD",
  },
  {
    code: "RENSTRA_RENJA_PROGRAM_ALIGNED",
    description: "Program RENJA harus aligned dengan program RENSTRA sumber.",
    severity: "error",
    is_blocking: true,
    scope: "item",
    source_type: "RENSTRA",
  },
  {
    code: "RENSTRA_RKPD_TARGET_ALIGNED",
    description: "Target RENSTRA dan RKPD harus konsisten.",
    severity: "warning",
    is_blocking: false,
    scope: "item",
    source_type: "IRISAN",
  },
  {
    code: "RKPD_RENJA_TARGET_ALIGNED",
    description: "Target RKPD dan RENJA harus konsisten.",
    severity: "warning",
    is_blocking: false,
    scope: "item",
    source_type: "RKPD",
  },
  {
    code: "REQUIRED_RKPD_ITEMS_NOT_PULLED",
    description: "Item RKPD prioritas belum ditarik ke RENJA.",
    severity: "warning",
    is_blocking: false,
    scope: "document",
    source_type: "RKPD",
  },
  {
    code: "REQUIRED_RENSTRA_ITEMS_NOT_PULLED",
    description: "Item RENSTRA wajib belum dipertimbangkan di RENJA.",
    severity: "warning",
    is_blocking: false,
    scope: "document",
    source_type: "RENSTRA",
  },
  {
    code: "POLICY_CHAIN_EXISTS",
    description: "Item harus dapat ditelusuri dalam chain kebijakan.",
    severity: "error",
    is_blocking: true,
    scope: "item",
    source_type: "RENSTRA",
  },
  {
    code: "POLICY_CHAIN_CONSISTENT",
    description: "Chain kebijakan harus konsisten secara parent-child.",
    severity: "error",
    is_blocking: true,
    scope: "item",
    source_type: "RENSTRA",
  },
];

const CROSS_DOCUMENT_MATRIX_SQL = `
SELECT
  rd.id AS renja_dokumen_id,
  ri.id AS renja_item_id,
  ri.source_mode,
  ri.source_renstra_program_id,
  ri.source_rkpd_item_id,
  ri.program_id,
  ri.program AS renja_program,
  ri.target_numerik AS renja_target,
  ri.pagu_indikatif AS renja_pagu,
  rp.kode_program AS renstra_kode_program,
  rp.nama_program AS renstra_program,
  rp.rpjmd_program_id AS renstra_program_id,
  rk.id AS rkpd_item_id,
  rk.program AS rkpd_program,
  rk.target AS rkpd_target,
  rk.pagu AS rkpd_pagu
FROM renja_dokumen rd
LEFT JOIN renja_item ri ON ri.renja_dokumen_id = rd.id
LEFT JOIN renstra_program rp ON rp.id = ri.source_renstra_program_id
LEFT JOIN rkpd_item rk ON rk.id = ri.source_rkpd_item_id
WHERE rd.id = :renjaDokumenId
ORDER BY ri.urutan ASC, ri.id ASC
`;

function mapRuleIssue({
  code,
  message,
  severity = "warning",
  is_blocking = false,
  scope = "document",
  source_type = "INTERNAL",
  field_name = null,
  expected_value = null,
  actual_value = null,
  related_item_id = null,
  related_source_id = null,
  hierarchy_level = scope === "document" ? "document" : "program",
  document_pair = "RENSTRA-RKPD-RENJA",
  threshold_context = null,
}) {
  return {
    mismatch_code: code,
    mismatch_label: code,
    mismatch_scope: scope,
    source_type,
    severity,
    is_blocking,
    message,
    recommendation: "Lakukan sinkronisasi lintas dokumen agar konsisten.",
    field_name,
    expected_value: expected_value == null ? null : String(expected_value),
    actual_value: actual_value == null ? null : String(actual_value),
    related_item_id,
    related_source_id,
    hierarchy_level,
    document_pair,
    threshold_context,
  };
}

function isProgramMatched(renstraProgram, rkpdProgramText = "") {
  const kode = normalizeText(renstraProgram?.kode_program);
  const nama = normalizeText(renstraProgram?.nama_program);
  const rkpd = normalizeText(rkpdProgramText);
  if (!rkpd) return false;
  if (kode && rkpd.includes(kode)) return true;
  if (nama && rkpd === nama) return true;
  const sim = diceSimilarity(nama, rkpd);
  return sim >= 0.75;
}

async function getRkpdAlignmentByRenjaItem(db, renjaItemId) {
  const { sequelize } = db;
  const sql = `
    SELECT
      ri.id AS renja_item_id,
      ri.source_rkpd_item_id,
      rk.id AS rkpd_item_id,
      rk.program AS rkpd_program,
      rk.kegiatan AS rkpd_kegiatan,
      rk.sub_kegiatan AS rkpd_sub_kegiatan,
      rk.target AS rkpd_target,
      rk.pagu AS rkpd_pagu
    FROM renja_item ri
    LEFT JOIN rkpd_item rk ON rk.id = ri.source_rkpd_item_id
    WHERE ri.id = :renjaItemId
    LIMIT 1
  `;
  return sequelize.query(sql, {
    replacements: { renjaItemId: Number(renjaItemId) },
    type: db.Sequelize.QueryTypes.SELECT,
    plain: true,
  });
}

async function getCrossDocumentComparisonMatrix(db, renjaDokumenId, opts = {}) {
  const {
    RenjaDokumen,
    RenjaItem,
    RenstraProgram,
    RkpdItem,
    RenstraTabelProgram,
    sequelize,
  } = db;

  const tx = opts.transaction || undefined;
  const q = tx ? { transaction: tx } : {};

  const doc = await RenjaDokumen.findByPk(renjaDokumenId, q);
  if (!doc) throw new Error("Dokumen RENJA tidak ditemukan.");

  const hasRenstraTabelProgram =
    !!RenstraTabelProgram && typeof RenstraTabelProgram.findAll === "function";

  const [rowsRaw, renstraPrograms, rkpdItems, renjaItems, renstraTargetRows] = await Promise.all([
    sequelize
      .query(CROSS_DOCUMENT_MATRIX_SQL, {
        replacements: { renjaDokumenId: Number(renjaDokumenId) },
        type: db.Sequelize.QueryTypes.SELECT,
        transaction: tx,
      })
      .catch(() => []),
    doc.renstra_pd_dokumen_id
      ? RenstraProgram.findAll({
          where: { renstra_id: doc.renstra_pd_dokumen_id },
          attributes: ["id", "kode_program", "nama_program", "rpjmd_program_id"],
          raw: true,
          limit: 5000,
          ...q,
        })
      : [],
    doc.rkpd_dokumen_id
      ? RkpdItem.findAll({
          where: { rkpd_dokumen_id: doc.rkpd_dokumen_id },
          raw: true,
          limit: 10000,
          ...q,
        })
      : [],
    RenjaItem.findAll({ where: { renja_dokumen_id: renjaDokumenId }, raw: true, limit: 10000, ...q }),
    doc.renstra_pd_dokumen_id && hasRenstraTabelProgram
      ? RenstraTabelProgram.findAll({
          include: [
            {
              model: RenstraProgram,
              as: "program",
              required: true,
              where: { renstra_id: doc.renstra_pd_dokumen_id },
              attributes: ["id"],
            },
          ],
          attributes: ["program_id", "target_akhir_renstra", "pagu_akhir_renstra"],
          raw: true,
          limit: 5000,
          ...q,
        })
      : [],
  ]);

  const rows = Array.isArray(rowsRaw) && rowsRaw.length ? rowsRaw : [];

  const renstraTargetByProgramId = new Map();
  for (const r of renstraTargetRows) {
    const pid = Number(r.program_id || r["program.id"]);
    if (!pid || renstraTargetByProgramId.has(pid)) continue;
    renstraTargetByProgramId.set(pid, {
      target: Number(r.target_akhir_renstra || 0),
      pagu: Number(r.pagu_akhir_renstra || 0),
    });
  }

  const matrixRows =
    rows.length > 0
      ? rows
      : renjaItems.map((ri) => {
          const rp = renstraPrograms.find((x) => Number(x.id) === Number(ri.source_renstra_program_id));
          const rk = rkpdItems.find((x) => Number(x.id) === Number(ri.source_rkpd_item_id));
          return {
            renja_dokumen_id: doc.id,
            renja_item_id: ri.id,
            source_mode: ri.source_mode,
            source_renstra_program_id: ri.source_renstra_program_id,
            source_rkpd_item_id: ri.source_rkpd_item_id,
            program_id: ri.program_id,
            renja_program: ri.program,
            renja_target: ri.target_numerik,
            renja_pagu: ri.pagu_indikatif,
            renstra_kode_program: rp?.kode_program || null,
            renstra_program: rp?.nama_program || null,
            renstra_program_id: rp?.rpjmd_program_id || null,
            rkpd_item_id: rk?.id || null,
            rkpd_program: rk?.program || null,
            rkpd_target: rk?.target || null,
            rkpd_pagu: rk?.pagu || null,
          };
        });

  return {
    doc,
    matrix_rows: matrixRows,
    renstra_programs: renstraPrograms,
    rkpd_items: rkpdItems,
    renja_items: renjaItems,
    renstra_target_by_program_id: renstraTargetByProgramId,
  };
}

async function getCrossDocumentComparisonMatrixSequelize(db, renjaDokumenId) {
  const { RenjaDokumen, RenjaItem, RenstraProgram, RkpdItem } = db;
  const doc = await RenjaDokumen.findByPk(renjaDokumenId);
  if (!doc) throw new Error("Dokumen RENJA tidak ditemukan.");

  const renjaItems = await RenjaItem.findAll({
    where: { renja_dokumen_id: Number(renjaDokumenId) },
    raw: true,
    limit: 10000,
  });

  const [renstraPrograms, rkpdItems] = await Promise.all([
    doc.renstra_pd_dokumen_id
      ? RenstraProgram.findAll({
          where: { renstra_id: doc.renstra_pd_dokumen_id },
          raw: true,
          limit: 5000,
        })
      : [],
    doc.rkpd_dokumen_id
      ? RkpdItem.findAll({
          where: { rkpd_dokumen_id: doc.rkpd_dokumen_id },
          raw: true,
          limit: 10000,
        })
      : [],
  ]);

  const renstraById = new Map(renstraPrograms.map((x) => [Number(x.id), x]));
  const rkpdById = new Map(rkpdItems.map((x) => [Number(x.id), x]));
  const matrixRows = renjaItems.map((ri) => {
    const rp = renstraById.get(Number(ri.source_renstra_program_id));
    const rk = rkpdById.get(Number(ri.source_rkpd_item_id));
    return {
      renja_dokumen_id: doc.id,
      renja_item_id: ri.id,
      source_mode: ri.source_mode,
      source_renstra_program_id: ri.source_renstra_program_id,
      source_rkpd_item_id: ri.source_rkpd_item_id,
      program_id: ri.program_id,
      renja_program: ri.program,
      renja_target: ri.target_numerik,
      renja_pagu: ri.pagu_indikatif,
      renstra_kode_program: rp?.kode_program || null,
      renstra_program: rp?.nama_program || null,
      renstra_program_id: rp?.rpjmd_program_id || null,
      rkpd_item_id: rk?.id || null,
      rkpd_program: rk?.program || null,
      rkpd_target: rk?.target || null,
      rkpd_pagu: rk?.pagu || null,
    };
  });

  return {
    doc,
    matrix_rows: matrixRows,
    renstra_programs: renstraPrograms,
    rkpd_items: rkpdItems,
    renja_items: renjaItems,
    renstra_target_by_program_id: new Map(),
  };
}

function evaluateCrossDocumentRules(matrix, thresholds = {}) {
  const cfg = resolveThresholdConfig(thresholds);
  const issues = [];
  const renstraPrograms = matrix.renstra_programs || [];
  const rkpdItems = matrix.rkpd_items || [];
  const renjaItems = matrix.renja_items || [];

  // Rule: RENSTRA_PROGRAM_EXISTS_IN_RKPD
  const renstraMissingInRkpd = renstraPrograms.filter(
    (rp) => !rkpdItems.some((rk) => isProgramMatched(rp, rk.program)),
  );
  if (renstraMissingInRkpd.length > 0) {
    issues.push(
      mapRuleIssue({
        code: "RENSTRA_PROGRAM_EXISTS_IN_RKPD",
        message: `${renstraMissingInRkpd.length} program RENSTRA belum ditemukan padanannya di RKPD.`,
        scope: "document",
        source_type: "IRISAN",
        document_pair: "RENSTRA-RKPD",
        hierarchy_level: "program",
        expected_value: renstraPrograms.length,
        actual_value: renstraPrograms.length - renstraMissingInRkpd.length,
      }),
    );
  }

  const pulledRkpdIds = new Set(renjaItems.map((x) => Number(x.source_rkpd_item_id)).filter(Boolean));
  const rkpdMissingInRenja = rkpdItems.filter((rk) => !pulledRkpdIds.has(Number(rk.id)));
  if (rkpdMissingInRenja.length > 0) {
    issues.push(
      mapRuleIssue({
        code: "RKPD_PROGRAM_EXISTS_IN_RENJA",
        message: `${rkpdMissingInRenja.length} item RKPD belum memiliki padanan di RENJA.`,
        scope: "document",
        source_type: "RKPD",
        document_pair: "RKPD-RENJA",
        hierarchy_level: "program",
        expected_value: rkpdItems.length,
        actual_value: rkpdItems.length - rkpdMissingInRenja.length,
      }),
    );
    issues.push(
      mapRuleIssue({
        code: "REQUIRED_RKPD_ITEMS_NOT_PULLED",
        message: `${rkpdMissingInRenja.length} item RKPD prioritas belum ditarik ke RENJA.`,
        scope: "document",
        source_type: "RKPD",
        document_pair: "RKPD-RENJA",
        hierarchy_level: "sub_kegiatan",
      }),
    );
  }

  const pulledRenstraProgramIds = new Set(renjaItems.map((x) => Number(x.source_renstra_program_id)).filter(Boolean));
  const renstraMissingInRenja = renstraPrograms.filter((rp) => !pulledRenstraProgramIds.has(Number(rp.id)));
  if (renstraMissingInRenja.length > 0) {
    issues.push(
      mapRuleIssue({
        code: "REQUIRED_RENSTRA_ITEMS_NOT_PULLED",
        message: `${renstraMissingInRenja.length} program/item RENSTRA belum masuk RENJA.`,
        scope: "document",
        source_type: "RENSTRA",
        document_pair: "RENSTRA-RENJA",
        hierarchy_level: "program",
      }),
    );
  }

  // Item level rules
  for (const item of renjaItems) {
    const mode = String(item.source_mode || "MANUAL").toUpperCase();
    const sourceProgram = item.source_renstra_program_id
      ? renstraPrograms.find((x) => Number(x.id) === Number(item.source_renstra_program_id))
      : null;
    const rkpd = item.source_rkpd_item_id
      ? rkpdItems.find((x) => Number(x.id) === Number(item.source_rkpd_item_id))
      : null;

    if ((mode === "RENSTRA" || mode === "IRISAN") && !sourceProgram) {
      issues.push(
        mapRuleIssue({
          code: "POLICY_CHAIN_EXISTS",
          severity: "error",
          is_blocking: true,
          scope: "item",
          source_type: "RENSTRA",
          document_pair: "RENSTRA-RENJA",
          hierarchy_level: "program",
          related_item_id: item.id,
          message: "Item RENJA tidak dapat ditelusuri ke program RENSTRA sumber.",
        }),
      );
    }

    if (sourceProgram && item.program_id && sourceProgram.rpjmd_program_id) {
      if (Number(item.program_id) !== Number(sourceProgram.rpjmd_program_id)) {
        issues.push(
          mapRuleIssue({
            code: "RENSTRA_RENJA_PROGRAM_ALIGNED",
            severity: "error",
            is_blocking: true,
            scope: "item",
            source_type: "RENSTRA",
            document_pair: "RENSTRA-RENJA",
            hierarchy_level: "program",
            field_name: "program_id",
            expected_value: sourceProgram.rpjmd_program_id,
            actual_value: item.program_id,
            related_item_id: item.id,
            related_source_id: sourceProgram.id,
            message: "Program item RENJA tidak aligned dengan program RENSTRA sumber.",
          }),
        );
        issues.push(
          mapRuleIssue({
            code: "POLICY_CHAIN_CONSISTENT",
            severity: "error",
            is_blocking: true,
            scope: "item",
            source_type: "RENSTRA",
            document_pair: "RENSTRA-RENJA",
            hierarchy_level: "program",
            field_name: "program_id",
            expected_value: sourceProgram.rpjmd_program_id,
            actual_value: item.program_id,
            related_item_id: item.id,
            related_source_id: sourceProgram.id,
            message: "Program aktual tidak konsisten dengan chain policy yang diharapkan.",
          }),
        );
      }
    }

    if (sourceProgram && rkpd) {
      const renstraRef = matrix.renstra_target_by_program_id.get(Number(sourceProgram.id));
      const rkpdTarget = Number(rkpd.target || 0);
      const renstraTarget = Number(renstraRef?.target || 0);
      if (renstraTarget > 0 && rkpdTarget > 0) {
        const dev = deviationPct(renstraTarget, rkpdTarget);
        if (dev > cfg.target_warning_threshold_pct) {
          const sev = dev > cfg.target_error_threshold_pct ? "error" : "warning";
          issues.push(
            mapRuleIssue({
              code: "RENSTRA_RKPD_TARGET_ALIGNED",
              severity: sev,
              is_blocking: sev === "error",
              scope: "item",
              source_type: "IRISAN",
              document_pair: "RENSTRA-RKPD",
              hierarchy_level: "program",
              field_name: "target_numerik",
              expected_value: renstraTarget,
              actual_value: rkpdTarget,
              related_item_id: item.id,
              related_source_id: rkpd.id,
              threshold_context: {
                metric: "target_numerik",
                method: "percentage_deviation",
                deviation_pct: Number((dev * 100).toFixed(2)),
                warning_threshold_pct: Number((cfg.target_warning_threshold_pct * 100).toFixed(2)),
                error_threshold_pct: Number((cfg.target_error_threshold_pct * 100).toFixed(2)),
              },
              message: "Target antara RENSTRA dan RKPD tidak konsisten pada chain item ini.",
            }),
          );
        }
      }
    }

    if (rkpd) {
      const targetRenja = Number(item.target_numerik ?? item.target ?? 0);
      const targetRkpd = Number(rkpd.target || 0);
      if (targetRenja > 0 && targetRkpd > 0) {
        const dev = deviationPct(targetRkpd, targetRenja);
        if (dev > cfg.target_warning_threshold_pct) {
          const sev = dev > cfg.target_error_threshold_pct ? "error" : "warning";
          issues.push(
            mapRuleIssue({
              code: "RKPD_RENJA_TARGET_ALIGNED",
              severity: sev,
              is_blocking: sev === "error",
              scope: "item",
              source_type: "RKPD",
              document_pair: "RKPD-RENJA",
              hierarchy_level: "sub_kegiatan",
              field_name: "target_numerik",
              expected_value: targetRkpd,
              actual_value: targetRenja,
              related_item_id: item.id,
              related_source_id: rkpd.id,
              threshold_context: {
                metric: "target_numerik",
                method: "percentage_deviation",
                deviation_pct: Number((dev * 100).toFixed(2)),
                warning_threshold_pct: Number((cfg.target_warning_threshold_pct * 100).toFixed(2)),
                error_threshold_pct: Number((cfg.target_error_threshold_pct * 100).toFixed(2)),
              },
              message: "Target antara RKPD dan RENJA tidak konsisten pada item ini.",
            }),
          );
        }
      }
    }
  }

  return issues;
}

module.exports = {
  RENJA_CROSS_DOCUMENT_RULES: enrichRuleRegistry(RENJA_CROSS_DOCUMENT_RULES),
  CROSS_DOCUMENT_MATRIX_SQL,
  getRkpdAlignmentByRenjaItem,
  getCrossDocumentComparisonMatrix,
  getCrossDocumentComparisonMatrixSequelize,
  evaluateCrossDocumentRules,
  mapRuleIssue,
  isProgramMatched,
};
