"use strict";

/**
 * Uji hardening Data Fix: preview impact, stamp mismatch, kategori skor, rollback batch.
 * Jalankan: node scripts/renjaDataFixHardeningTest.js
 */

const assert = require("assert");
const { Op } = require("sequelize");
const db = require("../models");
const dataFixSvc = require("../services/renjaDataFixService");

function assertEq(a, b, m) {
  assert.strictEqual(a, b, m);
}

async function run() {
  const {
    PeriodeRpjmd,
    PerangkatDaerah,
    RenstraPdDokumen,
    RkpdDokumen,
    RenjaDokumen,
    RenjaDokumenSection,
    RenjaItem,
    RenjaMappingSuggestionRun,
    RenjaMappingSuggestionResult,
    Program,
    Kegiatan,
    SubKegiatan,
  } = db;

  const cleanup = { docIds: [], itemIds: [], runIds: [], suggestionIds: [], batchIds: [] };
  try {
    const periode = await PeriodeRpjmd.findOne({ order: [["id", "ASC"]] });
    const pd = await PerangkatDaerah.findOne({ order: [["id", "ASC"]] });
    assert.ok(periode && pd, "perlu master periode & PD");

    let renstra = await RenstraPdDokumen.findOne({
      where: { perangkat_daerah_id: pd.id },
      order: [["id", "DESC"]],
    });
    if (!renstra) {
      renstra = await RenstraPdDokumen.create({
        periode_id: periode.id,
        perangkat_daerah_id: pd.id,
        judul: "RENSTRA HARDENING",
        status: "final",
        is_final_active: true,
        is_test: true,
      });
    }

    let rkpd = await RkpdDokumen.findOne({
      where: { periode_id: renstra.periode_id },
      order: [["id", "DESC"]],
    });
    if (!rkpd) {
      rkpd = await RkpdDokumen.create({
        periode_id: renstra.periode_id,
        tahun: new Date().getFullYear(),
        judul: "RKPD HARDENING",
        status: "final",
        is_final_active: true,
        is_test: true,
      });
    }

    const sampleSub = await SubKegiatan.findOne({ order: [["id", "ASC"]] });
    const sampleKeg = sampleSub ? await Kegiatan.findByPk(sampleSub.kegiatan_id) : null;
    const sampleProgram = sampleKeg ? await Program.findByPk(sampleKeg.program_id) : null;
    assert.ok(sampleProgram && sampleKeg && sampleSub, "perlu program/kegiatan/sub");

    const doc = await RenjaDokumen.create({
      periode_id: renstra.periode_id || periode.id,
      tahun: rkpd.tahun,
      perangkat_daerah_id: pd.id,
      renstra_pd_dokumen_id: renstra.id,
      rkpd_dokumen_id: rkpd.id,
      judul: `RENJA DATAFIX HARDENING ${Date.now()}`,
      status: "draft",
      workflow_status: "draft",
      document_phase: "rancangan_awal",
      document_kind: "renja_awal",
      is_test: true,
      created_by: 999998,
      updated_by: 999998,
    });
    cleanup.docIds.push(doc.id);

    const requiredSections = ["pendahuluan", "evaluasi", "tujuan_sasaran", "rencana_kerja", "penutup"];
    for (const key of requiredSections) {
      await RenjaDokumenSection.create({
        renja_dokumen_id: doc.id,
        section_key: key,
        section_title: key,
        content: `isi ${key}`,
        completion_pct: 100,
      });
    }

    const item = await RenjaItem.create({
      renja_dokumen_id: doc.id,
      source_mode: "MANUAL",
      program_id: null,
      kegiatan_id: sampleKeg.id,
      sub_kegiatan_id: sampleSub.id,
      program: sampleProgram.nama_program,
      kegiatan: sampleKeg.nama_kegiatan,
      sub_kegiatan: sampleSub.nama_sub_kegiatan,
      indikator: "indikator hardening",
      target_numerik: null,
      pagu_indikatif: 1000,
      urutan: 1,
    });
    cleanup.itemIds.push(item.id);

    const run = await RenjaMappingSuggestionRun.create({
      renja_dokumen_id: doc.id,
      run_type: "mapping",
      generated_by: 999998,
      generated_at: new Date(),
      summary_json: { total: 1 },
    });
    cleanup.runIds.push(run.id);

    const suggestion = await RenjaMappingSuggestionResult.create({
      renja_mapping_suggestion_run_id: run.id,
      renja_dokumen_id: doc.id,
      renja_item_id: item.id,
      suggestion_type: "mapping_program",
      suggestion_confidence: "HIGH",
      suggestion_score: 0.95,
      suggested_program_id: sampleProgram.id,
      suggested_source_renstra_program_id: null,
      is_conflict: false,
      is_accepted: null,
      suggestion_reason: "hardening",
    });
    cleanup.suggestionIds.push(suggestion.id);

    const preview = await dataFixSvc.previewMappingApply(db, doc.id, {
      suggestion_ids: [suggestion.id],
      apply_high_confidence_only: false,
    });
    assert.ok(preview.item_stamps && preview.item_stamps[String(item.id)], "preview harus mengembalikan item_stamps");

    const impact = await dataFixSvc.previewDataFixImpact(db, doc.id, {
      suggestion_type: dataFixSvc.SUGGESTION_TYPES.MAPPING,
      suggestion_ids: [suggestion.id],
      apply_high_confidence_only: false,
    });
    assert.ok(impact.impact, "preview impact harus punya impact");
    assertEq(typeof impact.impact.blocker_reduction, "number", "blocker_reduction number");
    assertEq(typeof impact.impact.quality_score_before, "number", "quality before number");

    const q = await dataFixSvc.computeDataQualityScore(db, doc.id);
    assert.ok(["EXCELLENT", "GOOD", "NEEDS_IMPROVEMENT", "CRITICAL"].includes(q.category), "category wajib valid");
    assert.ok(q.dimension_scores && q.dimension_scores.mapping != null, "dimension_scores.mapping ada");

    const wrongStamp = { [String(item.id)]: new Date(0).toISOString() };
    let threw = false;
    try {
      await dataFixSvc.applySuggestions(db, doc.id, 999998, {
        suggestion_type: dataFixSvc.SUGGESTION_TYPES.MAPPING,
        suggestion_ids: [suggestion.id],
        apply_high_confidence_only: false,
        change_reason_text: "test stamp",
        expect_item_stamps: wrongStamp,
      });
    } catch (e) {
      threw = e.code === "DATA_CHANGED_SINCE_PREVIEW" || String(e.message).includes("DATA_CHANGED_SINCE_PREVIEW");
    }
    assert.ok(threw, "apply dengan stamp salah harus ditolak");

    const applied = await dataFixSvc.applySuggestions(db, doc.id, 999998, {
      suggestion_type: dataFixSvc.SUGGESTION_TYPES.MAPPING,
      suggestion_ids: [suggestion.id],
      apply_high_confidence_only: false,
      change_reason_text: "test apply hardening",
      expect_item_stamps: preview.item_stamps,
    });
    assert.ok(applied.applied_count >= 1, "apply sukses dengan stamp cocok");
    if (applied.rollback_batch_id) cleanup.batchIds.push(applied.rollback_batch_id);

    const batches = await dataFixSvc.listDataFixBatchHistory(db, doc.id, { limit: 10 });
    assert.ok(Array.isArray(batches) && batches.length >= 1, "batch history tidak kosong");

    const detail = await dataFixSvc.getDataFixBatchDetail(db, doc.id, applied.rollback_batch_id);
    assert.ok(detail && detail.items_json, "batch detail berisi items_json");

    if (applied.rollback_batch_id) {
      await dataFixSvc.rollbackMappingBatch(db, doc.id, applied.rollback_batch_id, 999998, {
        change_reason_text: "rollback hardening test",
      });
    }

    const lk = await dataFixSvc.acquireDataFixDocLock(db, doc.id, 999998, { ttl_minutes: 10 });
    assert.ok(lk.acquired, "lock acquired");
    let lockDenied = false;
    try {
      await dataFixSvc.acquireDataFixDocLock(db, doc.id, 999997, { ttl_minutes: 10 });
    } catch (e) {
      lockDenied = e.code === "DATA_FIX_DOC_LOCKED";
    }
    assert.ok(lockDenied, "user lain tidak boleh ambil lock aktif");
    await dataFixSvc.releaseDataFixDocLock(db, doc.id, 999998);
  } finally {
    try {
      if (cleanup.batchIds.length && db.RenjaMappingApplyBatch) {
        await db.RenjaMappingApplyBatch.destroy({ where: { id: { [Op.in]: cleanup.batchIds } } });
      }
      if (db.RenjaDataFixAuditLog && cleanup.docIds.length) {
        await db.RenjaDataFixAuditLog.destroy({ where: { renja_dokumen_id: { [Op.in]: cleanup.docIds } } });
      }
      if (db.RenjaDataFixDocLock && cleanup.docIds.length) {
        await db.RenjaDataFixDocLock.destroy({ where: { renja_dokumen_id: { [Op.in]: cleanup.docIds } } });
      }
      if (cleanup.suggestionIds.length) {
        await db.RenjaMappingSuggestionResult.destroy({ where: { id: { [Op.in]: cleanup.suggestionIds } } });
      }
      if (cleanup.runIds.length) {
        await db.RenjaMappingSuggestionRun.destroy({ where: { id: { [Op.in]: cleanup.runIds } } });
      }
      if (cleanup.itemIds.length) {
        await db.RenjaItem.destroy({ where: { id: { [Op.in]: cleanup.itemIds } } });
      }
      if (cleanup.docIds.length) {
        await db.RenjaDokumenSection.destroy({ where: { renja_dokumen_id: { [Op.in]: cleanup.docIds } } });
        await db.RenjaMismatchResult.destroy({ where: { renja_dokumen_id: { [Op.in]: cleanup.docIds } } });
        await db.RenjaValidationRun.destroy({ where: { renja_dokumen_id: { [Op.in]: cleanup.docIds } } });
        await db.RenjaDokumen.destroy({ where: { id: { [Op.in]: cleanup.docIds } } });
      }
    } catch {
      // no-op
    }
    await db.sequelize.close();
  }
}

run().catch(async (e) => {
  console.error("renjaDataFixHardeningTest failed:", e.message);
  try {
    await db.sequelize.close();
  } catch {
    // no-op
  }
  process.exit(1);
});
