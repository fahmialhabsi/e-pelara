"use strict";

/**
 * Integration test bulk import (DB nyata). Menyentuh transaksi & rollback.
 *
 * Jalankan (Git Bash / sh):
 *   RUN_RPJMD_BULK_INTEGRATION=1 node scripts/rpjmdBulkFromMaster.integration.test.js
 *
 * Windows CMD:
 *   set RUN_RPJMD_BULK_INTEGRATION=1 && node scripts/rpjmdBulkFromMaster.integration.test.js
 *
 * Opsional:
 *   RPJMD_BULK_INTEGRATION_MUTATE=1 — izinkan runCommit di skenario (2) saat preview
 *     tidak commit_blocked (default: tidak commit agar DB tidak berubah tanpa sengaja).
 *   SEQUELIZE_LOG=1 — tampilkan SQL Sequelize (default: mati).
 *
 * Butuh: DB terisi minimal periode, master_sub (dataset kepmendagri).
 */

const assert = require("assert");
const { Op } = require("sequelize");

/**
 * Pakai tahun & periode yang sama dengan data transaksi RPJMD yang sudah ada,
 * supaya find Program/Kegiatan tidak kosong (tahun_awal periode sering beda dari tahun program).
 */
async function resolveBulkImportTestContext(db) {
  const progFromRow = await db.Program.findOne({
    where: {
      jenis_dokumen: { [Op.or]: ["rpjmd", "RPJMD"] },
    },
    order: [["id", "DESC"]],
  });
  if (progFromRow?.periode_id != null) {
    const periode = await db.PeriodeRpjmd.findByPk(progFromRow.periode_id);
    let tahun =
      progFromRow.tahun != null
        ? parseInt(String(progFromRow.tahun), 10)
        : null;
    if (!Number.isFinite(tahun) && periode) {
      tahun = parseInt(String(periode.tahun_awal), 10);
    }
    if (periode && Number.isFinite(tahun)) {
      return { periode, tahun, program: progFromRow };
    }
  }

  const sub = await db.SubKegiatan.findOne({
    where: {
      jenis_dokumen: { [Op.or]: ["rpjmd", "RPJMD"] },
    },
    order: [["id", "DESC"]],
  });
  if (sub) {
    const keg = await db.Kegiatan.findByPk(sub.kegiatan_id);
    if (keg?.program_id) {
      const prog = await db.Program.findByPk(keg.program_id);
      const tahun =
        sub.tahun != null
          ? parseInt(String(sub.tahun), 10)
          : keg.tahun != null
            ? parseInt(String(keg.tahun), 10)
            : null;
      const periode = await db.PeriodeRpjmd.findByPk(sub.periode_id || keg.periode_id);
      if (periode && Number.isFinite(tahun)) {
        return { periode, tahun, program: prog || null };
      }
    }
  }

  const periode = await db.PeriodeRpjmd.findOne({ order: [["id", "ASC"]] });
  return {
    periode,
    tahun: periode ? parseInt(String(periode.tahun_awal), 10) : null,
    program: null,
  };
}

async function main() {
  if (process.env.RUN_RPJMD_BULK_INTEGRATION !== "1") {
    console.log(
      "SKIP integration: set RUN_RPJMD_BULK_INTEGRATION=1 untuk menjalankan.",
    );
    return;
  }

  const db = require("../models");
  if (process.env.SEQUELIZE_LOG !== "1") {
    db.sequelize.options.logging = false;
  }

  const svc = require("../services/rpjmdBulkFromMasterService");
  const allowMutateWhenNotBlocked =
    process.env.RPJMD_BULK_INTEGRATION_MUTATE === "1";

  console.log("--- 1) Sequelize transaction rollback ---");
  let sawRollback = false;
  const t = await db.sequelize.transaction();
  try {
    await db.sequelize.query("SELECT 1 as ok", { transaction: t });
    throw new Error("force_rollback");
  } catch (e) {
    await t.rollback();
    sawRollback = true;
  }
  assert.strictEqual(sawRollback, true, "rollback harus terjadi");

  console.log("--- 2) Konteks tahun/periode dari data RPJMD existing ---");
  const { periode, tahun, program: anchorCandidate } =
    await resolveBulkImportTestContext(db);
  assert.ok(periode, "perlu PeriodeRpjmd");
  assert.ok(
    Number.isFinite(tahun),
    "perlu tahun dari program/sub RPJMD atau tahun_awal periode",
  );

  const ms = await db.MasterSubKegiatan.findOne({
    where: { dataset_key: svc.DEFAULT_DATASET, is_active: true },
    order: [["id", "ASC"]],
  });
  assert.ok(ms, `perlu MasterSubKegiatan dataset ${svc.DEFAULT_DATASET}`);

  const badBody = {
    dataset_key: svc.DEFAULT_DATASET,
    periode_id: periode.id,
    tahun,
    jenis_dokumen: "rpjmd",
    filters: { master_sub_kegiatan_ids: [ms.id] },
    options: {
      skip_duplicates: false,
      strict_parent_mapping: true,
      create_missing_kegiatans: false,
      enforce_anchor_context: true,
    },
    default_nama_opd: "-",
  };

  const prev = await svc.runPreview(badBody);
  assert.strictEqual(prev.ok, true, "preview harus ok untuk skenario uji");
  console.log(
    `   Konteks uji: periode_id=${periode.id}, tahun=${tahun}, commit_blocked=${prev.data.summary.commit_blocked}`,
  );

  const subsBefore = await db.SubKegiatan.unscoped().count({
    where: {
      periode_id: periode.id,
      tahun,
      jenis_dokumen: "rpjmd",
      master_sub_kegiatan_id: ms.id,
    },
  });

  if (prev.data.summary.commit_blocked) {
    const commitRes = await svc.runCommit(badBody, 1);
    assert.strictEqual(commitRes.ok, false, "commit harus ditolak");
    assert.strictEqual(commitRes.data?.commit_blocked, true);
    assert.strictEqual(commitRes.data?.commit_preflight, true);
    const subsAfter = await db.SubKegiatan.unscoped().count({
      where: {
        periode_id: periode.id,
        tahun,
        jenis_dokumen: "rpjmd",
        master_sub_kegiatan_id: ms.id,
      },
    });
    assert.strictEqual(
      subsAfter,
      subsBefore,
      "jika commit_blocked, tidak boleh ada insert sub untuk master ini",
    );
  } else if (allowMutateWhenNotBlocked) {
    console.log(
      "   RPJMD_BULK_INTEGRATION_MUTATE=1: menjalankan runCommit untuk skenario (2).",
    );
    await svc.runCommit(badBody, 1);
  } else {
    console.log(
      "   INFO: preview tidak commit_blocked — runCommit dilewati (tanpa mutasi). Set RPJMD_BULK_INTEGRATION_MUTATE=1 untuk mencoba commit.",
    );
  }

  console.log("--- 3) Duplikat commit (skip_duplicates) tidak menambah ganda ---");
  const goodBody = {
    ...badBody,
    options: {
      ...badBody.options,
      skip_duplicates: true,
      create_missing_kegiatans: true,
      strict_parent_mapping: false,
    },
  };

  const prog =
    anchorCandidate ||
    (await db.Program.findOne({
      where: {
        periode_id: periode.id,
        jenis_dokumen: { [Op.or]: ["rpjmd", "RPJMD"] },
        tahun,
      },
      order: [["id", "ASC"]],
    }));

  if (!prog) {
    console.log(
      "SKIP duplikat: tidak ada program rpjmd untuk periode_id + tahun hasil resolusi.",
    );
  } else {
    goodBody.anchor_program_id = prog.id;
    const p1 = await svc.runPreview(goodBody);
    if (!p1.ok || p1.data.summary.commit_blocked) {
      console.log(
        "SKIP duplikat: preview tidak siap (mapping/OPD/strict).",
        p1.error || p1.data?.summary,
      );
    } else {
      const c1 = await svc.runCommit(goodBody, 1);
      assert.strictEqual(c1.ok, true, "commit pertama harus ok");
      const n1 = c1.data?.summary?.inserted_sub_kegiatans ?? 0;
      const c2 = await svc.runCommit(goodBody, 1);
      assert.strictEqual(c2.ok, true, "commit kedua harus ok");
      const n2 = c2.data?.summary?.inserted_sub_kegiatans ?? 0;
      assert.strictEqual(
        n2,
        0,
        "kedua kali: tidak boleh insert sub baru (duplikat di-skip)",
      );
      console.log(`   insert pertama: ${n1}, kedua: ${n2}`);
    }
  }

  console.log("--- 4) Concurrent commit (dua promise) ---");
  if (!goodBody.anchor_program_id) {
    console.log("SKIP concurrent: tidak ada anchor.");
  } else {
    const pA = svc.runCommit(goodBody, 1);
    const pB = svc.runCommit(goodBody, 1);
    const [rA, rB] = await Promise.allSettled([pA, pB]);
    const okCount = [rA, rB].filter(
      (r) => r.status === "fulfilled" && r.value?.ok,
    ).length;
    assert.ok(
      okCount >= 1,
      "minimal satu commit boleh sukses; yang lain skip/error DB",
    );
    console.log("   concurrent settled:", rA.status, rB.status);
  }

  console.log("\nIntegration bulk import: selesai.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
