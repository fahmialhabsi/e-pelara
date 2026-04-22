"use strict";

const { deriveProgramIdFromItem, resolvePolicyConflict } = require("../utils/policyChainMatcher");
const { buildConfidence } = require("../utils/confidenceScoring");
const policyAlignmentSvc = require("./renjaPolicyAlignmentService");

const SQL_POLICY_CONFLICT_DETECTION = `
SELECT
  pak.program_id,
  COUNT(DISTINCT pak.arah_kebijakan_id) AS arah_count
FROM program_arah_kebijakan pak
GROUP BY pak.program_id
HAVING COUNT(DISTINCT pak.arah_kebijakan_id) > 1
`;

const SQL_POLICY_CONFLICT_CANDIDATES = `
SELECT
  pak.program_id,
  pak.arah_kebijakan_id,
  pak.strategi_id,
  ak.deskripsi AS arah_kebijakan_nama,
  s.deskripsi AS strategi_nama
FROM program_arah_kebijakan pak
LEFT JOIN arah_kebijakan ak ON ak.id = pak.arah_kebijakan_id
LEFT JOIN strategi s ON s.id = pak.strategi_id
WHERE pak.program_id = :programId
ORDER BY pak.arah_kebijakan_id ASC
`;

async function generatePolicyConflictSuggestions(db, renjaDokumenId) {
  const { RenjaItem, RenstraProgram, sequelize, Sequelize } = db;
  const items = await RenjaItem.findAll({
    where: { renja_dokumen_id: Number(renjaDokumenId) },
    raw: true,
  });

  const results = [];
  for (const item of items) {
    const renstraProgram = item.source_renstra_program_id
      ? await RenstraProgram.findByPk(item.source_renstra_program_id, { raw: true })
      : null;
    const programId = deriveProgramIdFromItem(item, renstraProgram);
    if (!programId) continue;

    const candidates = await sequelize.query(SQL_POLICY_CONFLICT_CANDIDATES, {
      replacements: { programId: Number(programId) },
      type: Sequelize.QueryTypes.SELECT,
    });
    if (!candidates.length) continue;

    const expectedChain = item.source_renstra_program_id
      ? await policyAlignmentSvc.getExpectedPolicyChainFromRenstraProgram(db, item.source_renstra_program_id)
      : null;
    const resolve = resolvePolicyConflict(candidates, {
      expected_strategi_id: expectedChain?.strategi_id || null,
    });

    const scoreBase = resolve.resolution_mode === "auto_selected" ? 0.9 : 0.45;
    const confidence = buildConfidence(scoreBase);

    results.push({
      renja_item_id: Number(item.id),
      suggestion_type: "policy_conflict",
      suggested_entity_type: "arah_kebijakan",
      suggested_entity_id: resolve.selected_arah_kebijakan_id || null,
      suggested_match_type:
        resolve.resolution_mode === "auto_selected" ? "policy_chain_assisted" : "manual_required",
      suggestion_score: confidence.score,
      suggestion_confidence: confidence.confidence,
      suggestion_reason: resolve.conflict_reason,
      is_conflict: Boolean(resolve.conflict_detected),
      conflict_reason: resolve.conflict_reason,
      resolution_mode: resolve.resolution_mode,
      can_auto_apply: resolve.resolution_mode === "auto_selected",
      source_context_json: {
        program_id: Number(programId),
        candidate_arah_kebijakan: candidates,
      },
      suggested_policy_chain_trace: {
        expected: expectedChain || null,
        selected_arah_kebijakan_id: resolve.selected_arah_kebijakan_id || null,
        selected_strategi_id: resolve.selected_strategi_id || null,
      },
      suggestion_payload_json: {
        conflict_detected: resolve.conflict_detected,
        candidate_arah_kebijakan: candidates,
        selected_arah_kebijakan_id: resolve.selected_arah_kebijakan_id || null,
        selected_strategi_id: resolve.selected_strategi_id || null,
        conflict_reason: resolve.conflict_reason,
        resolution_mode: resolve.resolution_mode,
      },
    });
  }

  return results;
}

module.exports = {
  SQL_POLICY_CONFLICT_DETECTION,
  SQL_POLICY_CONFLICT_CANDIDATES,
  generatePolicyConflictSuggestions,
};

