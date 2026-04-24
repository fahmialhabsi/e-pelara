"use strict";

/**
 * Self-test hardening bulk import (tanpa DB): klasifikasi + guard program.
 * Jalankan: node scripts/rpjmdBulkFromMasterHardeningTest.js
 */

const assert = require("assert");
const {
  classifyDuplicate,
  CATEGORY,
  SEVERITY,
} = require("../services/rpjmdBulkFromMasterClassification");
const {
  assertProgramBulkContext,
  assertProgramMasterAlignment,
  assertKegiatanOpdOwnership,
  assertSubDefaultsOpd,
  summarizeCommitBlockedReasons,
} = require("../services/rpjmdBulkFromMasterService");

function test(name, fn) {
  try {
    fn();
    console.log("OK:", name);
  } catch (e) {
    console.error("FAIL:", name, e.message);
    process.exitCode = 1;
  }
}

test("classifyDuplicate: duplicate_master_sub → duplicate_mapped", () => {
  const c = classifyDuplicate(
    "duplicate_master_sub",
    { id: 1, master_sub_kegiatan_id: 99 },
    99,
  );
  assert.strictEqual(c.category, CATEGORY.DUPLICATE_MAPPED);
  assert.strictEqual(c.requires_backfill, false);
});

test("classifyDuplicate: kode legacy unmapped → legacy_child_conflict", () => {
  const c = classifyDuplicate(
    "duplicate_kode_per_periode",
    { id: 2, master_sub_kegiatan_id: null },
    100,
  );
  assert.strictEqual(c.category, CATEGORY.LEGACY_CHILD_CONFLICT);
  assert.strictEqual(c.requires_backfill, true);
});

test("classifyDuplicate: kode beda master → duplicate_by_code", () => {
  const c = classifyDuplicate(
    "duplicate_kode_per_periode",
    { id: 3, master_sub_kegiatan_id: 50 },
    100,
  );
  assert.strictEqual(c.category, CATEGORY.DUPLICATE_BY_CODE);
});

test("assertProgramMasterAlignment: strict + null master → legacy_program_unmapped", () => {
  const r = assertProgramMasterAlignment({ master_program_id: null }, 7, true);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.classification.category, CATEGORY.LEGACY_PROGRAM_UNMAPPED);
});

test("assertProgramMasterAlignment: wrong master → hierarchy", () => {
  const r = assertProgramMasterAlignment({ master_program_id: 1 }, 2, true);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.classification.category, CATEGORY.HIERARCHY_CONFLICT);
});

test("assertProgramBulkContext: periode mismatch", () => {
  const r = assertProgramBulkContext(
    { periode_id: 1 },
    { periode_id: 2, tahun: 2025, jenis_dokumen: "rpjmd" },
    {},
  );
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.classification.category, CATEGORY.HIERARCHY_CONFLICT);
});

test("assertProgramBulkContext: OPD mismatch", () => {
  const r = assertProgramBulkContext(
    { periode_id: 1, opd_penanggung_jawab: 5 },
    { periode_id: 1, tahun: 2025, jenis_dokumen: "rpjmd", opd_penanggung_jawab_id: 9 },
    {},
  );
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.classification.category, CATEGORY.OWNERSHIP_CONFLICT);
});

test("assertKegiatanOpdOwnership: numeric mismatch", () => {
  const r = assertKegiatanOpdOwnership(
    { opd_penanggung_jawab: "3" },
    { opd_penanggung_jawab_id: 9 },
  );
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.classification.category, CATEGORY.OWNERSHIP_CONFLICT);
});

test("assertKegiatanOpdOwnership: kosong tidak dipaksakan", () => {
  const r = assertKegiatanOpdOwnership(
    { opd_penanggung_jawab: null },
    { opd_penanggung_jawab_id: 9 },
  );
  assert.strictEqual(r.ok, true);
});

test("assertSubDefaultsOpd: nama selaras referensi", () => {
  const r = assertSubDefaultsOpd({
    opd_anchor: { nama_opd: "Dinas X", nama: "Kepala X" },
    defaults: { nama_opd: "dinas x" },
  });
  assert.strictEqual(r.ok, true);
});

test("assertSubDefaultsOpd: mismatch", () => {
  const r = assertSubDefaultsOpd({
    opd_anchor: { nama_opd: "Dinas X", nama: "Kepala X" },
    defaults: { nama_opd: "Dinas Lain" },
  });
  assert.strictEqual(r.ok, false);
});

test("summarizeCommitBlockedReasons", () => {
  const s = summarizeCommitBlockedReasons({
    summary: { fatal_row_count: 1, error_row_count: 2 },
    classification_counts: { fatal_validation_error: 1, hierarchy_conflict: 2 },
  });
  assert.ok(s.messages.length >= 2);
  assert.ok(s.top_categories.length >= 1);
});

if (!process.exitCode) {
  console.log("\nrpjmdBulkFromMasterHardeningTest: semua asersi lulus.");
}
