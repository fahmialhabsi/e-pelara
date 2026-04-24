"use strict";

const { Op } = require("sequelize");
const {
  MasterSubKegiatan,
  MasterIndikator,
  MappingSubKegiatan,
  MappingIndikator,
  MappingSubKegiatanResolution,
  SubKegiatan,
  Kegiatan,
} = require("../models");
const { compareVersi, norm } = require("./regulasiCompareService");

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}

function fuzzyRatio(s1, s2) {
  const a = norm(s1);
  const b = norm(s2);
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  if (a === b) return 1;
  const d = levenshtein(a, b);
  return 1 - d / Math.max(a.length, b.length);
}

function compareByCode(k1, k2) {
  return String(k1 || "") === String(k2 || "");
}

function compareByName(n1, n2) {
  return norm(n1) === norm(n2);
}

function scoreToStatus(score) {
  if (score >= 0.95) return "approved";
  if (score >= 0.8) return "pending";
  return "pending";
}

function normalizeKodeSubKegiatan(kode) {
  return String(kode || "").trim();
}

function normalizeJenisDokumen(val) {
  return String(val || "").trim().toLowerCase();
}

/**
 * Untuk perbandingan dengan `kegiatan.opd_penanggung_jawab` (string).
 * TODO: jika nanti `kegiatan.opd_id` integer tersedia, tambahkan fallback OR ke kolom tersebut.
 */
function normalizeOpd(val) {
  return String(val || "").trim().toLowerCase();
}

/**
 * Normalisasi scope dari request; nilai tidak dikirim → null (wildcard untuk upsert key).
 */
function normalizeSplitScope(scope) {
  const s = scope && typeof scope === "object" ? scope : {};
  const opdRaw =
    s.opd_id ??
    s.opdId ??
    s.opd_penanggung_jawab ??
    s.opdPenanggungJawab;
  const tahunRaw = s.tahun ?? s.year;
  const jenisRaw = s.jenis_dokumen ?? s.jenisDokumen;
  const tahunParsed =
    tahunRaw === undefined || tahunRaw === null || tahunRaw === ""
      ? null
      : Number.parseInt(String(tahunRaw), 10);
  const jenisNorm = normalizeJenisDokumen(jenisRaw);
  let opd_id = null;
  /** Untuk join ke `kegiatan.opd_penanggung_jawab` bila scope bukan id numerik murni. */
  let opd_filter_string = null;
  if (opdRaw !== undefined && opdRaw !== null && String(opdRaw).trim() !== "") {
    const str = String(opdRaw).trim();
    const asNum = Number.parseInt(str, 10);
    const isPureIntId =
      Number.isInteger(asNum) &&
      asNum >= 1 &&
      String(asNum) === str;
    if (isPureIntId) {
      opd_id = asNum;
    } else {
      opd_filter_string = normalizeOpd(str) || null;
    }
  }
  return {
    opd_id,
    opd_filter_string,
    tahun: Number.isInteger(tahunParsed) ? tahunParsed : null,
    jenis_dokumen: jenisNorm || null,
  };
}

/**
 * Hanya `tahun` pada sub_kegiatan (exact). `jenis_dokumen` pakai case-insensitive terpisah.
 */
function applySubKegiatanYearScope(where, normScope) {
  const attrs = SubKegiatan.rawAttributes || {};
  if (
    normScope.tahun != null &&
    Number.isInteger(normScope.tahun) &&
    attrs.tahun
  ) {
    where.tahun = normScope.tahun;
  }
  return where;
}

function buildJenisDokumenInsensitiveWhere(normScope, sequelize) {
  if (normScope.jenis_dokumen == null || !SubKegiatan.rawAttributes?.jenis_dokumen) {
    return null;
  }
  const j = normalizeJenisDokumen(normScope.jenis_dokumen);
  if (!j) return null;
  return sequelize.where(
    sequelize.fn(
      "LOWER",
      sequelize.fn("TRIM", sequelize.col("jenis_dokumen")),
    ),
    j,
  );
}

function mergeAndWhereParts(parts) {
  const flat = parts.filter(Boolean);
  if (!flat.length) return {};
  if (flat.length === 1) return flat[0];
  return { [Op.and]: flat };
}

/**
 * Resolusi SPLIT global: semua komponen scope NULL (wildcard penuh).
 */
async function findGlobalActiveSplitResolution(mappingId, transaction) {
  return MappingSubKegiatanResolution.findOne({
    where: {
      mapping_sub_kegiatan_id: mappingId,
      opd_id: { [Op.is]: null },
      tahun: { [Op.is]: null },
      jenis_dokumen: { [Op.or]: [{ [Op.is]: null }, ""] },
      is_active: true,
    },
    order: [
      ["resolved_at", "DESC"],
      ["id", "DESC"],
    ],
    transaction,
  });
}

function kegiatanModelUnscoped() {
  if (typeof Kegiatan.unscoped === "function") return Kegiatan.unscoped();
  if (typeof Kegiatan.scope === "function") return Kegiatan.scope(null);
  return Kegiatan;
}

/**
 * Filter OPD via join kegiatan: LOWER(TRIM(opd_penanggung_jawab)) = normalizeOpd(opd_id scope).
 * TODO: kolom `kegiatan.opd_id` belum ada di model ini — hanya string opd_penanggung_jawab.
 */
function buildKegiatanOpdInclude(normScope, sequelize) {
  if (!Kegiatan?.rawAttributes?.opd_penanggung_jawab) {
    return [];
  }
  const needle =
    normScope.opd_filter_string ||
    (normScope.opd_id != null && Number.isInteger(normScope.opd_id)
      ? normalizeOpd(normScope.opd_id)
      : "");
  if (!needle) return [];
  return [
    {
      model: kegiatanModelUnscoped(),
      as: "kegiatan",
      required: true,
      attributes: [],
      where: sequelize.where(
        sequelize.fn(
          "LOWER",
          sequelize.fn("TRIM", sequelize.col("kegiatan.opd_penanggung_jawab")),
        ),
        needle,
      ),
    },
  ];
}

/**
 * Kumpulkan id transaksi sub_kegiatan untuk SPLIT: old FK + scope.
 * opd_id: filter via join kegiatan (sub_kegiatan tidak punya kolom opd_id).
 */
async function findSubKegiatanIdsForSplitScope({
  oldMasterSubId,
  normScope,
  oldKodeNorm,
  transaction,
}) {
  const sequelize = SubKegiatan.sequelize;
  const subAttrs = SubKegiatan.rawAttributes || {};
  const baseInclude = buildKegiatanOpdInclude(normScope, sequelize);

  const baseFk = { master_sub_kegiatan_id: oldMasterSubId };
  applySubKegiatanYearScope(baseFk, normScope);
  const jenisW = buildJenisDokumenInsensitiveWhere(normScope, sequelize);
  const whereFk = mergeAndWhereParts([baseFk, jenisW]);

  const rowsFk = await SubKegiatan.findAll({
    where: whereFk,
    include: baseInclude,
    attributes: ["id"],
    transaction,
    subQuery: false,
  });

  const ids = new Set(rowsFk.map((r) => r.id));

  if (oldKodeNorm && subAttrs.kode_sub_kegiatan) {
    const baseKode = {
      master_sub_kegiatan_id: { [Op.is]: null },
      kode_sub_kegiatan: oldKodeNorm,
    };
    applySubKegiatanYearScope(baseKode, normScope);
    const whereKode = mergeAndWhereParts([baseKode, jenisW]);
    const rowsKode = await SubKegiatan.findAll({
      where: whereKode,
      include: baseInclude,
      attributes: ["id"],
      transaction,
      subQuery: false,
    });
    for (const r of rowsKode) ids.add(r.id);
  }

  return [...ids];
}

/**
 * Update sub_kegiatan untuk resolusi SPLIT — hanya baris yang cocok scope + old master.
 */
async function propagateSplitResolution({
  oldMasterSubId,
  selectedNewMasterSubId,
  toVid,
  userId,
  normScope,
  oldKodeNorm,
  transaction,
}) {
  const ids = await findSubKegiatanIdsForSplitScope({
    oldMasterSubId,
    normScope,
    oldKodeNorm,
    transaction,
  });
  if (!ids.length) {
    return { updatedRows: 0 };
  }
  const payload = {
    master_sub_kegiatan_id: selectedNewMasterSubId,
    regulasi_versi_id: toVid,
    input_mode: "MASTER",
    migration_status: "MIGRATED",
    migrated_at: new Date(),
    migrated_by: userId ?? null,
  };
  const [n] = await SubKegiatan.update(payload, {
    where: { id: { [Op.in]: ids } },
    transaction,
  });
  return { updatedRows: Number(n) || 0 };
}

async function diagnoseSplitZeroRows({ oldId, oldKodeNorm, transaction }) {
  const nFk = await SubKegiatan.count({
    where: { master_sub_kegiatan_id: oldId },
    transaction,
  });
  let nKode = 0;
  if (oldKodeNorm) {
    nKode = await SubKegiatan.count({
      where: {
        master_sub_kegiatan_id: { [Op.is]: null },
        kode_sub_kegiatan: oldKodeNorm,
      },
      transaction,
    });
  }
  const unscoped = nFk + nKode;
  if (unscoped === 0) {
    return {
      code: "no_transactions",
      detail:
        "Tidak ada baris sub_kegiatan dengan master_sub_kegiatan_id lama atau kode legacy yang cocok.",
    };
  }
  return {
    code: "scope_mismatch",
    detail: `Terdapat ${unscoped} baris tanpa filter scope, tetapi 0 baris cocok dengan scope/join OPD saat ini.`,
  };
}

/**
 * Ringkasan penempatan transaksi untuk satu baris mapping SPLIT (pool old + semua target new dari sibling SPLIT).
 */
async function getSplitCoverage(mappingId, transaction) {
  const mid = Number.parseInt(mappingId, 10);
  if (!Number.isInteger(mid) || mid < 1) {
    return { ok: false, message: "mappingId tidak valid" };
  }
  const map = await MappingSubKegiatan.findByPk(mid, { transaction });
  if (!map || !map.old_master_sub_kegiatan_id) {
    return { ok: false, message: "Mapping tidak ditemukan atau tanpa old master" };
  }
  const oldId = map.old_master_sub_kegiatan_id;
  const siblings = await MappingSubKegiatan.findAll({
    where: {
      old_master_sub_kegiatan_id: oldId,
      regulasi_versi_from_id: map.regulasi_versi_from_id,
      regulasi_versi_to_id: map.regulasi_versi_to_id,
      match_reason: "SPLIT",
    },
    attributes: ["new_master_sub_kegiatan_id"],
    transaction,
  });
  const newIds = [
    ...new Set(
      siblings.map((s) => s.new_master_sub_kegiatan_id).filter((id) => id != null),
    ),
  ];
  const totalAtOldMaster = await SubKegiatan.count({
    where: { master_sub_kegiatan_id: oldId },
    transaction,
  });
  const totalAtNewTargets =
    newIds.length > 0
      ? await SubKegiatan.count({
          where: { master_sub_kegiatan_id: { [Op.in]: newIds } },
          transaction,
        })
      : 0;
  const pool = totalAtOldMaster + totalAtNewTargets;
  const coveragePercent =
    pool > 0
      ? Math.round((totalAtNewTargets / pool) * 10000) / 100
      : 0;
  return {
    ok: true,
    totalAtOldMaster,
    totalAtNewTargets,
    coveragePercent,
    newTargetIds: newIds,
  };
}

async function upsertSplitResolutionRow({
  map,
  normScope,
  selectedNewId,
  oldMasterId,
  notes,
  userId,
  transaction,
}) {
  const whereKey = {
    mapping_sub_kegiatan_id: map.id,
    is_active: true,
    opd_id: normScope.opd_id,
    tahun: normScope.tahun,
    jenis_dokumen: normScope.jenis_dokumen,
  };
  const existing = await MappingSubKegiatanResolution.findOne({
    where: whereKey,
    transaction,
  });
  const values = {
    old_master_sub_kegiatan_id: oldMasterId,
    selected_new_master_sub_kegiatan_id: selectedNewId,
    notes: notes != null ? String(notes) : null,
    resolved_by: userId ?? null,
    resolved_at: new Date(),
    is_active: true,
  };
  if (existing) {
    await existing.update(values, { transaction });
    return existing;
  }
  return MappingSubKegiatanResolution.create(
    {
      mapping_sub_kegiatan_id: map.id,
      opd_id: normScope.opd_id,
      tahun: normScope.tahun,
      jenis_dokumen: normScope.jenis_dokumen,
      is_active: true,
      old_master_sub_kegiatan_id: oldMasterId,
      selected_new_master_sub_kegiatan_id: selectedNewId,
      notes: values.notes,
      resolved_by: values.resolved_by,
      resolved_at: values.resolved_at,
    },
    { transaction },
  );
}

/**
 * Validasi selected new id termasuk kandidat SPLIT (baris mapping lain, same old + versi).
 */
async function assertSplitCandidateValid({
  map,
  selectedNewMasterSubKegiatanId,
  transaction,
}) {
  const siblings = await MappingSubKegiatan.findAll({
    where: {
      old_master_sub_kegiatan_id: map.old_master_sub_kegiatan_id,
      regulasi_versi_from_id: map.regulasi_versi_from_id,
      regulasi_versi_to_id: map.regulasi_versi_to_id,
      match_reason: "SPLIT",
    },
    attributes: ["id", "new_master_sub_kegiatan_id"],
    transaction,
  });
  const allowed = new Set(
    siblings
      .map((s) => s.new_master_sub_kegiatan_id)
      .filter((id) => id != null),
  );
  return allowed.has(selectedNewMasterSubKegiatanId);
}

async function executeResolveSplitInTransaction({
  mappingId,
  selectedNewMasterSubKegiatanId,
  scope,
  notes,
  userId,
  transaction,
}) {
  const mid = Number.parseInt(mappingId, 10);
  if (!Number.isInteger(mid) || mid < 1) {
    return { ok: false, message: "mappingId tidak valid" };
  }

  const map = await MappingSubKegiatan.findByPk(mid, { transaction });
  if (!map) {
    return { ok: false, message: "Mapping tidak ditemukan" };
  }
  if (String(map.match_reason || "") !== "SPLIT") {
    return {
      ok: false,
      message: "Bukan mapping SPLIT; gunakan apply biasa atau setNewSub",
    };
  }

  let sel = Number.parseInt(selectedNewMasterSubKegiatanId, 10);
  if (!Number.isInteger(sel) || sel < 1) {
    const glob = await findGlobalActiveSplitResolution(map.id, transaction);
    if (glob?.selected_new_master_sub_kegiatan_id) {
      sel = glob.selected_new_master_sub_kegiatan_id;
    }
  }
  if (!Number.isInteger(sel) || sel < 1) {
    return {
      ok: false,
      message:
        "selectedNewMasterSubKegiatanId wajib, atau simpan resolusi global (scope opd/tahun/jenis semua null) terlebih dahulu",
    };
  }

  const okCandidate = await assertSplitCandidateValid({
    map,
    selectedNewMasterSubKegiatanId: sel,
    transaction,
  });
  if (!okCandidate) {
    return {
      ok: false,
      message:
        "selected_new bukan kandidat SPLIT yang sah untuk old_master_sub_kegiatan_id ini",
    };
  }

  const normScope = normalizeSplitScope(scope);
  const oldId = map.old_master_sub_kegiatan_id;
  if (!oldId) {
    return { ok: false, message: "old_master_sub_kegiatan_id kosong pada mapping" };
  }

  const oldKodeNorm = normalizeKodeSubKegiatan(map.old_kode_sub_kegiatan_full);
  const prop = await propagateSplitResolution({
    oldMasterSubId: oldId,
    selectedNewMasterSubId: sel,
    toVid: map.regulasi_versi_to_id,
    userId,
    normScope,
    oldKodeNorm,
    transaction,
  });

  let diagnosis = null;
  if (prop.updatedRows === 0) {
    diagnosis = await diagnoseSplitZeroRows({
      oldId,
      oldKodeNorm,
      transaction,
    });
  }

  const resolution = await upsertSplitResolutionRow({
    map,
    normScope,
    selectedNewId: sel,
    oldMasterId: oldId,
    notes,
    userId,
    transaction,
  });

  const coverage = await getSplitCoverage(map.id, transaction);

  console.log("[SPLIT_RESOLVE]", {
    mappingId: map.id,
    scope: normScope,
    updatedRows: prop.updatedRows,
    coverage: coverage.ok ? coverage : { error: coverage.message },
    zeroReason: diagnosis?.code,
  });

  const warning =
    prop.updatedRows === 0
      ? diagnosis?.code === "no_transactions"
        ? "0 baris ter-update: tidak ada transaksi sub_kegiatan untuk old master / kode legacy."
        : "0 baris ter-update: ada transaksi namun filter scope tidak cocok (scope mismatch)."
      : undefined;

  return {
    ok: true,
    mappingId: map.id,
    resolutionId: resolution.id,
    updatedRows: prop.updatedRows,
    scope: normScope,
    warning,
    warningDetail: diagnosis || undefined,
    coverage: coverage.ok ? coverage : undefined,
  };
}

/**
 * Resolusi admin untuk mapping SPLIT: propagate scoped ke sub_kegiatan + upsert resolution.
 */
async function resolveSplitMapping({
  mappingId,
  selectedNewMasterSubKegiatanId,
  scope,
  notes,
  userId,
}) {
  const sequelize = MappingSubKegiatan.sequelize;
  return sequelize.transaction(async (t) => {
    const r = await executeResolveSplitInTransaction({
      mappingId,
      selectedNewMasterSubKegiatanId,
      scope,
      notes,
      userId,
      transaction: t,
    });
    return r;
  });
}

/** Simulasi resolve-split; rollback transaksi (tidak mengubah data permanen). */
async function testResolveSplitMapping({
  mappingId,
  selectedNewMasterSubKegiatanId,
  scope,
  notes,
  userId,
}) {
  const sequelize = MappingSubKegiatan.sequelize;
  const t = await sequelize.transaction();
  try {
    const r = await executeResolveSplitInTransaction({
      mappingId,
      selectedNewMasterSubKegiatanId,
      scope,
      notes,
      userId,
      transaction: t,
    });
    await t.rollback();
    return { ...r, rolledBack: true };
  } catch (err) {
    await t.rollback().catch(() => {});
    throw err;
  }
}

/** Daftar resolution aktif untuk satu baris mapping SPLIT. */
async function listSplitResolutions({ mappingId }) {
  const mid = Number.parseInt(mappingId, 10);
  if (!Number.isInteger(mid) || mid < 1) {
    return { ok: false, message: "mappingId tidak valid", data: [] };
  }
  const rows = await MappingSubKegiatanResolution.findAll({
    where: { mapping_sub_kegiatan_id: mid, is_active: true },
    order: [["resolved_at", "DESC"], ["id", "DESC"]],
    include: [
      { association: "selectedNewSub", required: false, attributes: ["id", "kode_sub_kegiatan_full", "nama_sub_kegiatan"] },
    ],
  });
  return {
    ok: true,
    data: rows.map((x) => x.get({ plain: true })),
  };
}

async function loadSubsTree(regulasiVersiId) {
  return MasterSubKegiatan.findAll({
    where: { regulasi_versi_id: regulasiVersiId },
    include: [
      {
        association: "masterKegiatan",
        required: true,
        include: [
          {
            association: "masterProgram",
            required: true,
            attributes: ["id", "kode_program_full", "nama_program"],
          },
        ],
        attributes: [
          "id",
          "kode_kegiatan_full",
          "nama_kegiatan",
          "master_program_id",
        ],
      },
    ],
  });
}

async function upsertSubMapping(payload, transaction) {
  const where = {
    regulasi_versi_from_id: payload.regulasi_versi_from_id,
    regulasi_versi_to_id: payload.regulasi_versi_to_id,
    old_master_sub_kegiatan_id: payload.old_master_sub_kegiatan_id,
    new_master_sub_kegiatan_id:
      payload.new_master_sub_kegiatan_id != null
        ? payload.new_master_sub_kegiatan_id
        : { [Op.is]: null },
  };
  const [row, created] = await MappingSubKegiatan.findOrCreate({
    where,
    defaults: payload,
    transaction,
  });
  if (!created) {
    await row.update(
      {
        confidence_score: payload.confidence_score,
        status: payload.status,
        match_reason: payload.match_reason,
        mapping_type: payload.mapping_type,
        old_kode_sub_kegiatan_full: payload.old_kode_sub_kegiatan_full,
        new_kode_sub_kegiatan_full: payload.new_kode_sub_kegiatan_full,
        old_nama_sub_kegiatan: payload.old_nama_sub_kegiatan,
        new_nama_sub_kegiatan: payload.new_nama_sub_kegiatan,
      },
      { transaction },
    );
  }
  return row;
}

/**
 * Auto-mapping sub kegiatan + indikator antara dua versi regulasi.
 */
async function runAutoMapping({ fromVersiId, toVersiId, transaction: extTx }) {
  const sequelize = MasterSubKegiatan.sequelize;
  const run = async (t) => {
    const oldSubs = await loadSubsTree(fromVersiId);
    const newSubs = await loadSubsTree(toVersiId);
    const newByKode = new Map();
    for (const n of newSubs) {
      const k = n.kode_sub_kegiatan_full;
      if (!newByKode.has(k)) newByKode.set(k, []);
      newByKode.get(k).push(n);
    }

    const summary = {
      exactCode: 0,
      fuzzy: 0,
      split: 0,
      manual: 0,
      indikatorMapped: 0,
    };

    for (const oldSub of oldSubs) {
      const ok = oldSub.kode_sub_kegiatan_full;
      const on = oldSub.nama_sub_kegiatan;
      const oldK = oldSub.masterKegiatan;
      const oldP = oldK?.masterProgram;
      const pkOld = oldP?.kode_program_full;
      const kkOld = oldK?.kode_kegiatan_full;

      const codeMatches = newByKode.get(ok) || [];

      if (codeMatches.length === 1) {
        const neu = codeMatches[0];
        const score = 1;
        const st = scoreToStatus(score);
        const mapRow = await upsertSubMapping(
          {
            regulasi_versi_from_id: fromVersiId,
            regulasi_versi_to_id: toVersiId,
            old_master_sub_kegiatan_id: oldSub.id,
            new_master_sub_kegiatan_id: neu.id,
            old_kode_sub_kegiatan_full: ok,
            new_kode_sub_kegiatan_full: neu.kode_sub_kegiatan_full,
            old_nama_sub_kegiatan: on,
            new_nama_sub_kegiatan: neu.nama_sub_kegiatan,
            confidence_score: score,
            mapping_type: "auto",
            status: st,
            match_reason: "EXACT_CODE",
          },
          t,
        );
        summary.exactCode += 1;
        summary.indikatorMapped += await mapIndikatorsPair({
          fromVersiId,
          toVersiId,
          oldSubId: oldSub.id,
          newSubId: neu.id,
          mappingSubKegiatanId: mapRow?.id ?? null,
          transaction: t,
        });
        continue;
      }

      if (codeMatches.length > 1) {
        for (const neu of codeMatches) {
          const splitRow = await upsertSubMapping(
            {
              regulasi_versi_from_id: fromVersiId,
              regulasi_versi_to_id: toVersiId,
              old_master_sub_kegiatan_id: oldSub.id,
              new_master_sub_kegiatan_id: neu.id,
              old_kode_sub_kegiatan_full: ok,
              new_kode_sub_kegiatan_full: neu.kode_sub_kegiatan_full,
              old_nama_sub_kegiatan: on,
              new_nama_sub_kegiatan: neu.nama_sub_kegiatan,
              confidence_score: 1,
              mapping_type: "auto",
              status: "pending",
              match_reason: "SPLIT",
            },
            t,
          );
          summary.split += 1;
          summary.indikatorMapped += await mapIndikatorsPair({
            fromVersiId,
            toVersiId,
            oldSubId: oldSub.id,
            newSubId: neu.id,
            mappingSubKegiatanId: splitRow.id,
            transaction: t,
          });
        }
        continue;
      }

      const lineageCandidates = newSubs.filter((n) => {
        const nk = n.masterKegiatan;
        const np = nk?.masterProgram;
        return (
          np?.kode_program_full === pkOld && nk?.kode_kegiatan_full === kkOld
        );
      });

      let best = { sub: null, score: 0 };
      for (const n of lineageCandidates) {
        const sc = fuzzyRatio(on, n.nama_sub_kegiatan);
        if (sc > best.score) best = { sub: n, score: sc };
      }

      if (best.sub && best.score >= 0.8) {
        const reason =
          best.score >= 0.99 || compareByName(on, best.sub.nama_sub_kegiatan)
            ? "EXACT_NAME"
            : "FUZZY_NAME";
        const st = scoreToStatus(best.score);
        const fzRow = await upsertSubMapping(
          {
            regulasi_versi_from_id: fromVersiId,
            regulasi_versi_to_id: toVersiId,
            old_master_sub_kegiatan_id: oldSub.id,
            new_master_sub_kegiatan_id: best.sub.id,
            old_kode_sub_kegiatan_full: ok,
            new_kode_sub_kegiatan_full: best.sub.kode_sub_kegiatan_full,
            old_nama_sub_kegiatan: on,
            new_nama_sub_kegiatan: best.sub.nama_sub_kegiatan,
            confidence_score: Number(best.score.toFixed(4)),
            mapping_type: "auto",
            status: st,
            match_reason: reason,
          },
          t,
        );
        summary.fuzzy += 1;
        summary.indikatorMapped += await mapIndikatorsPair({
          fromVersiId,
          toVersiId,
          oldSubId: oldSub.id,
          newSubId: best.sub.id,
          mappingSubKegiatanId: fzRow?.id ?? null,
          transaction: t,
        });
        continue;
      }

      await upsertSubMapping(
        {
          regulasi_versi_from_id: fromVersiId,
          regulasi_versi_to_id: toVersiId,
          old_master_sub_kegiatan_id: oldSub.id,
          new_master_sub_kegiatan_id: null,
          old_kode_sub_kegiatan_full: ok,
          new_kode_sub_kegiatan_full: null,
          old_nama_sub_kegiatan: on,
          new_nama_sub_kegiatan: null,
          confidence_score: 0,
          mapping_type: "auto",
          status: "pending",
          match_reason: "PERLU_MAPPING_MANUAL",
        },
        t,
      );
      summary.manual += 1;
    }

    return summary;
  };

  if (extTx) return run(extTx);
  return sequelize.transaction(run);
}

async function mapIndikatorsPair({
  fromVersiId,
  toVersiId,
  oldSubId,
  newSubId,
  mappingSubKegiatanId,
  transaction,
}) {
  const olds = await MasterIndikator.findAll({
    where: {
      regulasi_versi_id: fromVersiId,
      master_sub_kegiatan_id: oldSubId,
    },
    transaction,
  });
  const news = await MasterIndikator.findAll({
    where: {
      regulasi_versi_id: toVersiId,
      master_sub_kegiatan_id: newSubId,
    },
    transaction,
  });
  let n = 0;
  for (const o of olds) {
    const exact = news.find(
      (x) =>
        norm(x.indikator) === norm(o.indikator) &&
        norm(x.satuan) === norm(o.satuan),
    );
    if (exact) {
      await upsertIndikatorMapping(
        {
          regulasi_versi_from_id: fromVersiId,
          regulasi_versi_to_id: toVersiId,
          mapping_sub_kegiatan_id: mappingSubKegiatanId,
          old_master_indikator_id: o.id,
          new_master_indikator_id: exact.id,
          old_indikator_text: o.indikator,
          new_indikator_text: exact.indikator,
          old_satuan: o.satuan,
          new_satuan: exact.satuan,
          confidence_score: 1,
          mapping_type: "auto",
          status: "approved",
          match_reason: "EXACT_CODE",
        },
        transaction,
      );
      n += 1;
      continue;
    }
    let best = { row: null, score: 0 };
    for (const x of news) {
      const sc =
        (fuzzyRatio(o.indikator, x.indikator) +
          fuzzyRatio(o.satuan || "", x.satuan || "")) /
        2;
      if (sc > best.score) best = { row: x, score: sc };
    }
    if (best.row && best.score >= 0.8) {
      await upsertIndikatorMapping(
        {
          regulasi_versi_from_id: fromVersiId,
          regulasi_versi_to_id: toVersiId,
          mapping_sub_kegiatan_id: mappingSubKegiatanId,
          old_master_indikator_id: o.id,
          new_master_indikator_id: best.row.id,
          old_indikator_text: o.indikator,
          new_indikator_text: best.row.indikator,
          old_satuan: o.satuan,
          new_satuan: best.row.satuan,
          confidence_score: Number(best.score.toFixed(4)),
          mapping_type: "auto",
          status: scoreToStatus(best.score),
          match_reason: "FUZZY_NAME",
        },
        transaction,
      );
      n += 1;
    } else {
      await upsertIndikatorMapping(
        {
          regulasi_versi_from_id: fromVersiId,
          regulasi_versi_to_id: toVersiId,
          mapping_sub_kegiatan_id: mappingSubKegiatanId,
          old_master_indikator_id: o.id,
          new_master_indikator_id: null,
          old_indikator_text: o.indikator,
          new_indikator_text: null,
          old_satuan: o.satuan,
          new_satuan: null,
          confidence_score: 0,
          mapping_type: "auto",
          status: "pending",
          match_reason: "PERLU_MAPPING_MANUAL",
        },
        transaction,
      );
    }
  }
  return n;
}

async function upsertIndikatorMapping(payload, transaction) {
  const where = {
    regulasi_versi_from_id: payload.regulasi_versi_from_id,
    regulasi_versi_to_id: payload.regulasi_versi_to_id,
    old_master_indikator_id: payload.old_master_indikator_id,
    new_master_indikator_id:
      payload.new_master_indikator_id != null
        ? payload.new_master_indikator_id
        : { [Op.is]: null },
  };
  const [row, created] = await MappingIndikator.findOrCreate({
    where,
    defaults: payload,
    transaction,
  });
  if (!created) {
    await row.update(
      {
        confidence_score: payload.confidence_score,
        status: payload.status,
        match_reason: payload.match_reason,
        new_indikator_text: payload.new_indikator_text,
        new_satuan: payload.new_satuan,
      },
      { transaction },
    );
  }
  return row;
}

function aggregateStatus(rows) {
  return rows.reduce((acc, r) => {
    const s = r.status || "unknown";
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
}

async function getMigrationStatus({ fromVersiId, toVersiId }) {
  const subRows = await MappingSubKegiatan.findAll({
    where: {
      regulasi_versi_from_id: fromVersiId,
      regulasi_versi_to_id: toVersiId,
    },
    attributes: ["id", "status"],
    raw: true,
  });
  const indRows = await MappingIndikator.findAll({
    where: {
      regulasi_versi_from_id: fromVersiId,
      regulasi_versi_to_id: toVersiId,
    },
    attributes: ["id", "status"],
    raw: true,
  });

  return {
    mappingSubKegiatan: aggregateStatus(subRows),
    mappingIndikator: aggregateStatus(indRows),
    totals: {
      mappingSubKegiatan: subRows.length,
      mappingIndikator: indRows.length,
    },
  };
}

/**
 * Terapkan hasil mapping regulasi ke baris transaksi sub_kegiatan.
 * - Prioritas: baris yang sudah punya master_sub_kegiatan_id = old id.
 * - Tambahan aman: baris legacy dengan FK null tetapi kode_sub_kegiatan = kode lama master.
 *
 * TODO fase lanjut: propagasi konsisten ke program/kegiatan transaksi bila seluruh pohon direkonsiliasi.
 */
async function propagateSubKegiatanFromMapping(mapRow, userId, transaction) {
  const newId = mapRow.new_master_sub_kegiatan_id;
  const oldId = mapRow.old_master_sub_kegiatan_id;
  const toVid = mapRow.regulasi_versi_to_id;
  if (!newId || mapRow.status !== "approved") {
    return { updatedByFk: 0, updatedByKode: 0 };
  }

  const payload = {
    master_sub_kegiatan_id: newId,
    regulasi_versi_id: toVid,
    input_mode: "MASTER",
    migration_status: "MIGRATED",
    migrated_at: new Date(),
    migrated_by: userId ?? null,
  };

  const [byFk] = await SubKegiatan.update(payload, {
    where: { master_sub_kegiatan_id: oldId },
    transaction,
  });

  let byKode = 0;
  const oldKodeNorm = normalizeKodeSubKegiatan(mapRow.old_kode_sub_kegiatan_full);
  // Exact match (nilai ter-normalisasi); bukan LIKE.
  // TODO: jika transaksi vs master beda format kode (ringkas vs full), tambahkan kamus/normalisasi lanjutan.
  if (oldKodeNorm) {
    const [n] = await SubKegiatan.update(payload, {
      where: {
        master_sub_kegiatan_id: { [Op.is]: null },
        kode_sub_kegiatan: oldKodeNorm,
      },
      transaction,
    });
    byKode = n;
  }

  return { updatedByFk: byFk, updatedByKode: byKode };
}

async function buildPreview({ fromVersiId, toVersiId }) {
  const compare = await compareVersi(fromVersiId, toVersiId);
  const maps = await MappingSubKegiatan.findAll({
    where: {
      regulasi_versi_from_id: fromVersiId,
      regulasi_versi_to_id: toVersiId,
    },
    include: [
      { association: "oldSub", required: false },
      { association: "newSub", required: false },
    ],
    order: [["id", "ASC"]],
  });

  const rows = maps.map((m) => {
    const plain = m.get({ plain: true });
    const reason = plain.match_reason;
    const uiStatus =
      plain.status === "approved"
        ? "otomatis"
        : reason === "PERLU_MAPPING_MANUAL"
          ? "perlu_mapping_manual"
          : reason === "SPLIT"
            ? "split"
            : "review";

    const warn = [];
    if (
      plain.old_kode_sub_kegiatan_full !== plain.new_kode_sub_kegiatan_full &&
      plain.new_kode_sub_kegiatan_full
    )
      warn.push("Kode berubah");
    if (
      plain.old_nama_sub_kegiatan &&
      plain.new_nama_sub_kegiatan &&
      !compareByName(plain.old_nama_sub_kegiatan, plain.new_nama_sub_kegiatan)
    )
      warn.push("Nama berubah");
    if (!plain.new_master_sub_kegiatan_id)
      warn.push("Belum ada pasangan sub di regulasi baru");

    return {
      mappingId: plain.id,
      old: {
        id: plain.old_master_sub_kegiatan_id,
        kode: plain.old_kode_sub_kegiatan_full,
        nama: plain.old_nama_sub_kegiatan,
        label: [plain.old_kode_sub_kegiatan_full, plain.old_nama_sub_kegiatan]
          .filter(Boolean)
          .join(" - "),
      },
      new: {
        id: plain.new_master_sub_kegiatan_id,
        kode: plain.new_kode_sub_kegiatan_full,
        nama: plain.new_nama_sub_kegiatan,
        label: plain.new_kode_sub_kegiatan_full
          ? [plain.new_kode_sub_kegiatan_full, plain.new_nama_sub_kegiatan]
              .filter(Boolean)
              .join(" - ")
          : null,
      },
      confidence: Number(plain.confidence_score),
      status: plain.status,
      matchReason: reason,
      uiStatus,
      warnings: warn,
    };
  });

  return {
    compare,
    mappingSubKegiatan: rows,
    summary: {
      totalMappings: rows.length,
      needManual: rows.filter((r) => r.matchReason === "PERLU_MAPPING_MANUAL")
        .length,
      pendingReview: rows.filter((r) => r.status === "pending").length,
    },
  };
}

/**
 * Simulasi propagate satu mapping: transaksi di-rollback, mapping tidak diubah.
 * Memakai status "approved" sementara agar propagateSubKegiatanFromMapping jalan.
 */
async function testPropagateMapping({ mappingId, userId }) {
  const sequelize = MappingSubKegiatan.sequelize;
  const id = Number.parseInt(mappingId, 10);
  if (!Number.isInteger(id) || id < 1) {
    return { ok: false, message: "mappingId tidak valid" };
  }

  const map = await MappingSubKegiatan.findByPk(id);
  if (!map) {
    return { ok: false, message: "Mapping tidak ditemukan" };
  }

  const plain = map.get({ plain: true });
  if (!plain.new_master_sub_kegiatan_id) {
    return {
      ok: false,
      message: "new_master_sub_kegiatan_id kosong; tidak dapat mensimulasikan propagate",
    };
  }

  const rowForPropagate = { ...plain, status: "approved" };
  const t = await sequelize.transaction();
  try {
    const propagation = await propagateSubKegiatanFromMapping(
      rowForPropagate,
      userId,
      t,
    );
    await t.rollback();
    return {
      ok: true,
      rolledBack: true,
      mappingId: id,
      updatedByFk: Number(propagation.updatedByFk) || 0,
      updatedByKode: Number(propagation.updatedByKode) || 0,
    };
  } catch (err) {
    await t.rollback().catch(() => {});
    throw err;
  }
}

async function applyDecisions({ decisions, userId }) {
  const sequelize = MappingSubKegiatan.sequelize;

  return sequelize.transaction(async (t) => {
    const results = [];
    let totalUpdatedRows = 0;

    for (const d of decisions || []) {
      const id = d.mappingId ?? d.id;
      const action = d.action;
      if (!id || !action) continue;
      const map = await MappingSubKegiatan.findByPk(id, { transaction: t });
      if (!map) {
        results.push({
          mappingId: id,
          ok: false,
          status: "error",
          message: "Mapping tidak ditemukan",
        });
        continue;
      }
      const mappingId = map.id;

      if (action === "approve") {
        const alreadyApplied =
          map.status === "approved" &&
          map.applied_count != null &&
          Number(map.applied_count) > 0;
        if (alreadyApplied) {
          results.push({
            mappingId,
            ok: true,
            status: "already_applied",
            updatedByFk: 0,
            updatedByKode: 0,
            appliedCount: Number(map.applied_count) || 0,
            message: "Mapping sudah pernah di-apply; dilewati (idempotent)",
          });
          continue;
        }

        const splitReason = String(map.match_reason || "") === "SPLIT";
        if (splitReason) {
          results.push({
            mappingId,
            ok: false,
            status: "blocked_split",
            updatedByFk: 0,
            updatedByKode: 0,
            warning: "Mapping SPLIT harus diselesaikan manual",
          });
          continue;
        }

        if (!map.new_master_sub_kegiatan_id) {
          results.push({
            mappingId,
            ok: false,
            status: "blocked_no_target",
            updatedByFk: 0,
            updatedByKode: 0,
            warning:
              "Tidak ada new_master_sub_kegiatan_id; selesaikan mapping atau gunakan setNewSub",
          });
          continue;
        }

        await map.update(
          { status: "approved", mapping_type: "manual" },
          { transaction: t },
        );
        await map.reload({ transaction: t });

        const propagation = await propagateSubKegiatanFromMapping(
          map,
          userId,
          t,
        );
        const updatedByFk = Number(propagation.updatedByFk) || 0;
        const updatedByKode = Number(propagation.updatedByKode) || 0;
        const appliedCount = updatedByFk + updatedByKode;
        totalUpdatedRows += appliedCount;

        console.log("[MIGRATION]", {
          mappingId,
          updatedByFk,
          updatedByKode,
          action: "approve",
        });

        const appliedNow = new Date();
        await map.update(
          {
            applied_at: appliedNow,
            applied_by: userId ?? null,
            applied_count: appliedCount,
          },
          { transaction: t },
        );

        const entry = {
          mappingId,
          ok: true,
          status: "approved",
          updatedByFk,
          updatedByKode,
          appliedCount,
          appliedAt: appliedNow.toISOString(),
          appliedBy: userId ?? null,
        };
        if (appliedCount === 0) {
          entry.warning =
            "Tidak ada baris sub_kegiatan ter-update (cek FK lama atau kesesuaian kode_sub_kegiatan)";
        }
        results.push(entry);
        continue;
      }

      if (action === "reject") {
        await map.update({ status: "rejected" }, { transaction: t });
        results.push({
          mappingId,
          ok: true,
          status: "rejected",
          updatedByFk: 0,
          updatedByKode: 0,
        });
        continue;
      }

      if (action === "skip") {
        results.push({
          mappingId,
          ok: true,
          status: "skipped",
          updatedByFk: 0,
          updatedByKode: 0,
        });
        continue;
      }

      if (action === "setNewSub" && d.newMasterSubKegiatanId) {
        const neu = await MasterSubKegiatan.findByPk(d.newMasterSubKegiatanId, {
          transaction: t,
        });
        if (!neu) {
          results.push({
            mappingId,
            ok: false,
            status: "error",
            message: "Master sub kegiatan target tidak ditemukan",
            updatedByFk: 0,
            updatedByKode: 0,
          });
          continue;
        }

        await map.update(
          {
            new_master_sub_kegiatan_id: neu.id,
            new_kode_sub_kegiatan_full: neu.kode_sub_kegiatan_full,
            new_nama_sub_kegiatan: neu.nama_sub_kegiatan,
            confidence_score: 1,
            status: "approved",
            mapping_type: "manual",
            match_reason: "MANUAL_USER",
          },
          { transaction: t },
        );
        await map.reload({ transaction: t });

        const propagation = await propagateSubKegiatanFromMapping(
          map,
          userId,
          t,
        );
        const updatedByFk = Number(propagation.updatedByFk) || 0;
        const updatedByKode = Number(propagation.updatedByKode) || 0;
        const appliedCount = updatedByFk + updatedByKode;
        totalUpdatedRows += appliedCount;

        console.log("[MIGRATION]", {
          mappingId,
          updatedByFk,
          updatedByKode,
          action: "setNewSub",
        });

        const appliedNowManual = new Date();
        await map.update(
          {
            applied_at: appliedNowManual,
            applied_by: userId ?? null,
            applied_count: appliedCount,
          },
          { transaction: t },
        );

        const entryManual = {
          mappingId,
          ok: true,
          status: "approved_manual_target",
          updatedByFk,
          updatedByKode,
          appliedCount,
          appliedAt: appliedNowManual.toISOString(),
          appliedBy: userId ?? null,
        };
        if (appliedCount === 0) {
          entryManual.warning =
            "Tidak ada baris sub_kegiatan ter-update (cek FK lama atau kesesuaian kode_sub_kegiatan)";
        }
        results.push(entryManual);
        continue;
      }

      results.push({
        mappingId,
        ok: false,
        status: "unknown_action",
        message: `Aksi tidak dikenal: ${action}`,
        updatedByFk: 0,
        updatedByKode: 0,
      });
    }

    const summary = {
      totalApproved: results.filter(
        (r) => r.status === "approved" || r.status === "approved_manual_target",
      ).length,
      totalAlreadyApplied: results.filter((r) => r.status === "already_applied")
        .length,
      totalRejected: results.filter((r) => r.status === "rejected").length,
      totalSkipped: results.filter((r) => r.status === "skipped").length,
      totalUpdatedRows,
      totalBlocked: results.filter((r) => r.ok === false).length,
    };

    return {
      results,
      summary,
      appliedBy: userId || null,
    };
  });
}

module.exports = {
  compareByCode,
  compareByName,
  fuzzyMatchName: fuzzyRatio,
  normalizeKodeSubKegiatan,
  normalizeJenisDokumen,
  normalizeOpd,
  normalizeSplitScope,
  getSplitCoverage,
  propagateSplitResolution,
  resolveSplitMapping,
  testResolveSplitMapping,
  listSplitResolutions,
  runAutoMapping,
  getMigrationStatus,
  buildPreview,
  applyDecisions,
  mapIndikatorsPair,
  propagateSubKegiatanFromMapping,
  testPropagateMapping,
};
