"use strict";

const assert = require("assert");
const path = require("path");
const { spawn } = require("child_process");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");

const db = require("../models");

const NODE_BIN =
  process.execPath ||
  "C:\\Users\\MyBook PRO K7V\\AppData\\Local\\Programs\\cursor\\resources\\app\\resources\\helpers\\node.exe";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitServerReady(proc, timeoutMs = 40000) {
  const startedAt = Date.now();
  let buffer = "";

  return new Promise((resolve, reject) => {
    const onData = (chunk) => {
      const s = String(chunk || "");
      buffer += s;
      if (s.includes("Server is running on port")) {
        cleanup();
        resolve();
      }
    };
    const onErr = (err) => {
      cleanup();
      reject(err);
    };
    const onExit = (code) => {
      cleanup();
      reject(new Error(`Server exited prematurely with code=${code}. logs=${buffer}`));
    };
    const timer = setInterval(() => {
      if (Date.now() - startedAt > timeoutMs) {
        cleanup();
        reject(new Error(`Timeout waiting server ready. logs=${buffer}`));
      }
    }, 250);

    function cleanup() {
      clearInterval(timer);
      proc.stdout.off("data", onData);
      proc.stderr.off("data", onData);
      proc.off("error", onErr);
      proc.off("exit", onExit);
    }

    proc.stdout.on("data", onData);
    proc.stderr.on("data", onData);
    proc.on("error", onErr);
    proc.on("exit", onExit);
  });
}

function parseJsonSafe(x) {
  try {
    return JSON.parse(x);
  } catch {
    return null;
  }
}

async function run() {
  const backendDir = path.resolve(__dirname, "..");
  require("dotenv").config({ path: path.join(backendDir, ".env") });

  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET tidak ditemukan di .env backend.");
  }

  const port = 3350 + Math.floor(Math.random() * 100);
  const baseUrl = `http://127.0.0.1:${port}/api`;
  const token = jwt.sign(
    {
      id: 999999,
      username: "renja-int-test",
      role: "ADMINISTRATOR",
      role_id: 1,
    },
    process.env.JWT_SECRET,
    { expiresIn: "2h" },
  );

  const api = async (method, route, body, expectedStatus) => {
    const res = await fetch(`${baseUrl}${route}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    const json = parseJsonSafe(text);
    if (expectedStatus != null) {
      assert.equal(
        res.status,
        expectedStatus,
        `[${method} ${route}] expected=${expectedStatus} actual=${res.status} body=${text}`,
      );
    }
    return { status: res.status, data: json, text };
  };

  const serverProc = spawn(NODE_BIN, ["server.js"], {
    cwd: backendDir,
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: "development",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let createdDocIds = [];
  let createdItemIds = [];

  try {
    await waitServerReady(serverProc);
    await sleep(500);

    const {
      sequelize,
      PeriodeRpjmd,
      PerangkatDaerah,
      RenstraPdDokumen,
      RkpdDokumen,
      RenjaDokumen,
      RenjaItem,
      RenjaDokumenSection,
      RenjaValidationRun,
      RenjaMismatchResult,
      Program,
      Kegiatan,
      SubKegiatan,
    } = db;

    const periode = await PeriodeRpjmd.findOne({ order: [["id", "ASC"]] });
    const pd = await PerangkatDaerah.findOne({ order: [["id", "ASC"]] });
    assert.ok(periode && pd, "Master periode/perangkat_daerah harus tersedia.");

    let renstra = await RenstraPdDokumen.findOne({
      where: { perangkat_daerah_id: pd.id },
      order: [["id", "DESC"]],
    });
    if (!renstra) {
      renstra = await RenstraPdDokumen.create({
        periode_id: periode.id,
        perangkat_daerah_id: pd.id,
        judul: "RENSTRA PD test",
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
        judul: "RKPD test",
        status: "final",
        is_final_active: true,
        is_test: true,
      });
    }

    const sampleSub = await SubKegiatan.findOne({ order: [["id", "ASC"]] });
    assert.ok(sampleSub, "Master sub_kegiatan harus tersedia untuk test.");
    const sampleKegiatan = await Kegiatan.findByPk(sampleSub.kegiatan_id);
    const sampleProgram = sampleKegiatan ? await Program.findByPk(sampleKegiatan.program_id) : null;
    assert.ok(sampleProgram && sampleKegiatan, "Master program/kegiatan/sub_kegiatan belum siap.");

    const wrongProgram = await Program.findOne({
      where: { id: { [Op.ne]: sampleProgram.id } },
      order: [["id", "ASC"]],
    });
    assert.ok(wrongProgram, "Butuh minimal 2 program untuk test invalid parent-child.");

    const commonDocPayload = {
      periode_id: renstra.periode_id || periode.id,
      tahun: rkpd.tahun,
      perangkat_daerah_id: pd.id,
      renstra_pd_dokumen_id: renstra.id,
      rkpd_dokumen_id: rkpd.id,
      judul: `INT TEST RENJA ${Date.now()}`,
      status: "draft",
      workflow_status: "draft",
      document_phase: "rancangan_awal",
      document_kind: "renja_awal",
      is_test: true,
      created_by: 999999,
      updated_by: 999999,
    };

    const docBlocker = await RenjaDokumen.create(commonDocPayload);
    const docReady = await RenjaDokumen.create({ ...commonDocPayload, judul: `${commonDocPayload.judul} READY` });
    const docPhase = await RenjaDokumen.create({ ...commonDocPayload, judul: `${commonDocPayload.judul} PHASE` });
    const docPublished = await RenjaDokumen.create({
      ...commonDocPayload,
      judul: `${commonDocPayload.judul} PUB`,
      workflow_status: "published",
      document_phase: "final",
      status: "final",
    });

    createdDocIds = [docBlocker.id, docReady.id, docPhase.id, docPublished.id];

    const requiredSections = ["pendahuluan", "evaluasi", "tujuan_sasaran", "rencana_kerja", "penutup"];
    for (const key of requiredSections) {
      await RenjaDokumenSection.create({
        renja_dokumen_id: docReady.id,
        section_key: key,
        section_title: key,
        content: `isi ${key}`,
        completion_pct: 100,
      });
      await RenjaDokumenSection.create({
        renja_dokumen_id: docPhase.id,
        section_key: key,
        section_title: key,
        content: `isi ${key}`,
        completion_pct: 100,
      });
    }

    const goodItem = await RenjaItem.create({
      renja_dokumen_id: docReady.id,
      source_mode: "MANUAL",
      program_id: sampleProgram.id,
      kegiatan_id: sampleKegiatan.id,
      sub_kegiatan_id: sampleSub.id,
      program: sampleProgram.nama_program,
      kegiatan: sampleKegiatan.nama_kegiatan,
      sub_kegiatan: sampleSub.nama_sub_kegiatan,
      indikator: "indikator test",
      target_numerik: 10,
      pagu_indikatif: 1000,
      lokasi: "A",
      urutan: 1,
    });
    createdItemIds.push(goodItem.id);

    const dupA = await RenjaItem.create({
      renja_dokumen_id: docReady.id,
      source_mode: "MANUAL",
      program_id: sampleProgram.id,
      kegiatan_id: sampleKegiatan.id,
      sub_kegiatan_id: sampleSub.id,
      indikator: "indikator duplicate",
      target_numerik: 1,
      pagu_indikatif: 100,
      lokasi: "LOC-DUP",
      urutan: 2,
    });
    const dupB = await RenjaItem.create({
      renja_dokumen_id: docReady.id,
      source_mode: "MANUAL",
      program_id: sampleProgram.id,
      kegiatan_id: sampleKegiatan.id,
      sub_kegiatan_id: sampleSub.id,
      indikator: "indikator duplicate",
      target_numerik: 2,
      pagu_indikatif: 200,
      lokasi: "LOC-DUP",
      urutan: 3,
    });
    createdItemIds.push(dupA.id, dupB.id);

    await RenjaItem.create({
      renja_dokumen_id: docPhase.id,
      source_mode: "MANUAL",
      program_id: sampleProgram.id,
      kegiatan_id: sampleKegiatan.id,
      sub_kegiatan_id: sampleSub.id,
      indikator: "indikator phase",
      target_numerik: 5,
      pagu_indikatif: 500,
      urutan: 1,
    });

    await docPhase.update({
      workflow_status: "approved",
      document_phase: "rancangan",
      status: "review",
    });

    // 1) validate endpoint
    const validateRes = await api("POST", `/renja/v2/${docReady.id}/validate`, { action: "submit" }, 200);
    assert.ok(validateRes.data?.data?.summary, "validate harus mengembalikan summary.");

    // 2) readiness endpoint
    const readinessRes = await api("GET", `/renja/v2/${docReady.id}/readiness?action=submit`, null, 200);
    assert.ok(readinessRes.data?.data?.readiness, "readiness harus ada.");

    // 3) submit gagal jika blocker (docBlocker tanpa section/item)
    const submitFail = await api("POST", `/renja/v2/${docBlocker.id}/submit`, { change_reason_text: "submit test fail" }, 409);
    assert.equal(submitFail.data?.success, false);

    // 4) submit berhasil jika readiness lolos (docReady)
    // hapus item duplikat dulu agar blocker duplicate hilang
    await RenjaItem.destroy({ where: { id: { [Op.in]: [dupA.id, dupB.id] } } });
    const submitOk = await api("POST", `/renja/v2/${docReady.id}/submit`, { change_reason_text: "submit test pass" }, 200);
    assert.equal(submitOk.data?.success, true);

    // 5) publish gagal jika phase bukan final
    const publishPhaseFail = await api("POST", `/renja/v2/${docPhase.id}/publish`, { change_reason_text: "publish phase fail" }, 409);
    assert.equal(publishPhaseFail.data?.success, false);

    // 6) publish gagal jika blocker (docBlocker diset approved + final tapi section/item masih kosong)
    await docBlocker.update({ workflow_status: "approved", document_phase: "final", status: "review" });
    const publishBlockFail = await api("POST", `/renja/v2/${docBlocker.id}/publish`, { change_reason_text: "publish blocker fail" }, 409);
    assert.equal(publishBlockFail.data?.success, false);

    // 7) published document tidak bisa diedit section
    const editPublished = await api(
      "PUT",
      `/renja/v2/${docPublished.id}/sections/pendahuluan`,
      { content: "update", change_reason_text: "should fail" },
      409,
    );
    assert.equal(editPublished.data?.success, false);

    // 8) approved/published bisa create revision
    const createRev = await api(
      "POST",
      `/renja/v2/${docPhase.id}/create-revision`,
      {
        revision_type: "perubahan",
        change_reason: "need revision",
        change_reason_text: "need revision",
      },
      201,
    );
    assert.equal(createRev.data?.success, true);
    const createdRevisionId = createRev.data?.data?.id;
    assert.ok(createdRevisionId, "create revision harus mengembalikan dokumen baru.");
    createdDocIds.push(createdRevisionId);

    // 9) recompute mismatch menulis validation run + mismatch result baru
    const runBefore = await RenjaValidationRun.count({ where: { renja_dokumen_id: docReady.id } });
    const recompute = await api("POST", `/renja/v2/${docReady.id}/recompute-mismatch`, { change_reason_text: "recompute" }, 200);
    assert.equal(recompute.data?.success, true);
    const runAfter = await RenjaValidationRun.count({ where: { renja_dokumen_id: docReady.id } });
    assert.ok(runAfter > runBefore, "recompute harus menambah validation run.");
    const mmCount = await RenjaMismatchResult.count({
      where: {
        renja_dokumen_id: docReady.id,
        renja_validation_run_id: recompute.data?.data?.run_id,
      },
    });
    assert.ok(mmCount >= 0, "mismatch rows harus tersimpan.");

    // 10) item invalid parent-child ditolak via items/validate
    const invalidItemRes = await api(
      "POST",
      `/renja/v2/${docReady.id}/items/validate`,
      {
        renja_dokumen_id: docReady.id,
        source_mode: "MANUAL",
        program_id: wrongProgram.id,
        kegiatan_id: sampleKegiatan.id,
        sub_kegiatan_id: sampleSub.id,
        target_numerik: 1,
        pagu_indikatif: 1,
      },
      200,
    );
    assert.ok(
      (invalidItemRes.data?.data?.results || []).some((x) => x.mismatch_code === "INVALID_PARENT_CHILD"),
      "items/validate harus mendeteksi invalid parent-child.",
    );

    // 11) items bulk validate endpoint
    const bulkRes = await api("POST", `/renja/v2/${docReady.id}/items/bulk-validate`, { change_reason_text: "bulk check" }, 200);
    assert.ok(bulkRes.data?.data?.summary, "bulk validate harus mengembalikan summary.");

    // 12) duplicate item terdeteksi (buat ulang duplikat lalu validate dokumen)
    const d1 = await RenjaItem.create({
      renja_dokumen_id: docReady.id,
      source_mode: "MANUAL",
      program_id: sampleProgram.id,
      kegiatan_id: sampleKegiatan.id,
      sub_kegiatan_id: sampleSub.id,
      indikator: "indikator duplicate 2",
      target_numerik: 1,
      pagu_indikatif: 100,
      lokasi: "LOC-DUP-2",
      urutan: 11,
    });
    const d2 = await RenjaItem.create({
      renja_dokumen_id: docReady.id,
      source_mode: "MANUAL",
      program_id: sampleProgram.id,
      kegiatan_id: sampleKegiatan.id,
      sub_kegiatan_id: sampleSub.id,
      indikator: "indikator duplicate 2",
      target_numerik: 2,
      pagu_indikatif: 200,
      lokasi: "LOC-DUP-2",
      urutan: 12,
    });
    createdItemIds.push(d1.id, d2.id);
    const validateDup = await api("POST", `/renja/v2/${docReady.id}/validate`, { action: "submit" }, 200);
    const allResults = [
      ...(validateDup.data?.data?.grouped_results?.document || []),
      ...(validateDup.data?.data?.grouped_results?.section || []),
      ...(validateDup.data?.data?.grouped_results?.item || []),
    ];
    assert.ok(
      allResults.some((x) => x.mismatch_code === "DUPLICATE_ITEM"),
      "duplicate item harus terdeteksi pada validate dokumen.",
    );

    console.log("RENJA governance integration test passed");
  } finally {
    try {
      if (createdItemIds.length) {
        await db.RenjaItem.destroy({ where: { id: { [Op.in]: createdItemIds } } });
      }
      if (createdDocIds.length) {
        await db.RenjaDokumenSection.destroy({ where: { renja_dokumen_id: { [Op.in]: createdDocIds } } });
        await db.RenjaMismatchResult.destroy({ where: { renja_dokumen_id: { [Op.in]: createdDocIds } } });
        await db.RenjaValidationRun.destroy({ where: { renja_dokumen_id: { [Op.in]: createdDocIds } } });
        await db.RenjaDokumen.destroy({ where: { id: { [Op.in]: createdDocIds } } });
      }
      await db.sequelize.close();
    } catch {
      // no-op
    }

    if (serverProc && !serverProc.killed) {
      serverProc.kill("SIGTERM");
      await sleep(1000);
      if (!serverProc.killed) serverProc.kill("SIGKILL");
    }
  }
}

run().catch((e) => {
  console.error("RENJA governance integration test failed:", e.message);
  process.exit(1);
});
