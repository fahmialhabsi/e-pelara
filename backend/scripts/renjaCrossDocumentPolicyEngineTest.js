"use strict";

const assert = require("assert");
const crossDocSvc = require("../services/renjaCrossDocumentValidationService");
const thresholdSvc = require("../services/renjaThresholdMismatchService");
const policySvc = require("../services/renjaPolicyAlignmentService");

function hasCode(issues, code) {
  return issues.some((x) => String(x.mismatch_code || "") === code);
}

function findCode(issues, code) {
  return issues.find((x) => String(x.mismatch_code || "") === code) || null;
}

function runCrossDocumentTests() {
  const baseMatrix = {
    renstra_programs: [
      { id: 1, kode_program: "1.01", nama_program: "Infrastruktur Air Bersih", rpjmd_program_id: 10 },
    ],
    rkpd_items: [{ id: 100, program: "Digitalisasi Arsip Layanan", target: 100, pagu: 1000 }],
    renja_items: [
      {
        id: 1000,
        source_mode: "RENSTRA",
        source_renstra_program_id: 1,
        source_rkpd_item_id: null,
        program_id: 10,
        target_numerik: 100,
        pagu_indikatif: 1000,
      },
    ],
    renstra_target_by_program_id: new Map([[1, { target: 100, pagu: 1000 }]]),
  };

  const issuesA = crossDocSvc.evaluateCrossDocumentRules(baseMatrix, {});
  assert.equal(hasCode(issuesA, "RENSTRA_PROGRAM_EXISTS_IN_RKPD"), true);
  assert.equal(hasCode(issuesA, "RKPD_PROGRAM_EXISTS_IN_RENJA"), true);
  assert.equal(hasCode(issuesA, "REQUIRED_RKPD_ITEMS_NOT_PULLED"), true);

  const matrixTarget = {
    renstra_programs: [
      { id: 1, kode_program: "1.01", nama_program: "Program Pembangunan A", rpjmd_program_id: 10 },
    ],
    rkpd_items: [{ id: 200, program: "Program Pembangunan A", target: 100, pagu: 1000 }],
    renja_items: [
      {
        id: 2000,
        source_mode: "IRISAN",
        source_renstra_program_id: 1,
        source_rkpd_item_id: 200,
        program_id: 10,
        target_numerik: 250,
        pagu_indikatif: 1000,
      },
    ],
    renstra_target_by_program_id: new Map([[1, { target: 100, pagu: 1000 }]]),
  };
  const issuesB = crossDocSvc.evaluateCrossDocumentRules(matrixTarget, {});
  const rkpdRenjaTarget = findCode(issuesB, "RKPD_RENJA_TARGET_ALIGNED");
  assert.ok(rkpdRenjaTarget, "Expected RKPD_RENJA_TARGET_ALIGNED issue.");
  assert.equal(rkpdRenjaTarget.severity, "error");

  const matrixPolicyMissing = {
    renstra_programs: [],
    rkpd_items: [],
    renja_items: [
      {
        id: 3000,
        source_mode: "RENSTRA",
        source_renstra_program_id: 99999,
        source_rkpd_item_id: null,
        program_id: 10,
        target_numerik: 10,
        pagu_indikatif: 10,
      },
    ],
    renstra_target_by_program_id: new Map(),
  };
  const issuesC = crossDocSvc.evaluateCrossDocumentRules(matrixPolicyMissing, {});
  assert.equal(hasCode(issuesC, "POLICY_CHAIN_EXISTS"), true);
}

function runThresholdTests() {
  const cfg = thresholdSvc.resolveThresholdConfig({});
  const mkItem = (target, pagu, indikator = "Persentase Kemiskinan") => ({
    target_numerik: target,
    pagu_indikatif: pagu,
    indikator,
    source_indikator_renstra_id: null,
  });

  let issues = thresholdSvc.evaluateThresholdForItem({
    item: mkItem(110, 1000),
    rkpdItem: { target: 100, pagu: 1000, indikator: "Persentase Kemiskinan" },
    renstraTarget: null,
    renstraPagu: null,
    renstraIndicator: null,
    cfg,
  });
  assert.equal(hasCode(issues, "TARGET_OUT_OF_RANGE_RKPD"), false, "Target 10% should not trigger issue.");

  issues = thresholdSvc.evaluateThresholdForItem({
    item: mkItem(133, 1000),
    rkpdItem: { target: 100, pagu: 1000, indikator: "Persentase Kemiskinan" },
    renstraTarget: null,
    renstraPagu: null,
    renstraIndicator: null,
    cfg,
  });
  assert.equal(findCode(issues, "TARGET_OUT_OF_RANGE_RKPD")?.severity, "warning");

  issues = thresholdSvc.evaluateThresholdForItem({
    item: mkItem(250, 1000),
    rkpdItem: { target: 100, pagu: 1000, indikator: "Persentase Kemiskinan" },
    renstraTarget: null,
    renstraPagu: null,
    renstraIndicator: null,
    cfg,
  });
  assert.equal(findCode(issues, "TARGET_OUT_OF_RANGE_RKPD")?.severity, "error");

  issues = thresholdSvc.evaluateThresholdForItem({
    item: mkItem(100, 1050),
    rkpdItem: { target: 100, pagu: 1000, indikator: "Persentase Kemiskinan" },
    renstraTarget: null,
    renstraPagu: null,
    renstraIndicator: null,
    cfg,
  });
  assert.equal(hasCode(issues, "PAGU_OUT_OF_RANGE_RKPD"), false, "Pagu 5% should not trigger issue.");

  issues = thresholdSvc.evaluateThresholdForItem({
    item: mkItem(100, 1150),
    rkpdItem: { target: 100, pagu: 1000, indikator: "Persentase Kemiskinan" },
    renstraTarget: null,
    renstraPagu: null,
    renstraIndicator: null,
    cfg,
  });
  assert.equal(findCode(issues, "PAGU_OUT_OF_RANGE_RKPD")?.severity, "warning");

  issues = thresholdSvc.evaluateThresholdForItem({
    item: mkItem(100, 1500),
    rkpdItem: { target: 100, pagu: 1000, indikator: "Persentase Kemiskinan" },
    renstraTarget: null,
    renstraPagu: null,
    renstraIndicator: null,
    cfg,
  });
  assert.equal(findCode(issues, "PAGU_OUT_OF_RANGE_RKPD")?.severity, "error");
}

function runPolicyAlignmentTests() {
  const brokenIssues = policySvc.evaluatePolicyAlignment({
    actual: { program_id: 10, sasaran_id: null, tujuan_id: null, misi_id: null, strategi_id: null, arah_kebijakan_id: null },
    expected: { program_id: 10, sasaran_id: 20, tujuan_id: 30, misi_id: 40, strategi_id: 50, arah_kebijakan_id: 60 },
  });
  assert.equal(hasCode(brokenIssues, "POLICY_CHAIN_BROKEN"), true);
  assert.equal(hasCode(brokenIssues, "STRATEGY_NOT_ALIGNED"), true);
  assert.equal(hasCode(brokenIssues, "ARAH_KEBIJAKAN_NOT_ALIGNED"), true);

  const alignedIssues = policySvc.evaluatePolicyAlignment({
    actual: { program_id: 10, sasaran_id: 20, tujuan_id: 30, misi_id: 40, strategi_id: 50, arah_kebijakan_id: 60 },
    expected: { program_id: 10, sasaran_id: 20, tujuan_id: 30, misi_id: 40, strategi_id: 50, arah_kebijakan_id: 60 },
  });
  assert.equal(alignedIssues.length, 0, "Complete chain should be aligned.");
}

function runIndicatorAlignmentTests() {
  const cfg = thresholdSvc.resolveThresholdConfig({});

  const sameId = thresholdSvc.compareIndicatorAlignment({
    expectedIndicatorId: 1,
    actualIndicatorId: 1,
    expectedText: "Persentase Kemiskinan",
    actualText: "Persentase Kemiskinan",
    warningThreshold: cfg.indicator_similarity_warning_threshold,
    errorThreshold: cfg.indicator_similarity_error_threshold,
    code: "INDIKATOR_NOT_ALIGNED_WITH_RENSTRA",
    source_type: "RENSTRA",
    document_pair: "RENSTRA-RENJA",
  });
  assert.equal(sameId, null, "Equal indicator IDs should be aligned.");

  const diffId = thresholdSvc.compareIndicatorAlignment({
    expectedIndicatorId: 1,
    actualIndicatorId: 2,
    expectedText: "Persentase Kemiskinan",
    actualText: "Persentase Kemiskinan",
    warningThreshold: cfg.indicator_similarity_warning_threshold,
    errorThreshold: cfg.indicator_similarity_error_threshold,
    code: "INDIKATOR_NOT_ALIGNED_WITH_RENSTRA",
    source_type: "RENSTRA",
    document_pair: "RENSTRA-RENJA",
  });
  assert.ok(diffId, "Different indicator IDs should raise issue.");
  assert.equal(diffId.severity, "warning");

  const lowSimilarity = thresholdSvc.compareIndicatorAlignment({
    expectedText: "Indeks Kemiskinan",
    actualText: "Produksi Rumput Laut",
    warningThreshold: 0.95,
    errorThreshold: 0.9,
    code: "INDIKATOR_NOT_ALIGNED_WITH_RENSTRA",
    source_type: "RENSTRA",
    document_pair: "RENSTRA-RENJA",
  });
  assert.ok(lowSimilarity, "Low similarity indicator text should raise issue.");

  const missingPair = thresholdSvc.compareIndicatorAlignment({
    expectedText: null,
    actualText: "Jumlah desa wisata aktif",
    warningThreshold: cfg.indicator_similarity_warning_threshold,
    errorThreshold: cfg.indicator_similarity_error_threshold,
    code: "INDIKATOR_NOT_ALIGNED_WITH_RENSTRA",
    source_type: "RENSTRA",
    document_pair: "RENSTRA-RENJA",
  });
  assert.ok(missingPair, "Missing indicator pair should raise issue.");
}

async function run() {
  runCrossDocumentTests();
  runThresholdTests();
  runPolicyAlignmentTests();
  runIndicatorAlignmentTests();
  console.log("RENJA cross-document / threshold / policy engine test passed");
}

run().catch((e) => {
  console.error("RENJA cross-document / threshold / policy engine test failed:", e.message);
  process.exit(1);
});
