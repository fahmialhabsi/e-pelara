"use strict";

const assert = require("assert");
const { assertStrictTransition } = require("../services/renjaWorkflowGuardService");
const { detectDuplicateItems } = require("../services/renjaDuplicateDetectorService");
const { validateHierarchy } = require("../validators/renjaHierarchyValidator");

async function run() {
  // workflow: draft -> publish gagal
  let blocked = false;
  try {
    assertStrictTransition("draft", "published");
  } catch {
    blocked = true;
  }
  assert.equal(blocked, true, "draft -> publish harus ditolak");

  // duplicate detector
  const dup = detectDuplicateItems([
    { id: 1, program_id: 10, kegiatan_id: 20, sub_kegiatan_id: 30, indikator: "A", lokasi: "X" },
    { id: 2, program_id: 10, kegiatan_id: 20, sub_kegiatan_id: 30, indikator: "A", lokasi: "X" },
  ]);
  assert.equal(dup.length >= 2, true, "duplikasi item harus terdeteksi");

  // hierarchy validator mock: kegiatan bukan child program
  const mockDb = {
    Program: { findByPk: async (id) => (id === 10 ? { id: 10 } : null) },
    Kegiatan: { findByPk: async (id) => (id === 20 ? { id: 20, program_id: 99 } : null) },
    SubKegiatan: { findByPk: async (id) => (id === 30 ? { id: 30, kegiatan_id: 20 } : null) },
    RenstraProgram: { findByPk: async () => null },
    RenstraKegiatan: { findByPk: async () => null },
    RenstraSubkegiatan: { findByPk: async () => null },
    RkpdItem: { findByPk: async () => null },
  };
  const hierarchyResult = await validateHierarchy(mockDb, {
    dokumen: { id: 1, rkpd_dokumen_id: 100 },
    item: {
      program_id: 10,
      kegiatan_id: 20,
      sub_kegiatan_id: 30,
      source_mode: "MANUAL",
      target_numerik: 10,
      pagu_indikatif: 1000,
    },
  });
  assert.equal(
    hierarchyResult.some((x) => x.mismatch_code === "INVALID_PARENT_CHILD"),
    true,
    "kegiatan bukan child program harus gagal",
  );

  console.log("RENJA validation self-test passed");
}

run().catch((e) => {
  console.error("RENJA validation self-test failed:", e.message);
  process.exit(1);
});
