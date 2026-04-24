"use strict";

const { Op } = require("sequelize");
const { sequelize, Kegiatan, SubKegiatan, MasterSubKegiatan } = require("../models");

const DEFAULT_DATASET_KEY = "kepmendagri_provinsi_900_2024";
const MAX_SCAN_DEFAULT = 4000;

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

function snapshotSub(row) {
  if (!row) return null;
  return {
    id: row.id,
    kegiatan_id: row.kegiatan_id,
    kode_sub_kegiatan: row.kode_sub_kegiatan,
    nama_sub_kegiatan: row.nama_sub_kegiatan,
    master_sub_kegiatan_id: row.master_sub_kegiatan_id,
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
  const sub_kegiatan_ids = normalizeIds(payload.sub_kegiatan_ids);

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
      sub_kegiatan_ids,
      scan_limit: MAX_SCAN_DEFAULT,
    },
  };
}

async function listSubsForScope(ctx) {
  const where = {
    periode_id: ctx.periode_id,
    tahun: ctx.tahun,
    jenis_dokumen: ctx.jenis_dokumen,
  };
  if (ctx.sub_kegiatan_ids.length) {
    where.id = { [Op.in]: ctx.sub_kegiatan_ids };
  } else {
    where.master_sub_kegiatan_id = { [Op.is]: null };
  }
  const options = {
    where,
    attributes: [
      "id",
      "kegiatan_id",
      "kode_sub_kegiatan",
      "nama_sub_kegiatan",
      "master_sub_kegiatan_id",
      "input_mode",
      "regulasi_versi_id",
    ],
    include: [
      {
        model: Kegiatan.unscoped(),
        as: "kegiatan",
        required: false,
        attributes: [
          "id",
          "program_id",
          "kode_kegiatan",
          "nama_kegiatan",
          "master_kegiatan_id",
        ],
      },
    ],
    order: [
      ["kode_sub_kegiatan", "ASC"],
      ["id", "ASC"],
    ],
  };
  if (!ctx.sub_kegiatan_ids.length) options.limit = ctx.scan_limit;
  return SubKegiatan.unscoped().findAll(options);
}

function indexMastersByCode(rows) {
  const byCode = new Map();
  for (const row of rows || []) {
    const code = normalizeCode(row.kode_sub_kegiatan_full);
    if (!code) continue;
    if (!byCode.has(code)) byCode.set(code, []);
    byCode.get(code).push(row);
  }
  return byCode;
}

async function computePreview(ctx) {
  const subs = await listSubsForScope(ctx);

  const neededCodes = [
    ...new Set(
      subs
        .filter((s) => {
          if (s.master_sub_kegiatan_id != null) return false;
          const parentMaster = parsePositiveInt(s.kegiatan?.master_kegiatan_id);
          return Boolean(parentMaster);
        })
        .map((s) => normalizeCode(s.kode_sub_kegiatan))
        .filter(Boolean),
    ),
  ];

  const masters = neededCodes.length
    ? await MasterSubKegiatan.unscoped().findAll({
        where: {
          dataset_key: ctx.dataset_key,
          is_active: true,
          kode_sub_kegiatan_full: { [Op.in]: neededCodes },
        },
        attributes: [
          "id",
          "master_kegiatan_id",
          "dataset_key",
          "kode_sub_kegiatan",
          "kode_sub_kegiatan_full",
          "nama_sub_kegiatan",
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
  const parent_kegiatan_unmapped_items = [];
  const hierarchy_conflict_items = [];

  for (const s of subs) {
    const kode = normalizeCode(s.kode_sub_kegiatan);
    const parentMaster = parsePositiveInt(s.kegiatan?.master_kegiatan_id);

    if (s.master_sub_kegiatan_id != null) {
      already_mapped_items.push({
        sub_kegiatan_id: s.id,
        kode_sub_kegiatan: s.kode_sub_kegiatan,
        nama_sub_kegiatan: s.nama_sub_kegiatan,
        current_master_sub_kegiatan_id: s.master_sub_kegiatan_id,
      });
      continue;
    }

    if (!parentMaster) {
      parent_kegiatan_unmapped_items.push({
        sub_kegiatan_id: s.id,
        kode_sub_kegiatan: s.kode_sub_kegiatan,
        nama_sub_kegiatan: s.nama_sub_kegiatan,
        kegiatan_id: s.kegiatan_id,
        kegiatan_master_kegiatan_id: s.kegiatan?.master_kegiatan_id ?? null,
        reason:
          "Parent kegiatan belum terhubung ke master_kegiatan. Lakukan mapping kegiatan terlebih dahulu.",
      });
      continue;
    }

    if (!kode) {
      not_found_items.push({
        sub_kegiatan_id: s.id,
        kode_sub_kegiatan: s.kode_sub_kegiatan,
        nama_sub_kegiatan: s.nama_sub_kegiatan,
        reason: "Kode sub kegiatan kosong.",
      });
      continue;
    }

    const candidates = mastersByCode.get(kode) || [];
    if (candidates.length === 1) {
      const c = candidates[0];
      if (
        c.master_kegiatan_id != null &&
        Number(c.master_kegiatan_id) !== Number(parentMaster)
      ) {
        hierarchy_conflict_items.push({
          sub_kegiatan_id: s.id,
          kode_sub_kegiatan: s.kode_sub_kegiatan,
          nama_sub_kegiatan: s.nama_sub_kegiatan,
          kegiatan_master_kegiatan_id: parentMaster,
          candidate_master_kegiatan_id: c.master_kegiatan_id,
          reason:
            "Master sub kegiatan berada pada parent master kegiatan yang berbeda.",
        });
        continue;
      }
      ready_items.push({
        sub_kegiatan_id: s.id,
        kegiatan_id: s.kegiatan_id,
        kode_sub_kegiatan: s.kode_sub_kegiatan,
        nama_sub_kegiatan: s.nama_sub_kegiatan,
        candidate_master_sub_kegiatan_id: c.id,
        candidate_kode_sub_kegiatan_full: c.kode_sub_kegiatan_full,
        candidate_nama_sub_kegiatan: c.nama_sub_kegiatan,
        candidate_master_kegiatan_id: c.master_kegiatan_id,
        match_type: "exact_code",
        confidence: 1.0,
      });
      continue;
    }

    if (candidates.length > 1) {
      ambiguous_items.push({
        sub_kegiatan_id: s.id,
        kode_sub_kegiatan: s.kode_sub_kegiatan,
        nama_sub_kegiatan: s.nama_sub_kegiatan,
        candidates: candidates.map((c) => ({
          master_sub_kegiatan_id: c.id,
          master_kegiatan_id: c.master_kegiatan_id,
          kode_sub_kegiatan_full: c.kode_sub_kegiatan_full,
          nama_sub_kegiatan: c.nama_sub_kegiatan,
        })),
        reason: "Lebih dari satu kandidat master sub kegiatan dengan kode yang sama.",
      });
      continue;
    }

    not_found_items.push({
      sub_kegiatan_id: s.id,
      kode_sub_kegiatan: s.kode_sub_kegiatan,
      nama_sub_kegiatan: s.nama_sub_kegiatan,
      reason:
        "Tidak ada master_sub_kegiatan aktif dengan kode_sub_kegiatan_full yang sama.",
    });
  }

  return {
    summary: {
      total_sub_kegiatans_scanned: subs.length,
      ready_exact_match: ready_items.length,
      ambiguous: ambiguous_items.length,
      not_found: not_found_items.length,
      already_mapped: already_mapped_items.length,
      parent_kegiatan_unmapped: parent_kegiatan_unmapped_items.length,
      hierarchy_conflict: hierarchy_conflict_items.length,
      scan_limit: ctx.scan_limit,
      scan_limited: !ctx.sub_kegiatan_ids.length && subs.length >= ctx.scan_limit,
    },
    ready_items,
    ambiguous_items,
    not_found_items,
    already_mapped_items,
    parent_kegiatan_unmapped_items,
    hierarchy_conflict_items,
  };
}

async function previewSubAutoMap(body) {
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
      sub_kegiatan_ids_count: v.ctx.sub_kegiatan_ids.length,
    },
  };
}

async function executeSubAutoMap(body) {
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
        mapped_sub_kegiatan_ids: [],
        old_state_summary: { mapped_sample: [] },
        new_state_summary: { mapped_sample: [] },
      },
      context: {
        dataset_key: v.ctx.dataset_key,
        periode_id: v.ctx.periode_id,
        tahun: v.ctx.tahun,
        jenis_dokumen: v.ctx.jenis_dokumen,
        sub_kegiatan_ids_count: v.ctx.sub_kegiatan_ids.length,
      },
    };
  }

  const readySubIds = readyItems.map((x) => x.sub_kegiatan_id);
  const candidateMasterIds = [
    ...new Set(readyItems.map((x) => x.candidate_master_sub_kegiatan_id)),
  ];

  const tx = await sequelize.transaction();
  try {
    const subRows = await SubKegiatan.unscoped().findAll({
      where: {
        id: { [Op.in]: readySubIds },
        periode_id: v.ctx.periode_id,
        tahun: v.ctx.tahun,
        jenis_dokumen: v.ctx.jenis_dokumen,
      },
      transaction: tx,
      lock: tx.LOCK.UPDATE,
    });

    const kegiatanIds = [
      ...new Set(subRows.map((r) => parsePositiveInt(r.kegiatan_id)).filter(Boolean)),
    ];
    const kegiatanRows = await Kegiatan.unscoped().findAll({
      where: { id: { [Op.in]: kegiatanIds } },
      attributes: ["id", "master_kegiatan_id"],
      transaction: tx,
      lock: tx.LOCK.UPDATE,
    });

    const masterRows = await MasterSubKegiatan.unscoped().findAll({
      where: {
        id: { [Op.in]: candidateMasterIds },
        dataset_key: v.ctx.dataset_key,
        is_active: true,
      },
      transaction: tx,
    });

    const subById = new Map(subRows.map((r) => [Number(r.id), r]));
    const kegiatanById = new Map(kegiatanRows.map((r) => [Number(r.id), r]));
    const masterById = new Map(masterRows.map((r) => [Number(r.id), r]));

    const details = [];
    const mappedSubIds = [];
    const oldStateSample = [];
    const newStateSample = [];
    let mapped = 0;
    let alreadyMappedCount = 0;
    let skippedParentUnmappedCount = 0;
    let failed = 0;

    for (const item of readyItems) {
      const sid = Number(item.sub_kegiatan_id);
      const mid = Number(item.candidate_master_sub_kegiatan_id);
      const sub = subById.get(sid);

      if (!sub) {
        failed += 1;
        details.push({
          sub_kegiatan_id: sid,
          candidate_master_sub_kegiatan_id: mid,
          status: "failed",
          reason: "Sub kegiatan tidak ditemukan pada konteks eksekusi terbaru.",
        });
        continue;
      }

      if (sub.master_sub_kegiatan_id != null) {
        alreadyMappedCount += 1;
        details.push({
          sub_kegiatan_id: sid,
          kode_sub_kegiatan: sub.kode_sub_kegiatan,
          nama_sub_kegiatan: sub.nama_sub_kegiatan,
          candidate_master_sub_kegiatan_id: mid,
          status: "skipped_already_mapped",
          reason: "Sub kegiatan sudah memiliki master_sub_kegiatan_id saat eksekusi.",
          current_master_sub_kegiatan_id: sub.master_sub_kegiatan_id,
        });
        continue;
      }

      const parent = kegiatanById.get(Number(sub.kegiatan_id));
      const parentMasterId = parsePositiveInt(parent?.master_kegiatan_id);
      if (!parentMasterId) {
        skippedParentUnmappedCount += 1;
        details.push({
          sub_kegiatan_id: sid,
          kode_sub_kegiatan: sub.kode_sub_kegiatan,
          nama_sub_kegiatan: sub.nama_sub_kegiatan,
          candidate_master_sub_kegiatan_id: mid,
          status: "skipped_parent_unmapped",
          reason:
            "Parent kegiatan belum terhubung ke master_kegiatan pada saat eksekusi.",
        });
        continue;
      }

      const master = masterById.get(mid);
      if (!master) {
        failed += 1;
        details.push({
          sub_kegiatan_id: sid,
          kode_sub_kegiatan: sub.kode_sub_kegiatan,
          nama_sub_kegiatan: sub.nama_sub_kegiatan,
          candidate_master_sub_kegiatan_id: mid,
          status: "failed",
          reason:
            "Kandidat master sub kegiatan tidak ditemukan/aktif pada dataset ini.",
        });
        continue;
      }

      const subCode = normalizeCode(sub.kode_sub_kegiatan);
      const masterCode = normalizeCode(master.kode_sub_kegiatan_full);
      if (!subCode || subCode !== masterCode) {
        failed += 1;
        details.push({
          sub_kegiatan_id: sid,
          kode_sub_kegiatan: sub.kode_sub_kegiatan,
          nama_sub_kegiatan: sub.nama_sub_kegiatan,
          candidate_master_sub_kegiatan_id: mid,
          status: "failed",
          reason:
            "Kode sub kegiatan tidak lagi exact match dengan kandidat master.",
        });
        continue;
      }

      if (
        master.master_kegiatan_id != null &&
        Number(master.master_kegiatan_id) !== Number(parentMasterId)
      ) {
        failed += 1;
        details.push({
          sub_kegiatan_id: sid,
          kode_sub_kegiatan: sub.kode_sub_kegiatan,
          nama_sub_kegiatan: sub.nama_sub_kegiatan,
          candidate_master_sub_kegiatan_id: mid,
          status: "failed",
          reason:
            "Parent master kegiatan kandidat sub kegiatan tidak sama dengan parent master kegiatan transaksi.",
        });
        continue;
      }

      const oldState = snapshotSub(sub);
      const patch = {
        master_sub_kegiatan_id: master.id,
        input_mode: "MASTER",
      };
      if (sub.regulasi_versi_id == null && master.regulasi_versi_id != null) {
        patch.regulasi_versi_id = master.regulasi_versi_id;
      }

      await sub.update(patch, { transaction: tx });
      await sub.reload({ transaction: tx });

      const newState = snapshotSub(sub);
      mapped += 1;
      mappedSubIds.push(sid);

      if (oldStateSample.length < 25) oldStateSample.push(oldState);
      if (newStateSample.length < 25) newStateSample.push(newState);

      details.push({
        sub_kegiatan_id: sid,
        kode_sub_kegiatan: sub.kode_sub_kegiatan,
        nama_sub_kegiatan: sub.nama_sub_kegiatan,
        candidate_master_sub_kegiatan_id: master.id,
        candidate_kode_sub_kegiatan_full: master.kode_sub_kegiatan_full,
        candidate_nama_sub_kegiatan: master.nama_sub_kegiatan,
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
        mapped_sub_kegiatan_ids: mappedSubIds,
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
        sub_kegiatan_ids_count: v.ctx.sub_kegiatan_ids.length,
      },
    };
  } catch (err) {
    await tx.rollback();
    return {
      ok: false,
      error:
        err?.message ||
        "Eksekusi auto mapping sub kegiatan gagal (rollback transaksi).",
    };
  }
}

module.exports = {
  DEFAULT_DATASET_KEY,
  previewSubAutoMap,
  executeSubAutoMap,
};
