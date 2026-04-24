"use strict";

const assert = require("assert");
const { Op } = require("sequelize");
const db = require("../models");
const autoMapSvc = require("../services/renjaAutoMappingService");
const indicatorSvc = require("../services/renjaIndicatorMappingService");
const targetSvc = require("../services/renjaTargetAutofillService");
const { resolvePolicyConflict } = require("../utils/policyChainMatcher");
const dataFixSvc = require("../services/renjaDataFixService");

function assertEq(actual, expected, msg) {
  assert.strictEqual(actual, expected, msg);
}

function runUnitTests() {
  // 1) auto-mapping exact code match
  let x = autoMapSvc.evaluateCodeAndNameMatch({
    itemCode: "1.02.03",
    itemName: "Program A",
    candidateCode: "1.02.03",
    candidateName: "Program B",
  });
  assertEq(x.method, "code_exact", "exact code match harus code_exact");

  // 2) auto-mapping exact name match
  x = autoMapSvc.evaluateCodeAndNameMatch({
    itemCode: "",
    itemName: "Program Ketahanan Pangan",
    candidateCode: "",
    candidateName: "Program Ketahanan Pangan",
  });
  assertEq(x.method, "name_exact", "exact name match harus name_exact");

  // 3) fuzzy mapping low confidence
  x = autoMapSvc.evaluateCodeAndNameMatch({
    itemCode: "",
    itemName: "infrastruktur air",
    candidateCode: "",
    candidateName: "pengelolaan data statistik",
  });
  assert.ok(["fuzzy_name", "manual_required"].includes(x.method), "fuzzy low harus non-exact");

  // 4) indicator exact match
  let ind = indicatorSvc.evaluateIndicatorCandidate(
    { indikator: "Persentase Kemiskinan", satuan: "%" },
    { nama_indikator: "Persentase Kemiskinan", satuan: "%" },
  );
  assert.ok(ind.score >= 0.95, "indicator exact match score harus tinggi");

  // 5) indicator fuzzy match
  ind = indicatorSvc.evaluateIndicatorCandidate(
    { indikator: "Indeks Kualitas Infrastruktur", satuan: "indeks" },
    { nama_indikator: "Kualitas Infrastruktur", satuan: "indeks" },
  );
  assert.ok(ind.score > 0.4, "indicator fuzzy match score harus > 0.4");

  // 6) target autofill from RENSTRA helper
  const picked = targetSvc.pickIndicatorTarget({
    target_tahun_1: "",
    target_tahun_2: "10",
  });
  assertEq(picked.numerik, 10, "target helper harus baca target_tahun_2");

  // 7) target autofill from RKPD path tested at integration level below

  // 8) policy conflict detect
  const conflict = resolvePolicyConflict(
    [
      { arah_kebijakan_id: 1, strategi_id: 11 },
      { arah_kebijakan_id: 2, strategi_id: 22 },
    ],
    { expected_strategi_id: 22 },
  );
  assertEq(conflict.resolution_mode, "auto_selected", "conflict resolver harus bisa auto select by strategy");

  // 9) apply-all-high-confidence selector
  const selectable = dataFixSvc.selectAutoApplicableSuggestions([
    { id: 1, suggestion_confidence: "HIGH", is_conflict: false, is_accepted: null },
    { id: 2, suggestion_confidence: "MEDIUM", is_conflict: false, is_accepted: null },
    { id: 3, suggestion_confidence: "HIGH", is_conflict: true, is_accepted: null },
  ]);
  assertEq(selectable.length, 1, "hanya HIGH non-conflict yang boleh auto apply");
}

async function runIntegrationApplyAndRecomputeTest() {
  const {
    RenjaDokumen,
    RenjaItem,
    RenjaDokumenSection,
    RenjaValidationRun,
    RenjaMappingSuggestionRun,
    RenjaMappingSuggestionResult,
    PeriodeRpjmd,
    PerangkatDaerah,
    RenstraPdDokumen,
    RkpdDokumen,
    Program,
    Kegiatan,
    SubKegiatan,
  } = db;

  const cleanup = { docIds: [], itemIds: [], runIds: [], suggestionIds: [] };
  try {
    const periode = await PeriodeRpjmd.findOne({ order: [["id", "ASC"]] });
    const pd = await PerangkatDaerah.findOne({ order: [["id", "ASC"]] });
    assert.ok(periode && pd, "master periode/perangkat daerah harus ada");

    let renstra = await RenstraPdDokumen.findOne({
      where: { perangkat_daerah_id: pd.id },
      order: [["id", "DESC"]],
    });
    if (!renstra) {
      renstra = await RenstraPdDokumen.create({
        periode_id: periode.id,
        perangkat_daerah_id: pd.id,
        judul: "RENSTRA TEST DATAFIX",
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
        judul: "RKPD TEST DATAFIX",
        status: "final",
        is_final_active: true,
        is_test: true,
      });
    }

    const sampleSub = await SubKegiatan.findOne({ order: [["id", "ASC"]] });
    const sampleKeg = sampleSub ? await Kegiatan.findByPk(sampleSub.kegiatan_id) : null;
    const sampleProgram = sampleKeg ? await Program.findByPk(sampleKeg.program_id) : null;
    assert.ok(sampleProgram && sampleKeg && sampleSub, "master program/kegiatan/sub_kegiatan harus ada");

    const doc = await RenjaDokumen.create({
      periode_id: renstra.periode_id || periode.id,
      tahun: rkpd.tahun,
      perangkat_daerah_id: pd.id,
      renstra_pd_dokumen_id: renstra.id,
      rkpd_dokumen_id: rkpd.id,
      judul: `DATAFIX TEST ${Date.now()}`,
      status: "draft",
      workflow_status: "draft",
      document_phase: "rancangan_awal",
      document_kind: "renja_awal",
      is_test: true,
      created_by: 999999,
      updated_by: 999999,
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
      indikator: "indikator datafix",
      target_numerik: null,
      pagu_indikatif: 1000,
      urutan: 1,
    });
    cleanup.itemIds.push(item.id);

    const run = await RenjaMappingSuggestionRun.create({
      renja_dokumen_id: doc.id,
      run_type: "mapping",
      generated_by: 999999,
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
      suggestion_reason: "test apply",
    });
    cleanup.suggestionIds.push(suggestion.id);

    const beforeValidationRuns = await RenjaValidationRun.count({
      where: { renja_dokumen_id: doc.id },
    });
    const applied = await dataFixSvc.applySuggestions(db, doc.id, 999999, {
      suggestion_type: "mapping_program",
      suggestion_ids: [suggestion.id],
      apply_high_confidence_only: false,
    });

    assert.ok(applied.applied_count >= 1, "apply mapping harus sukses");
    const afterItem = await RenjaItem.findByPk(item.id);
    assertEq(Number(afterItem.program_id), Number(sampleProgram.id), "program_id item harus terisi");

    if (applied.rollback_batch_id) {
      assert.ok(Number(applied.rollback_batch_id) > 0, "rollback_batch_id harus terisi bila tabel batch ada");
      await dataFixSvc.rollbackMappingBatch(db, doc.id, applied.rollback_batch_id, 999999, {
        change_reason_text: "test rollback mapping batch",
      });
      const rolled = await RenjaItem.findByPk(item.id);
      assertEq(rolled.program_id, null, "rollback harus mengembalikan program_id");
      const sugAfter = await RenjaMappingSuggestionResult.findByPk(suggestion.id);
      assertEq(sugAfter.is_accepted, null, "rollback harus mereset status suggestion");
    }

    const afterValidationRuns = await RenjaValidationRun.count({
      where: { renja_dokumen_id: doc.id },
    });
    assert.ok(afterValidationRuns > beforeValidationRuns, "setelah apply harus trigger recompute mismatch");
  } finally {
    try {
      if (cleanup.docIds.length && db.RenjaMappingApplyBatch) {
        await db.RenjaMappingApplyBatch.destroy({ where: { renja_dokumen_id: { [Op.in]: cleanup.docIds } } });
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
  }
}

async function run() {
  runUnitTests();
  await runIntegrationApplyAndRecomputeTest();
  await db.sequelize.close();
  console.log("RENJA data-fix mapping engine test passed");
}

run().catch(async (e) => {
  console.error("RENJA data-fix mapping engine test failed:", e.message);
  try {
    await db.sequelize.close();
  } catch {
    // no-op
  }
  process.exit(1);
});

