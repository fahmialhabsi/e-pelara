"use strict";

const { Op } = require("sequelize");
const { sequelize, Program, MasterProgram } = require("../models");

const DEFAULT_DATASET_KEY = "kepmendagri_provinsi_900_2024";
const MAX_SCAN_DEFAULT = 2000;

function parsePositiveInt(v) {
  if (v == null || v === "") return null;
  const n = Number.parseInt(String(v), 10);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

function normalizeJenis(v) {
  return String(v || "rpjmd").trim().toLowerCase();
}

function normalizeCode(v) {
  return String(v || "").trim();
}

function normalizeProgramIds(arr) {
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr.map((x) => parsePositiveInt(x)).filter(Boolean))];
}

function snapshotProgram(row) {
  if (!row) return null;
  return {
    id: row.id,
    kode_program: row.kode_program,
    nama_program: row.nama_program,
    master_program_id: row.master_program_id,
    input_mode: row.input_mode,
    regulasi_versi_id: row.regulasi_versi_id,
  };
}

function snapshotMaster(row) {
  if (!row) return null;
  return {
    id: row.id,
    kode_program_full: row.kode_program_full,
    kode_program: row.kode_program,
    nama_program: row.nama_program,
    regulasi_versi_id: row.regulasi_versi_id,
    dataset_key: row.dataset_key,
  };
}

function validateInput(body, opts = {}) {
  const { requireConfirm = false } = opts;
  const payload = body && typeof body === "object" ? body : {};

  const dataset_key =
    String(payload.dataset_key || "").trim() || DEFAULT_DATASET_KEY;
  const periode_id = parsePositiveInt(payload.periode_id);
  const tahun = parsePositiveInt(payload.tahun);
  const jenis_dokumen = normalizeJenis(payload.jenis_dokumen);
  const program_ids = normalizeProgramIds(payload.program_ids);

  if (!periode_id) {
    return { ok: false, error: "periode_id wajib dan harus bilangan positif." };
  }
  if (!tahun) {
    return { ok: false, error: "tahun wajib dan harus bilangan positif." };
  }
  if (!jenis_dokumen) {
    return { ok: false, error: "jenis_dokumen wajib." };
  }
  if (requireConfirm && payload.confirm !== true) {
    return { ok: false, error: "confirm wajib bernilai true." };
  }

  return {
    ok: true,
    ctx: {
      dataset_key,
      periode_id,
      tahun,
      jenis_dokumen,
      program_ids,
      scan_limit: MAX_SCAN_DEFAULT,
    },
  };
}

async function listProgramsForScope(ctx) {
  const where = {
    periode_id: ctx.periode_id,
    tahun: ctx.tahun,
    jenis_dokumen: ctx.jenis_dokumen,
  };

  const options = {
    where,
    attributes: [
      "id",
      "kode_program",
      "nama_program",
      "master_program_id",
      "input_mode",
      "regulasi_versi_id",
    ],
    order: [
      ["kode_program", "ASC"],
      ["id", "ASC"],
    ],
  };

  if (ctx.program_ids.length) {
    options.where.id = { [Op.in]: ctx.program_ids };
  } else {
    // Default aman: scan program yang belum termapping saja.
    options.where.master_program_id = { [Op.is]: null };
    options.limit = ctx.scan_limit;
  }

  return Program.unscoped().findAll(options);
}

function indexMastersByCode(rows) {
  const byCode = new Map();
  for (const row of rows || []) {
    const code = normalizeCode(row.kode_program_full);
    if (!code) continue;
    if (!byCode.has(code)) byCode.set(code, []);
    byCode.get(code).push(row);
  }
  return byCode;
}

async function computePreview(ctx) {
  const programs = await listProgramsForScope(ctx);

  const neededCodes = [
    ...new Set(
      programs
        .filter((p) => p.master_program_id == null)
        .map((p) => normalizeCode(p.kode_program))
        .filter(Boolean),
    ),
  ];

  const masters = neededCodes.length
    ? await MasterProgram.unscoped().findAll({
        where: {
          dataset_key: ctx.dataset_key,
          is_active: true,
          kode_program_full: { [Op.in]: neededCodes },
        },
        attributes: [
          "id",
          "dataset_key",
          "kode_program",
          "kode_program_full",
          "nama_program",
          "regulasi_versi_id",
          "is_active",
        ],
      })
    : [];

  const mastersByCode = indexMastersByCode(masters);

  const ready_items = [];
  const ambiguous_items = [];
  const not_found_items = [];
  const already_mapped_items = [];

  for (const p of programs) {
    const kode = normalizeCode(p.kode_program);

    if (p.master_program_id != null) {
      already_mapped_items.push({
        program_id: p.id,
        kode_program: p.kode_program,
        nama_program: p.nama_program,
        current_master_program_id: p.master_program_id,
      });
      continue;
    }

    if (!kode) {
      not_found_items.push({
        program_id: p.id,
        kode_program: p.kode_program,
        nama_program: p.nama_program,
        reason: "Kode program kosong.",
      });
      continue;
    }

    const candidates = mastersByCode.get(kode) || [];

    if (candidates.length === 1) {
      const c = candidates[0];
      ready_items.push({
        program_id: p.id,
        kode_program: p.kode_program,
        nama_program: p.nama_program,
        candidate_master_program_id: c.id,
        candidate_kode_program_full: c.kode_program_full,
        candidate_nama_program: c.nama_program,
        match_type: "exact_code",
        confidence: 1.0,
      });
      continue;
    }

    if (candidates.length > 1) {
      ambiguous_items.push({
        program_id: p.id,
        kode_program: p.kode_program,
        nama_program: p.nama_program,
        candidates: candidates.map((c) => ({
          master_program_id: c.id,
          kode_program_full: c.kode_program_full,
          nama_program: c.nama_program,
        })),
        reason: "Lebih dari satu kandidat master dengan kode yang sama.",
      });
      continue;
    }

    not_found_items.push({
      program_id: p.id,
      kode_program: p.kode_program,
      nama_program: p.nama_program,
      reason: "Tidak ada master_program aktif dengan kode_program_full yang sama.",
    });
  }

  return {
    summary: {
      total_programs_scanned: programs.length,
      ready_exact_match: ready_items.length,
      ambiguous: ambiguous_items.length,
      not_found: not_found_items.length,
      already_mapped: already_mapped_items.length,
      scan_limit: ctx.scan_limit,
      scan_limited: !ctx.program_ids.length && programs.length >= ctx.scan_limit,
    },
    ready_items,
    ambiguous_items,
    not_found_items,
    already_mapped_items,
  };
}

async function previewProgramAutoMap(body) {
  const v = validateInput(body, { requireConfirm: false });
  if (!v.ok) return { ok: false, error: v.error };

  const data = await computePreview(v.ctx);
  return {
    ok: true,
    data,
    context: {
      dataset_key: v.ctx.dataset_key,
      periode_id: v.ctx.periode_id,
      tahun: v.ctx.tahun,
      jenis_dokumen: v.ctx.jenis_dokumen,
      program_ids_count: v.ctx.program_ids.length,
    },
  };
}

async function executeProgramAutoMap(body) {
  const v = validateInput(body, { requireConfirm: true });
  if (!v.ok) return { ok: false, error: v.error };

  const previewData = await computePreview(v.ctx);
  const readyItems = Array.isArray(previewData.ready_items)
    ? previewData.ready_items
    : [];

  if (!readyItems.length) {
    return {
      ok: true,
      data: {
        summary: {
          mapped: 0,
          skipped: 0,
          noop_count: 0,
          already_mapped_count: 0,
          failed: 0,
        },
        details: [],
        preview_summary: previewData.summary,
        mapped_program_ids: [],
        old_state_summary: { mapped_sample: [] },
        new_state_summary: { mapped_sample: [] },
      },
      context: {
        dataset_key: v.ctx.dataset_key,
        periode_id: v.ctx.periode_id,
        tahun: v.ctx.tahun,
        jenis_dokumen: v.ctx.jenis_dokumen,
        program_ids_count: v.ctx.program_ids.length,
      },
    };
  }

  const readyProgramIds = readyItems.map((x) => x.program_id);
  const candidateMasterIds = [
    ...new Set(readyItems.map((x) => x.candidate_master_program_id)),
  ];

  const tx = await sequelize.transaction();
  try {
    const programRows = await Program.unscoped().findAll({
      where: {
        id: { [Op.in]: readyProgramIds },
        periode_id: v.ctx.periode_id,
        tahun: v.ctx.tahun,
        jenis_dokumen: v.ctx.jenis_dokumen,
      },
      transaction: tx,
      lock: tx.LOCK.UPDATE,
    });

    const masterRows = await MasterProgram.unscoped().findAll({
      where: {
        id: { [Op.in]: candidateMasterIds },
        dataset_key: v.ctx.dataset_key,
        is_active: true,
      },
      transaction: tx,
    });

    const programById = new Map(programRows.map((r) => [Number(r.id), r]));
    const masterById = new Map(masterRows.map((r) => [Number(r.id), r]));

    const details = [];
    const mappedProgramIds = [];
    const oldStateSample = [];
    const newStateSample = [];
    let mapped = 0;
    let alreadyMappedCount = 0;
    let failed = 0;

    for (const item of readyItems) {
      const pid = Number(item.program_id);
      const mid = Number(item.candidate_master_program_id);
      const prog = programById.get(pid);

      if (!prog) {
        failed += 1;
        details.push({
          program_id: pid,
          candidate_master_program_id: mid,
          status: "failed",
          reason: "Program tidak ditemukan pada konteks eksekusi terbaru.",
        });
        continue;
      }

      if (prog.master_program_id != null) {
        alreadyMappedCount += 1;
        details.push({
          program_id: pid,
          kode_program: prog.kode_program,
          nama_program: prog.nama_program,
          candidate_master_program_id: mid,
          candidate_nama_program: item.candidate_nama_program || null,
          status: "skipped_already_mapped",
          reason: "Program sudah memiliki master_program_id saat eksekusi.",
          current_master_program_id: prog.master_program_id,
        });
        continue;
      }

      const master = masterById.get(mid);
      if (!master) {
        failed += 1;
        details.push({
          program_id: pid,
          kode_program: prog.kode_program,
          nama_program: prog.nama_program,
          candidate_master_program_id: mid,
          status: "failed",
          reason: "Kandidat master tidak ditemukan/aktif pada dataset ini.",
        });
        continue;
      }

      const programCode = normalizeCode(prog.kode_program);
      const masterCode = normalizeCode(master.kode_program_full);
      if (!programCode || programCode !== masterCode) {
        failed += 1;
        details.push({
          program_id: pid,
          kode_program: prog.kode_program,
          nama_program: prog.nama_program,
          candidate_master_program_id: mid,
          candidate_nama_program: master.nama_program,
          status: "failed",
          reason: "Kode program tidak lagi exact match dengan kandidat master.",
        });
        continue;
      }

      const oldState = snapshotProgram(prog);
      const patch = {
        master_program_id: master.id,
        input_mode: "MASTER",
      };
      if (prog.regulasi_versi_id == null && master.regulasi_versi_id != null) {
        patch.regulasi_versi_id = master.regulasi_versi_id;
      }

      await prog.update(patch, { transaction: tx });
      await prog.reload({ transaction: tx });

      const newState = snapshotProgram(prog);
      mapped += 1;
      mappedProgramIds.push(pid);

      if (oldStateSample.length < 25) oldStateSample.push(oldState);
      if (newStateSample.length < 25) newStateSample.push(newState);

      details.push({
        program_id: pid,
        kode_program: prog.kode_program,
        nama_program: prog.nama_program,
        candidate_master_program_id: master.id,
        candidate_kode_program_full: master.kode_program_full,
        candidate_nama_program: master.nama_program,
        status: "mapped",
        match_type: "exact_code",
      });
    }

    await tx.commit();

    return {
      ok: true,
      data: {
        summary: {
          mapped,
          skipped: alreadyMappedCount,
          noop_count: alreadyMappedCount,
          already_mapped_count: alreadyMappedCount,
          failed,
        },
        details,
        preview_summary: previewData.summary,
        mapped_program_ids: mappedProgramIds,
        old_state_summary: {
          mapped_sample: oldStateSample,
        },
        new_state_summary: {
          mapped_sample: newStateSample,
        },
      },
      context: {
        dataset_key: v.ctx.dataset_key,
        periode_id: v.ctx.periode_id,
        tahun: v.ctx.tahun,
        jenis_dokumen: v.ctx.jenis_dokumen,
        program_ids_count: v.ctx.program_ids.length,
      },
    };
  } catch (err) {
    await tx.rollback();
    return {
      ok: false,
      error:
        err?.message ||
        "Eksekusi auto mapping program gagal (rollback transaksi).",
    };
  }
}

module.exports = {
  DEFAULT_DATASET_KEY,
  previewProgramAutoMap,
  executeProgramAutoMap,
};
