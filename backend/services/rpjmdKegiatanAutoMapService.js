"use strict";

const { Op } = require("sequelize");
const { sequelize, Program, Kegiatan, MasterKegiatan } = require("../models");

const DEFAULT_DATASET_KEY = "kepmendagri_provinsi_900_2024";
const MAX_SCAN_DEFAULT = 3000;

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

function normalizeIds(arr) {
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr.map((x) => parsePositiveInt(x)).filter(Boolean))];
}

function snapshotKegiatan(row) {
  if (!row) return null;
  return {
    id: row.id,
    program_id: row.program_id,
    kode_kegiatan: row.kode_kegiatan,
    nama_kegiatan: row.nama_kegiatan,
    master_kegiatan_id: row.master_kegiatan_id,
    input_mode: row.input_mode,
    regulasi_versi_id: row.regulasi_versi_id,
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
  const kegiatan_ids = normalizeIds(payload.kegiatan_ids);

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
      kegiatan_ids,
      scan_limit: MAX_SCAN_DEFAULT,
    },
  };
}

async function listKegiatanForScope(ctx) {
  const where = {
    periode_id: ctx.periode_id,
    tahun: ctx.tahun,
    jenis_dokumen: ctx.jenis_dokumen,
  };
  if (ctx.kegiatan_ids.length) {
    where.id = { [Op.in]: ctx.kegiatan_ids };
  } else {
    where.master_kegiatan_id = { [Op.is]: null };
  }
  const options = {
    where,
    attributes: [
      "id",
      "program_id",
      "kode_kegiatan",
      "nama_kegiatan",
      "master_kegiatan_id",
      "input_mode",
      "regulasi_versi_id",
    ],
    include: [
      {
        model: Program.unscoped(),
        as: "program",
        required: false,
        attributes: ["id", "kode_program", "nama_program", "master_program_id"],
      },
    ],
    order: [
      ["kode_kegiatan", "ASC"],
      ["id", "ASC"],
    ],
  };
  if (!ctx.kegiatan_ids.length) options.limit = ctx.scan_limit;
  return Kegiatan.unscoped().findAll(options);
}

function indexMastersByCode(rows) {
  const byCode = new Map();
  for (const row of rows || []) {
    const code = normalizeCode(row.kode_kegiatan_full);
    if (!code) continue;
    if (!byCode.has(code)) byCode.set(code, []);
    byCode.get(code).push(row);
  }
  return byCode;
}

async function computePreview(ctx) {
  const kegiatans = await listKegiatanForScope(ctx);

  const neededCodes = [
    ...new Set(
      kegiatans
        .filter((k) => {
          if (k.master_kegiatan_id != null) return false;
          const parentMaster = parsePositiveInt(k.program?.master_program_id);
          return Boolean(parentMaster);
        })
        .map((k) => normalizeCode(k.kode_kegiatan))
        .filter(Boolean),
    ),
  ];

  const masters = neededCodes.length
    ? await MasterKegiatan.unscoped().findAll({
        where: {
          dataset_key: ctx.dataset_key,
          is_active: true,
          kode_kegiatan_full: { [Op.in]: neededCodes },
        },
        attributes: [
          "id",
          "master_program_id",
          "dataset_key",
          "kode_kegiatan",
          "kode_kegiatan_full",
          "nama_kegiatan",
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
  const parent_program_unmapped_items = [];
  const hierarchy_conflict_items = [];

  for (const k of kegiatans) {
    const kode = normalizeCode(k.kode_kegiatan);
    const parentMaster = parsePositiveInt(k.program?.master_program_id);

    if (k.master_kegiatan_id != null) {
      already_mapped_items.push({
        kegiatan_id: k.id,
        kode_kegiatan: k.kode_kegiatan,
        nama_kegiatan: k.nama_kegiatan,
        current_master_kegiatan_id: k.master_kegiatan_id,
      });
      continue;
    }

    if (!parentMaster) {
      parent_program_unmapped_items.push({
        kegiatan_id: k.id,
        kode_kegiatan: k.kode_kegiatan,
        nama_kegiatan: k.nama_kegiatan,
        program_id: k.program_id,
        program_master_program_id: k.program?.master_program_id ?? null,
        reason:
          "Parent program belum terhubung ke master_program. Lakukan mapping program terlebih dahulu.",
      });
      continue;
    }

    if (!kode) {
      not_found_items.push({
        kegiatan_id: k.id,
        kode_kegiatan: k.kode_kegiatan,
        nama_kegiatan: k.nama_kegiatan,
        reason: "Kode kegiatan kosong.",
      });
      continue;
    }

    const candidates = mastersByCode.get(kode) || [];
    if (candidates.length === 1) {
      const c = candidates[0];
      if (
        c.master_program_id != null &&
        Number(c.master_program_id) !== Number(parentMaster)
      ) {
        hierarchy_conflict_items.push({
          kegiatan_id: k.id,
          kode_kegiatan: k.kode_kegiatan,
          nama_kegiatan: k.nama_kegiatan,
          program_master_program_id: parentMaster,
          candidate_master_program_id: c.master_program_id,
          reason:
            "Master kegiatan berada pada parent master program yang berbeda.",
        });
        continue;
      }
      ready_items.push({
        kegiatan_id: k.id,
        program_id: k.program_id,
        kode_kegiatan: k.kode_kegiatan,
        nama_kegiatan: k.nama_kegiatan,
        candidate_master_kegiatan_id: c.id,
        candidate_kode_kegiatan_full: c.kode_kegiatan_full,
        candidate_nama_kegiatan: c.nama_kegiatan,
        candidate_master_program_id: c.master_program_id,
        match_type: "exact_code",
        confidence: 1.0,
      });
      continue;
    }

    if (candidates.length > 1) {
      ambiguous_items.push({
        kegiatan_id: k.id,
        kode_kegiatan: k.kode_kegiatan,
        nama_kegiatan: k.nama_kegiatan,
        candidates: candidates.map((c) => ({
          master_kegiatan_id: c.id,
          master_program_id: c.master_program_id,
          kode_kegiatan_full: c.kode_kegiatan_full,
          nama_kegiatan: c.nama_kegiatan,
        })),
        reason: "Lebih dari satu kandidat master kegiatan dengan kode yang sama.",
      });
      continue;
    }

    not_found_items.push({
      kegiatan_id: k.id,
      kode_kegiatan: k.kode_kegiatan,
      nama_kegiatan: k.nama_kegiatan,
      reason: "Tidak ada master_kegiatan aktif dengan kode_kegiatan_full yang sama.",
    });
  }

  return {
    summary: {
      total_kegiatans_scanned: kegiatans.length,
      ready_exact_match: ready_items.length,
      ambiguous: ambiguous_items.length,
      not_found: not_found_items.length,
      already_mapped: already_mapped_items.length,
      parent_program_unmapped: parent_program_unmapped_items.length,
      hierarchy_conflict: hierarchy_conflict_items.length,
      scan_limit: ctx.scan_limit,
      scan_limited: !ctx.kegiatan_ids.length && kegiatans.length >= ctx.scan_limit,
    },
    ready_items,
    ambiguous_items,
    not_found_items,
    already_mapped_items,
    parent_program_unmapped_items,
    hierarchy_conflict_items,
  };
}

async function previewKegiatanAutoMap(body) {
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
      kegiatan_ids_count: v.ctx.kegiatan_ids.length,
    },
  };
}

async function executeKegiatanAutoMap(body) {
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
          skipped_parent_unmapped_count: 0,
          failed: 0,
        },
        details: [],
        preview_summary: previewData.summary,
        mapped_kegiatan_ids: [],
        old_state_summary: { mapped_sample: [] },
        new_state_summary: { mapped_sample: [] },
      },
      context: {
        dataset_key: v.ctx.dataset_key,
        periode_id: v.ctx.periode_id,
        tahun: v.ctx.tahun,
        jenis_dokumen: v.ctx.jenis_dokumen,
        kegiatan_ids_count: v.ctx.kegiatan_ids.length,
      },
    };
  }

  const readyKegiatanIds = readyItems.map((x) => x.kegiatan_id);
  const candidateMasterIds = [
    ...new Set(readyItems.map((x) => x.candidate_master_kegiatan_id)),
  ];

  const tx = await sequelize.transaction();
  try {
    const kegiatanRows = await Kegiatan.unscoped().findAll({
      where: {
        id: { [Op.in]: readyKegiatanIds },
        periode_id: v.ctx.periode_id,
        tahun: v.ctx.tahun,
        jenis_dokumen: v.ctx.jenis_dokumen,
      },
      transaction: tx,
      lock: tx.LOCK.UPDATE,
    });

    const programIds = [
      ...new Set(kegiatanRows.map((r) => parsePositiveInt(r.program_id)).filter(Boolean)),
    ];
    const programRows = await Program.unscoped().findAll({
      where: { id: { [Op.in]: programIds } },
      attributes: ["id", "master_program_id"],
      transaction: tx,
      lock: tx.LOCK.UPDATE,
    });

    const masterRows = await MasterKegiatan.unscoped().findAll({
      where: {
        id: { [Op.in]: candidateMasterIds },
        dataset_key: v.ctx.dataset_key,
        is_active: true,
      },
      transaction: tx,
    });

    const kegiatanById = new Map(kegiatanRows.map((r) => [Number(r.id), r]));
    const programById = new Map(programRows.map((r) => [Number(r.id), r]));
    const masterById = new Map(masterRows.map((r) => [Number(r.id), r]));

    const details = [];
    const mappedKegiatanIds = [];
    const oldStateSample = [];
    const newStateSample = [];
    let mapped = 0;
    let alreadyMappedCount = 0;
    let skippedParentUnmappedCount = 0;
    let failed = 0;

    for (const item of readyItems) {
      const kid = Number(item.kegiatan_id);
      const mid = Number(item.candidate_master_kegiatan_id);
      const keg = kegiatanById.get(kid);

      if (!keg) {
        failed += 1;
        details.push({
          kegiatan_id: kid,
          candidate_master_kegiatan_id: mid,
          status: "failed",
          reason: "Kegiatan tidak ditemukan pada konteks eksekusi terbaru.",
        });
        continue;
      }

      if (keg.master_kegiatan_id != null) {
        alreadyMappedCount += 1;
        details.push({
          kegiatan_id: kid,
          kode_kegiatan: keg.kode_kegiatan,
          nama_kegiatan: keg.nama_kegiatan,
          candidate_master_kegiatan_id: mid,
          status: "skipped_already_mapped",
          reason: "Kegiatan sudah memiliki master_kegiatan_id saat eksekusi.",
          current_master_kegiatan_id: keg.master_kegiatan_id,
        });
        continue;
      }

      const parent = programById.get(Number(keg.program_id));
      const parentMasterId = parsePositiveInt(parent?.master_program_id);
      if (!parentMasterId) {
        skippedParentUnmappedCount += 1;
        details.push({
          kegiatan_id: kid,
          kode_kegiatan: keg.kode_kegiatan,
          nama_kegiatan: keg.nama_kegiatan,
          candidate_master_kegiatan_id: mid,
          status: "skipped_parent_unmapped",
          reason:
            "Parent program belum terhubung ke master_program pada saat eksekusi.",
        });
        continue;
      }

      const master = masterById.get(mid);
      if (!master) {
        failed += 1;
        details.push({
          kegiatan_id: kid,
          kode_kegiatan: keg.kode_kegiatan,
          nama_kegiatan: keg.nama_kegiatan,
          candidate_master_kegiatan_id: mid,
          status: "failed",
          reason: "Kandidat master kegiatan tidak ditemukan/aktif pada dataset ini.",
        });
        continue;
      }

      const kegiatanCode = normalizeCode(keg.kode_kegiatan);
      const masterCode = normalizeCode(master.kode_kegiatan_full);
      if (!kegiatanCode || kegiatanCode !== masterCode) {
        failed += 1;
        details.push({
          kegiatan_id: kid,
          kode_kegiatan: keg.kode_kegiatan,
          nama_kegiatan: keg.nama_kegiatan,
          candidate_master_kegiatan_id: mid,
          status: "failed",
          reason: "Kode kegiatan tidak lagi exact match dengan kandidat master.",
        });
        continue;
      }

      if (
        master.master_program_id != null &&
        Number(master.master_program_id) !== Number(parentMasterId)
      ) {
        failed += 1;
        details.push({
          kegiatan_id: kid,
          kode_kegiatan: keg.kode_kegiatan,
          nama_kegiatan: keg.nama_kegiatan,
          candidate_master_kegiatan_id: mid,
          status: "failed",
          reason:
            "Parent master program kandidat kegiatan tidak sama dengan parent master program transaksi.",
        });
        continue;
      }

      const oldState = snapshotKegiatan(keg);
      const patch = {
        master_kegiatan_id: master.id,
        input_mode: "MASTER",
      };
      if (keg.regulasi_versi_id == null && master.regulasi_versi_id != null) {
        patch.regulasi_versi_id = master.regulasi_versi_id;
      }

      await keg.update(patch, { transaction: tx });
      await keg.reload({ transaction: tx });

      const newState = snapshotKegiatan(keg);
      mapped += 1;
      mappedKegiatanIds.push(kid);

      if (oldStateSample.length < 25) oldStateSample.push(oldState);
      if (newStateSample.length < 25) newStateSample.push(newState);

      details.push({
        kegiatan_id: kid,
        kode_kegiatan: keg.kode_kegiatan,
        nama_kegiatan: keg.nama_kegiatan,
        candidate_master_kegiatan_id: master.id,
        candidate_kode_kegiatan_full: master.kode_kegiatan_full,
        candidate_nama_kegiatan: master.nama_kegiatan,
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
          skipped: alreadyMappedCount + skippedParentUnmappedCount,
          noop_count: alreadyMappedCount + skippedParentUnmappedCount,
          already_mapped_count: alreadyMappedCount,
          skipped_parent_unmapped_count: skippedParentUnmappedCount,
          failed,
        },
        details,
        preview_summary: previewData.summary,
        mapped_kegiatan_ids: mappedKegiatanIds,
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
        kegiatan_ids_count: v.ctx.kegiatan_ids.length,
      },
    };
  } catch (err) {
    await tx.rollback();
    return {
      ok: false,
      error:
        err?.message ||
        "Eksekusi auto mapping kegiatan gagal (rollback transaksi).",
    };
  }
}

module.exports = {
  DEFAULT_DATASET_KEY,
  previewKegiatanAutoMap,
  executeKegiatanAutoMap,
};
