"use strict";

const { Op } = require("sequelize");
const { normalizeName, normalizeCode } = require("../utils/nameNormalizer");
const { blendedNameSimilarity } = require("../utils/stringSimilarity");
const { buildConfidence } = require("../utils/confidenceScoring");

const SQL_RENJA_RENSTRA_MAPPING_CANDIDATES = `
SELECT
  ri.id AS renja_item_id,
  ri.kode_program AS renja_kode_program,
  ri.program AS renja_program,
  rp.id AS renstra_program_id,
  rp.kode_program AS renstra_kode_program,
  rp.nama_program AS renstra_nama_program,
  rp.rpjmd_program_id
FROM renja_item ri
JOIN renja_dokumen rd ON rd.id = ri.renja_dokumen_id
LEFT JOIN renstra_program rp ON rp.renstra_id = rd.renstra_pd_dokumen_id
WHERE ri.renja_dokumen_id = :renjaDokumenId
`;

const SQL_RENSTRA_KEGIATAN_CANDIDATES = `
SELECT
  rk.id,
  rk.program_id,
  rk.kode_kegiatan,
  rk.nama_kegiatan
FROM renstra_kegiatan rk
WHERE rk.program_id = :renstraProgramId
`;

const SQL_RENSTRA_SUBKEGIATAN_CANDIDATES = `
SELECT
  rs.id,
  rs.kegiatan_id,
  rs.kode_sub_kegiatan,
  rs.nama_sub_kegiatan
FROM renstra_subkegiatan rs
WHERE rs.kegiatan_id = :renstraKegiatanId
`;

function buildMatch(method, score, reason, extra = {}) {
  return {
    method,
    score: Number(Number(score || 0).toFixed(4)),
    reason,
    ...extra,
  };
}

function evaluateCodeAndNameMatch({
  itemCode,
  itemName,
  candidateCode,
  candidateName,
  codeExactScore = 1,
  nameExactScore = 0.95,
  normalizedExactScore = 0.88,
  fuzzyMinGate = 0.45,
}) {
  const itemCodeNorm = normalizeCode(itemCode);
  const candCodeNorm = normalizeCode(candidateCode);
  const itemNameRaw = String(itemName || "").trim();
  const candNameRaw = String(candidateName || "").trim();
  const itemNameNorm = normalizeName(itemName);
  const candNameNorm = normalizeName(candidateName);

  if (itemCodeNorm && candCodeNorm && itemCodeNorm === candCodeNorm) {
    return buildMatch("code_exact", codeExactScore, "Kode identik");
  }

  if (itemNameRaw && candNameRaw && itemNameRaw.toLowerCase() === candNameRaw.toLowerCase()) {
    return buildMatch("name_exact", nameExactScore, "Nama identik");
  }

  if (itemNameNorm && candNameNorm && itemNameNorm === candNameNorm) {
    return buildMatch("normalized_name", normalizedExactScore, "Nama normalisasi identik");
  }

  const fuzzy = blendedNameSimilarity(itemNameRaw, candNameRaw);
  if (fuzzy >= fuzzyMinGate) {
    return buildMatch("fuzzy_name", fuzzy * 0.82, "Kemiripan nama fuzzy");
  }

  return buildMatch("manual_required", 0.2, "Tidak ada padanan kuat");
}

function pickBestCandidate(candidates = [], minScore = 0.4) {
  if (!Array.isArray(candidates) || !candidates.length) return null;
  const sorted = [...candidates].sort((a, b) => Number(b.match_score || 0) - Number(a.match_score || 0));
  const best = sorted[0];
  if (Number(best.match_score || 0) < minScore) return null;
  return {
    best,
    top_candidates: sorted.slice(0, 3),
  };
}

async function loadRenstraReference(db, renjaDokumenId) {
  const { RenjaDokumen, RenstraProgram, RenstraKegiatan, RenstraSubkegiatan } = db;
  const doc = await RenjaDokumen.findByPk(renjaDokumenId);
  if (!doc) throw new Error("Dokumen RENJA tidak ditemukan.");

  const renstraPrograms = await RenstraProgram.findAll({
    where: { renstra_id: doc.renstra_pd_dokumen_id },
    raw: true,
  });
  const programIds = renstraPrograms.map((x) => Number(x.id));
  const renstraKegiatan = programIds.length
    ? await RenstraKegiatan.findAll({
        where: { program_id: { [Op.in]: programIds } },
        raw: true,
      })
    : [];
  const kegiatanIds = renstraKegiatan.map((x) => Number(x.id));
  const renstraSub = kegiatanIds.length
    ? await RenstraSubkegiatan.findAll({
        where: { kegiatan_id: { [Op.in]: kegiatanIds } },
        raw: true,
      })
    : [];

  return {
    doc: doc.get ? doc.get({ plain: true }) : doc,
    renstraPrograms,
    renstraKegiatan,
    renstraSub,
  };
}

function suggestProgram(item, renstraPrograms = []) {
  const candidates = renstraPrograms.map((rp) => {
    const evalResult = evaluateCodeAndNameMatch({
      itemCode: item.kode_program,
      itemName: item.program,
      candidateCode: rp.kode_program,
      candidateName: rp.nama_program,
    });
    return {
      renstra_program_id: Number(rp.id),
      program_id: rp.rpjmd_program_id ? Number(rp.rpjmd_program_id) : null,
      match_type: evalResult.method,
      match_score: evalResult.score,
      reason: evalResult.reason,
      kode_program: rp.kode_program,
      nama_program: rp.nama_program,
    };
  });
  return pickBestCandidate(candidates, 0.45);
}

function suggestKegiatan(item, renstraKegiatan = []) {
  const candidates = renstraKegiatan.map((rk) => {
    const evalResult = evaluateCodeAndNameMatch({
      itemCode: item.kode_kegiatan,
      itemName: item.kegiatan,
      candidateCode: rk.kode_kegiatan,
      candidateName: rk.nama_kegiatan,
      codeExactScore: 0.96,
      nameExactScore: 0.9,
      normalizedExactScore: 0.84,
    });
    return {
      renstra_kegiatan_id: Number(rk.id),
      match_type: evalResult.method,
      match_score: evalResult.score,
      reason: evalResult.reason,
      kode_kegiatan: rk.kode_kegiatan,
      nama_kegiatan: rk.nama_kegiatan,
    };
  });
  return pickBestCandidate(candidates, 0.45);
}

function suggestSubKegiatan(item, renstraSub = []) {
  const candidates = renstraSub.map((rs) => {
    const evalResult = evaluateCodeAndNameMatch({
      itemCode: item.kode_sub_kegiatan,
      itemName: item.sub_kegiatan,
      candidateCode: rs.kode_sub_kegiatan,
      candidateName: rs.nama_sub_kegiatan,
      codeExactScore: 0.94,
      nameExactScore: 0.9,
      normalizedExactScore: 0.84,
    });
    return {
      renstra_subkegiatan_id: Number(rs.id),
      match_type: evalResult.method,
      match_score: evalResult.score,
      reason: evalResult.reason,
      kode_sub_kegiatan: rs.kode_sub_kegiatan,
      nama_sub_kegiatan: rs.nama_sub_kegiatan,
    };
  });
  return pickBestCandidate(candidates, 0.45);
}

function buildProgramSuggestionResult(item, programPick, kegiatanPick, subPick) {
  if (!programPick?.best) {
    return {
      renja_item_id: Number(item.id),
      suggestion_type: "mapping_program",
      suggested_match_type: "manual_required",
      suggestion_score: 0.2,
      suggestion_reason: "Item belum memiliki padanan RENSTRA yang cukup kuat.",
      source_context_json: {
        renja_item: {
          kode_program: item.kode_program,
          program: item.program,
          kode_kegiatan: item.kode_kegiatan,
          kegiatan: item.kegiatan,
          kode_sub_kegiatan: item.kode_sub_kegiatan,
          sub_kegiatan: item.sub_kegiatan,
        },
      },
    };
  }

  const baseScore = Number(programPick.best.match_score || 0);
  const bonusK = kegiatanPick?.best ? Number(kegiatanPick.best.match_score || 0) * 0.05 : 0;
  const bonusS = subPick?.best ? Number(subPick.best.match_score || 0) * 0.05 : 0;
  const finalScore = Math.min(0.9999, baseScore + bonusK + bonusS);
  const confidence = buildConfidence(finalScore);

  return {
    renja_item_id: Number(item.id),
    suggestion_type: "mapping_program",
    suggested_entity_type: "renstra_program",
    suggested_entity_id: Number(programPick.best.renstra_program_id),
    suggested_program_id: programPick.best.program_id || null,
    suggested_source_renstra_program_id: Number(programPick.best.renstra_program_id),
    suggested_source_renstra_kegiatan_id: kegiatanPick?.best?.renstra_kegiatan_id || null,
    suggested_source_renstra_subkegiatan_id: subPick?.best?.renstra_subkegiatan_id || null,
    suggested_match_type: programPick.best.match_type,
    suggestion_score: confidence.score,
    suggestion_confidence: confidence.confidence,
    can_auto_apply: confidence.can_auto_apply,
    suggestion_reason: [
      `Program: ${programPick.best.reason} (${programPick.best.match_type})`,
      kegiatanPick?.best ? `Kegiatan: ${kegiatanPick.best.reason}` : null,
      subPick?.best ? `Sub kegiatan: ${subPick.best.reason}` : null,
    ]
      .filter(Boolean)
      .join("; "),
    source_context_json: {
      renja_item: {
        id: Number(item.id),
        kode_program: item.kode_program,
        program: item.program,
        kode_kegiatan: item.kode_kegiatan,
        kegiatan: item.kegiatan,
        kode_sub_kegiatan: item.kode_sub_kegiatan,
        sub_kegiatan: item.sub_kegiatan,
      },
      program_candidates: programPick.top_candidates || [],
      kegiatan_candidates: kegiatanPick?.top_candidates || [],
      sub_kegiatan_candidates: subPick?.top_candidates || [],
    },
  };
}

async function generateProgramMappingSuggestions(db, renjaDokumenId, opts = {}) {
  const { RenjaItem } = db;
  const includeMapped = Boolean(opts.includeMapped);

  const { renstraPrograms, renstraKegiatan, renstraSub } = await loadRenstraReference(db, renjaDokumenId);
  const where = {
    renja_dokumen_id: Number(renjaDokumenId),
  };
  if (!includeMapped) {
    where[Op.or] = [{ program_id: null }, { source_renstra_program_id: null }];
  }

  const items = await RenjaItem.findAll({
    where,
    order: [["id", "ASC"]],
    raw: true,
  });

  const results = [];
  for (const item of items) {
    const programPick = suggestProgram(item, renstraPrograms);
    const selectedRenstraProgramId = programPick?.best?.renstra_program_id || null;
    const kegiatanSource = selectedRenstraProgramId
      ? renstraKegiatan.filter((x) => Number(x.program_id) === Number(selectedRenstraProgramId))
      : [];
    const kegiatanPick = suggestKegiatan(item, kegiatanSource);
    const selectedKegiatanId = kegiatanPick?.best?.renstra_kegiatan_id || null;
    const subSource = selectedKegiatanId
      ? renstraSub.filter((x) => Number(x.kegiatan_id) === Number(selectedKegiatanId))
      : [];
    const subPick = suggestSubKegiatan(item, subSource);

    results.push(buildProgramSuggestionResult(item, programPick, kegiatanPick, subPick));
  }

  return results;
}

module.exports = {
  SQL_RENJA_RENSTRA_MAPPING_CANDIDATES,
  SQL_RENSTRA_KEGIATAN_CANDIDATES,
  SQL_RENSTRA_SUBKEGIATAN_CANDIDATES,
  evaluateCodeAndNameMatch,
  suggestProgram,
  suggestKegiatan,
  suggestSubKegiatan,
  generateProgramMappingSuggestions,
};

