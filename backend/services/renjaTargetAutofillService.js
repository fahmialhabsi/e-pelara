"use strict";

const { Op } = require("sequelize");
const { buildConfidence } = require("../utils/confidenceScoring");
const { pickFirstTarget } = require("./renjaIndicatorMappingService");

const SQL_TARGET_AUTOFILL_SUGGESTIONS = `
SELECT
  ri.id AS renja_item_id,
  ri.target_numerik,
  ri.target_teks,
  ri.satuan,
  ri.source_indikator_renstra_id,
  ri.source_rkpd_item_id,
  ir.nama_indikator AS renstra_indikator,
  ir.satuan AS renstra_satuan,
  ir.target_tahun_1,
  ir.target_tahun_2,
  ir.target_tahun_3,
  ir.target_tahun_4,
  ir.target_tahun_5,
  ir.target_tahun_6,
  rk.target AS rkpd_target,
  rk.satuan AS rkpd_satuan
FROM renja_item ri
LEFT JOIN indikator_renstra ir ON ir.id = ri.source_indikator_renstra_id
LEFT JOIN rkpd_item rk ON rk.id = ri.source_rkpd_item_id
WHERE ri.renja_dokumen_id = :renjaDokumenId
`;

function toNumOrNull(v) {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function isEmptyTarget(item) {
  const n = item.target_numerik;
  const t = item.target_teks;
  return (n === null || n === undefined || String(n).trim() === "") && (!t || !String(t).trim());
}

function pickIndicatorTarget(indikator) {
  const target = pickFirstTarget(indikator);
  if (!target) return { numerik: null, teks: null };
  const n = Number(target);
  if (Number.isFinite(n)) return { numerik: n, teks: null };
  return { numerik: null, teks: String(target) };
}

function buildSuggestion(item, payload = {}) {
  const confidence = buildConfidence(payload.score ?? 0.8, { minAutoApplyScore: 0.85 });
  return {
    renja_item_id: Number(item.id),
    suggestion_type: "target_autofill",
    suggested_target_numerik: payload.suggested_target_numerik ?? null,
    suggested_target_teks: payload.suggested_target_teks ?? null,
    suggested_satuan: payload.suggested_satuan ?? null,
    suggested_target_source: payload.suggested_target_source ?? "NONE",
    suggestion_score: confidence.score,
    suggestion_confidence: confidence.confidence,
    can_auto_apply: Boolean(payload.can_auto_apply && confidence.can_auto_apply),
    suggestion_reason: payload.reason || "Autofill target berdasarkan sumber terdekat.",
    suggestion_payload_json: {
      can_auto_apply_target: Boolean(payload.can_auto_apply && confidence.can_auto_apply),
      suggested_target_reason: payload.reason || null,
    },
    source_context_json: payload.source_context_json || null,
  };
}

async function generateTargetAutofillSuggestions(db, renjaDokumenId, opts = {}) {
  const { RenjaDokumen, RenjaItem, IndikatorRenstra, RkpdItem } = db;
  const overwrite = Boolean(opts.overwrite);
  const doc = await RenjaDokumen.findByPk(renjaDokumenId);
  if (!doc) throw new Error("Dokumen RENJA tidak ditemukan.");

  const items = await RenjaItem.findAll({
    where: {
      renja_dokumen_id: Number(renjaDokumenId),
      ...(overwrite
        ? {}
        : {
            [Op.or]: [
              { target_numerik: null },
              { target_teks: { [Op.is]: null } },
              { target_teks: "" },
            ],
          }),
    },
    raw: true,
  });

  const indikatorIds = items.map((x) => x.source_indikator_renstra_id).filter(Boolean);
  const rkpdIds = items.map((x) => x.source_rkpd_item_id).filter(Boolean);
  const [indikators, rkpdItems, renstraIndicators] = await Promise.all([
    indikatorIds.length
      ? IndikatorRenstra.findAll({ where: { id: { [Op.in]: indikatorIds } }, raw: true })
      : [],
    rkpdIds.length ? RkpdItem.findAll({ where: { id: { [Op.in]: rkpdIds } }, raw: true }) : [],
    IndikatorRenstra.findAll({ where: { renstra_id: Number(doc.renstra_pd_dokumen_id) }, raw: true }),
  ]);
  const indikatorById = new Map(indikators.map((x) => [Number(x.id), x]));
  const rkpdById = new Map(rkpdItems.map((x) => [Number(x.id), x]));

  const results = [];
  for (const item of items) {
    const alreadyFilled = !isEmptyTarget(item);
    if (alreadyFilled && !overwrite) continue;

    let suggestion = null;

    if (item.source_indikator_renstra_id && indikatorById.has(Number(item.source_indikator_renstra_id))) {
      const ir = indikatorById.get(Number(item.source_indikator_renstra_id));
      const target = pickIndicatorTarget(ir);
      suggestion = buildSuggestion(item, {
        suggested_target_numerik: target.numerik,
        suggested_target_teks: target.teks,
        suggested_satuan: item.satuan || ir.satuan || null,
        suggested_target_source: "RENSTRA",
        reason: "Target diisi dari indikator RENSTRA yang sudah terpetakan.",
        score: 0.92,
        can_auto_apply: true,
        source_context_json: {
          indikator_renstra_id: ir.id,
          indikator_renstra: ir.nama_indikator,
        },
      });
    }

    if (!suggestion && item.source_rkpd_item_id && rkpdById.has(Number(item.source_rkpd_item_id))) {
      const rk = rkpdById.get(Number(item.source_rkpd_item_id));
      suggestion = buildSuggestion(item, {
        suggested_target_numerik: toNumOrNull(rk.target),
        suggested_target_teks: toNumOrNull(rk.target) === null ? String(rk.target || "") || null : null,
        suggested_satuan: item.satuan || rk.satuan || null,
        suggested_target_source: "RKPD",
        reason: "Target diisi dari RKPD item yang terhubung.",
        score: 0.88,
        can_auto_apply: true,
        source_context_json: {
          rkpd_item_id: rk.id,
          rkpd_program: rk.program,
          rkpd_kegiatan: rk.kegiatan,
        },
      });
    }

    if (!suggestion && item.source_renstra_program_id) {
      const related = renstraIndicators.filter(
        (x) => x.stage === "program" && Number(x.ref_id) === Number(item.source_renstra_program_id),
      );
      if (related.length) {
        const target = pickIndicatorTarget(related[0]);
        suggestion = buildSuggestion(item, {
          suggested_target_numerik: target.numerik,
          suggested_target_teks: target.teks,
          suggested_satuan: item.satuan || related[0].satuan || null,
          suggested_target_source: "RENSTRA",
          reason: "Target diisi dari indikator RENSTRA level program.",
          score: 0.78,
          can_auto_apply: false,
          source_context_json: {
            indikator_renstra_id: related[0].id,
            indikator_renstra: related[0].nama_indikator,
          },
        });
      }
    }

    if (!suggestion) {
      suggestion = buildSuggestion(item, {
        suggested_target_source: "NONE",
        reason: "Belum ada sumber target valid, butuh input manual.",
        score: 0.25,
        can_auto_apply: false,
      });
    }

    results.push(suggestion);
  }

  return results;
}

module.exports = {
  SQL_TARGET_AUTOFILL_SUGGESTIONS,
  isEmptyTarget,
  pickIndicatorTarget,
  generateTargetAutofillSuggestions,
};

