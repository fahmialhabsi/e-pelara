"use strict";

const { Op } = require("sequelize");
const { normalizeName } = require("../utils/nameNormalizer");
const { blendedNameSimilarity } = require("../utils/stringSimilarity");
const { buildConfidence } = require("../utils/confidenceScoring");

const SQL_INDIKATOR_MAPPING_CANDIDATES = `
SELECT
  ri.id AS renja_item_id,
  ri.indikator AS renja_indikator,
  ri.satuan AS renja_satuan,
  ir.id AS indikator_renstra_id,
  ir.stage,
  ir.ref_id,
  ir.nama_indikator,
  ir.satuan,
  ir.target_tahun_1,
  ir.target_tahun_2,
  ir.target_tahun_3,
  ir.target_tahun_4,
  ir.target_tahun_5,
  ir.target_tahun_6
FROM renja_item ri
JOIN renja_dokumen rd ON rd.id = ri.renja_dokumen_id
LEFT JOIN indikator_renstra ir ON ir.renstra_id = rd.renstra_pd_dokumen_id
WHERE ri.renja_dokumen_id = :renjaDokumenId
`;

function pickFirstTarget(indikator = {}) {
  const keys = [
    "target_tahun_1",
    "target_tahun_2",
    "target_tahun_3",
    "target_tahun_4",
    "target_tahun_5",
    "target_tahun_6",
  ];
  for (const k of keys) {
    const v = indikator?.[k];
    if (v !== null && v !== undefined && String(v).trim() !== "") return String(v).trim();
  }
  return null;
}

function evaluateIndicatorCandidate(item, indikator) {
  const renjaNameRaw = String(item.indikator || "").trim();
  const candNameRaw = String(indikator.nama_indikator || "").trim();
  const renjaNorm = normalizeName(renjaNameRaw);
  const candNorm = normalizeName(candNameRaw);
  const renjaSatuan = String(item.satuan || "").trim().toLowerCase();
  const candSatuan = String(indikator.satuan || "").trim().toLowerCase();

  if (!renjaNameRaw || !candNameRaw) {
    return { score: 0.2, match_type: "manual_required", reason: "Nama indikator tidak cukup." };
  }

  if (renjaNameRaw.toLowerCase() === candNameRaw.toLowerCase()) {
    const satuanBonus = renjaSatuan && candSatuan && renjaSatuan === candSatuan ? 0.03 : 0;
    return {
      score: 0.96 + satuanBonus,
      match_type: "name_exact",
      reason: "Nama indikator identik.",
    };
  }

  if (renjaNorm && candNorm && renjaNorm === candNorm) {
    const satuanBonus = renjaSatuan && candSatuan && renjaSatuan === candSatuan ? 0.04 : 0;
    return {
      score: 0.88 + satuanBonus,
      match_type: "normalized_name",
      reason: "Nama indikator normalisasi identik.",
    };
  }

  const sim = blendedNameSimilarity(renjaNameRaw, candNameRaw);
  const satuanBonus = renjaSatuan && candSatuan && renjaSatuan === candSatuan ? 0.05 : 0;
  return {
    score: (sim * 0.84) + satuanBonus,
    match_type: "fuzzy_name",
    reason: `Similarity indikator ${Number(sim).toFixed(4)}.`,
  };
}

function buildIndicatorSuggestion(item, bestPick, topCandidates = []) {
  if (!bestPick) {
    return {
      renja_item_id: Number(item.id),
      suggestion_type: "indicator_mapping",
      suggested_match_type: "manual_required",
      suggestion_score: 0.2,
      suggestion_confidence: "LOW",
      suggestion_reason: "Tidak ditemukan kandidat indikator yang memadai.",
      can_auto_apply: false,
      source_context_json: {
        renja_item: {
          indikator: item.indikator,
          satuan: item.satuan,
        },
      },
      suggestion_payload_json: { indicator_manual_mapping_required: true },
    };
  }

  const conf = buildConfidence(bestPick.match_score);
  const second = topCandidates?.[1];
  const isConflict =
    Boolean(second) &&
    Number(bestPick.match_score || 0) >= 0.75 &&
    Number(second.match_score || 0) >= 0.75 &&
    Math.abs(Number(bestPick.match_score || 0) - Number(second.match_score || 0)) <= 0.04;

  return {
    renja_item_id: Number(item.id),
    suggestion_type: "indicator_mapping",
    suggested_entity_type: "indikator_renstra",
    suggested_entity_id: Number(bestPick.indikator_renstra_id),
    suggested_source_indikator_renstra_id: Number(bestPick.indikator_renstra_id),
    suggested_match_type: bestPick.match_type,
    suggestion_score: conf.score,
    suggestion_confidence: conf.confidence,
    can_auto_apply: conf.can_auto_apply && !isConflict,
    suggestion_reason: bestPick.reason,
    is_conflict: isConflict,
    conflict_reason: isConflict ? "Lebih dari satu kandidat indikator kuat." : null,
    suggested_satuan: bestPick.satuan || null,
    source_context_json: {
      renja_item: {
        indikator: item.indikator,
        satuan: item.satuan,
      },
      top_candidates: topCandidates,
    },
    suggestion_payload_json: {
      suggested_target_source: pickFirstTarget(bestPick) ? "RENSTRA" : "NONE",
      suggested_target_value: pickFirstTarget(bestPick),
      suggested_indicator_match_score: conf.score,
      suggested_indicator_match_type: bestPick.match_type,
      suggested_indicator_reason: bestPick.reason,
    },
  };
}

async function generateIndicatorSuggestions(db, renjaDokumenId, opts = {}) {
  const { RenjaDokumen, RenjaItem, IndikatorRenstra } = db;
  const includeMapped = Boolean(opts.includeMapped);

  const doc = await RenjaDokumen.findByPk(renjaDokumenId);
  if (!doc) throw new Error("Dokumen RENJA tidak ditemukan.");

  const where = { renja_dokumen_id: Number(renjaDokumenId) };
  if (!includeMapped) where.source_indikator_renstra_id = null;
  const items = await RenjaItem.findAll({ where, raw: true, order: [["id", "ASC"]] });

  const allRenstraIndicators = await IndikatorRenstra.findAll({
    where: { renstra_id: Number(doc.renstra_pd_dokumen_id) },
    raw: true,
  });

  const results = [];
  for (const item of items) {
    let scoped = [];
    if (item.source_renstra_subkegiatan_id) {
      scoped = allRenstraIndicators.filter(
        (x) => x.stage === "sub_kegiatan" && Number(x.ref_id) === Number(item.source_renstra_subkegiatan_id),
      );
    }
    if (!scoped.length && item.source_renstra_kegiatan_id) {
      scoped = allRenstraIndicators.filter(
        (x) => x.stage === "kegiatan" && Number(x.ref_id) === Number(item.source_renstra_kegiatan_id),
      );
    }
    if (!scoped.length && item.source_renstra_program_id) {
      scoped = allRenstraIndicators.filter(
        (x) => x.stage === "program" && Number(x.ref_id) === Number(item.source_renstra_program_id),
      );
    }
    if (!scoped.length) scoped = allRenstraIndicators;

    const candidates = scoped
      .map((ind) => {
        const evalResult = evaluateIndicatorCandidate(item, ind);
        return {
          ...ind,
          indikator_renstra_id: Number(ind.id),
          match_score: Number(Number(evalResult.score || 0).toFixed(4)),
          match_type: evalResult.match_type,
          reason: evalResult.reason,
        };
      })
      .sort((a, b) => Number(b.match_score || 0) - Number(a.match_score || 0));

    const best = candidates.length ? candidates[0] : null;
    results.push(buildIndicatorSuggestion(item, best, candidates.slice(0, 3)));
  }

  return results;
}

module.exports = {
  SQL_INDIKATOR_MAPPING_CANDIDATES,
  evaluateIndicatorCandidate,
  pickFirstTarget,
  generateIndicatorSuggestions,
};

