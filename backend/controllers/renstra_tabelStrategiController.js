// controllers/renstra_tabelStrategiController.js
const { Op, QueryTypes } = require('sequelize');

const {
  sequelize,
  RenstraTabelStrategi,
  RenstraStrategi,
  IndikatorRenstra,
  IndikatorStrategi,
  RenstraAuditLogGlobal,
} = require('../models');

const { attachCacheToRows, applyPaguFromCache } = require('../services/renstraPaguCacheHelper');
// const { syncStrategi } = require('../services/renstraPaguCachedIncrementalSyncService');
// Dinonaktifkan sementara karena service masih membaca kolom turunan yang belum valid.
const { buildBaseRenstraPayload } = require('../services/renstraPayloadBuilderHelper');

// ========================= UTIL =========================

const roundUp2 = (value) => {
  const num = Number(value) || 0;
  return Math.ceil(num * 100) / 100;
};

const toPositiveNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
};

const pickPositiveNumber = (...values) => {
  for (const value of values) {
    const number = toPositiveNumber(value);
    if (number > 0) return number;
  }

  return 0;
};

const splitPaguToFiveYears = (total) => {
  const paguAcuan = toPositiveNumber(total);
  const paguDasar = Math.floor(paguAcuan / 5);
  const sisaPagu = paguAcuan - paguDasar * 5;

  return {
    pagu_tahun_1: paguDasar,
    pagu_tahun_2: paguDasar,
    pagu_tahun_3: paguDasar,
    pagu_tahun_4: paguDasar,
    pagu_tahun_5: paguDasar + sisaPagu,
    pagu_tahun_6: 0,
    pagu_akhir_renstra: paguAcuan,
  };
};

// 🔴 HANYA HITUNG TARGET.
// 🔴 PAGU STRATEGI TIDAK DIHITUNG DI CONTROLLER, TAPI DIBACA DARI CACHE.
const computeFinal = (data = {}) => {
  const targets = [1, 2, 3, 4, 5].map((i) => Number(data?.[`target_tahun_${i}`]) || 0);

  const avg = targets.length ? targets.reduce((a, b) => a + b, 0) / targets.length : 0;

  return {
    target_tahun_6: 0,
    target_akhir_renstra: roundUp2(avg),
  };
};

const applyTargetFinalIfMissing = (item) => {
  const json = item?.toJSON ? item.toJSON() : { ...item };

  if (
    json.target_akhir_renstra === null ||
    json.target_akhir_renstra === undefined ||
    json.target_akhir_renstra === ''
  ) {
    json.target_akhir_renstra = computeFinal(json).target_akhir_renstra;
  }

  return json;
};

const getUserId = (req) => {
  return req.user?.id || req.user?.userId || req.userId || null;
};

const allowApprovedStrategiUpdate = async (transaction) => {
  await sequelize.query('SET @allow_approved_strategi_update = 1', {
    transaction,
  });
};

const lockApprovedStrategiUpdate = async (transaction) => {
  await sequelize.query('SET @allow_approved_strategi_update = 0', {
    transaction,
  });
};

const writeGlobalAudit = async ({
  module = 'strategi',
  entity_id,
  action,
  before_json = null,
  after_json = null,
  user_id = null,
  transaction,
}) => {
  await RenstraAuditLogGlobal.create(
    {
      module,
      entity_id,
      action,
      before_json,
      after_json,
      user_id,
    },
    { transaction },
  );
};

const parseJsonField = (value) => {
  if (!value) return {};
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

const sanitizeHistoryPayload = (json) => {
  const {
    id,
    createdAt,
    updatedAt,
    strategi,
    indikator_detail,
    renstra,
    histories,
    children,
    ...payload
  } = json || {};

  return payload;
};

const insertHistory = async ({ current, afterData, alasanRevisi, userId, transaction }) => {
  const beforeJson = current.toJSON ? current.toJSON() : current;
  const versiSebelum = Number(beforeJson.versi || 1);
  const versiSesudah = versiSebelum + 1;

  await sequelize.query(
    `
    INSERT INTO renstra_tabel_strategi_history
    (
      renstra_tabel_strategi_id,
      renstra_id,
      strategi_id,
      indikator_id,
      versi_sebelum,
      versi_sesudah,
      before_json,
      after_json,
      alasan_revisi,
      status_revisi,
      dibuat_oleh,
      dibuat_pada,
      createdAt,
      updatedAt
    )
    VALUES
    (
      :renstra_tabel_strategi_id,
      :renstra_id,
      :strategi_id,
      :indikator_id,
      :versi_sebelum,
      :versi_sesudah,
      CAST(:before_json AS JSON),
      CAST(:after_json AS JSON),
      :alasan_revisi,
      'draft',
      :dibuat_oleh,
      NOW(),
      NOW(),
      NOW()
    )
    `,
    {
      replacements: {
        renstra_tabel_strategi_id: beforeJson.id,
        renstra_id: afterData.renstra_id,
        strategi_id: afterData.strategi_id,
        indikator_id: afterData.indikator_id,
        versi_sebelum: versiSebelum,
        versi_sesudah: versiSesudah,
        before_json: JSON.stringify(beforeJson),
        after_json: JSON.stringify(afterData),
        alasan_revisi: alasanRevisi || 'Revisi data strategi',
        dibuat_oleh: userId,
      },
      transaction,
    },
  );

  return versiSesudah;
};

const validateStrategiRelasi = async ({ renstra_id, strategi_id, indikator_id, transaction }) => {
  const master = await RenstraStrategi.findOne({
    where: {
      id: Number(strategi_id),
      renstra_id: Number(renstra_id),
    },
    transaction,
  });

  if (!master) {
    return {
      valid: false,
      message: 'strategi_id tidak valid. Harus ID RenstraStrategi.',
    };
  }

  const indikator = await IndikatorRenstra.findOne({
    where: {
      id: Number(indikator_id),
      stage: 'strategi',
      ref_id: {
        [Op.in]: [Number(strategi_id), Number(master?.rpjmd_strategi_id || 0)].filter(Boolean),
      },
      renstra_id: Number(renstra_id),
    },
    transaction,
  });

  if (!indikator) {
    return {
      valid: false,
      message:
        'indikator_id tidak valid. Harus indikator_renstra stage strategi, ref_id sesuai strategi_id, dan renstra_id sama.',
    };
  }

  return { valid: true, master, indikator };
};

const buildLockedPaguPayload = () => ({
  pagu_tahun_1: 0,
  pagu_tahun_2: 0,
  pagu_tahun_3: 0,
  pagu_tahun_4: 0,
  pagu_tahun_5: 0,
  pagu_tahun_6: 0,
  pagu_akhir_renstra: 0,
});

const STRATEGI_ALLOWED_BODY_FIELDS = [
  'renstra_id',
  'strategi_id',
  'indikator_id',

  'kode_strategi',
  'deskripsi_strategi',
  'indikator',
  'baseline',
  'satuan_target',
  'lokasi',
  'opd_penanggung_jawab',

  'target_tahun_1',
  'target_tahun_2',
  'target_tahun_3',
  'target_tahun_4',
  'target_tahun_5',
  'target_tahun_6',

  'pagu_rpjmd_acuan',
  'pagu_tahun_1',
  'pagu_tahun_2',
  'pagu_tahun_3',
  'pagu_tahun_4',
  'pagu_tahun_5',
  'pagu_tahun_6',

  'target_akhir_renstra',
  'pagu_akhir_renstra',

  'alasan_revisi',
];

const assertAllowedBodyFields = (body, allowedFields) => {
  const unknownFields = Object.keys(body || {}).filter((key) => !allowedFields.includes(key));

  if (unknownFields.length) {
    const error = new Error(`Field tidak diperbolehkan: ${unknownFields.join(', ')}`);
    error.statusCode = 400;
    error.blocked = true;
    throw error;
  }
};

const buildStrategiPayload = ({ body, current, strategi, indikator, userId }) => {
  return buildBaseRenstraPayload({
    body,
    allowedFields: STRATEGI_ALLOWED_BODY_FIELDS,
    excludedFields: ['alasan_revisi'],
    current,
    master: strategi,
    indikator,
    userId,
    levelIdField: 'strategi_id',
    kodeField: 'kode_strategi',
    deskripsiField: 'deskripsi_strategi',
    masterKodeField: 'kode_strategi',
    masterDeskripsiField: 'deskripsi',
    computeFinal,
    buildPaguPayload: buildLockedPaguPayload,
  });
};

const safeSyncStrategi = async ({ renstra_id, strategi_id, transaction }) => {
  console.warn('⚠️ [safeSyncStrategi] Sinkronisasi cache strategi dinonaktifkan sementara:', {
    renstra_id,
    strategi_id,
    reason:
      'Menunggu perbaikan renstraPaguCachedIncrementalSyncService karena masih membaca kolom RenstraTabelArahKebijakan.strategi_id yang tidak tersedia.',
  });

  return {
    success: false,
    warning:
      'Sinkronisasi cache strategi dinonaktifkan sementara. Data utama tetap disimpan, tetapi cache turunan belum disinkronkan.',
  };
};

const getValidStrategiHistoryPayload = ({ history, approvedHistory }) => {
  if (history.status_revisi === 'ditolak' && approvedHistory) {
    return {
      json: parseJsonField(approvedHistory.after_json),
      source: 'approved_after_json',
      source_history_id: approvedHistory.id,
    };
  }

  if (history.status_revisi === 'ditolak') {
    return {
      json: parseJsonField(history.before_json),
      source: 'rejected_before_json',
      source_history_id: history.id,
    };
  }

  return {
    json: parseJsonField(history.after_json),
    source: 'latest_after_json',
    source_history_id: history.id,
  };
};

const rebuildStrategiPayloadFromHistory = ({ current, history, latestApprovedHistory = null }) => {
  const selected = getValidStrategiHistoryPayload({
    history,
    approvedHistory: latestApprovedHistory,
  });

  const sourcePayload = sanitizeHistoryPayload(selected.json);

  return {
    payload: {
      ...sourcePayload,
      ...buildLockedPaguPayload(),
      ...computeFinal(sourcePayload),
      pagu_rpjmd_acuan: current.pagu_rpjmd_acuan,
      status_revisi: history.status_revisi,
      versi: Number(history.versi_sesudah || current.versi || 1),
    },
    rebuild_source: {
      source: selected.source,
      source_history_id: selected.source_history_id,
    },
  };
};

const applyStrategiPaguFallbackFromIndikator = (row, sourcePaguMap = new Map()) => {
  const json = row?.toJSON ? row.toJSON() : { ...row };

  const currentAkhir = toPositiveNumber(json.pagu_akhir_renstra);
  const currentAcuan = toPositiveNumber(json.pagu_rpjmd_acuan);

  if (currentAkhir > 0 || currentAcuan > 0) {
    const paguAcuan = currentAcuan || currentAkhir;

    const hasSlotPagu = [1, 2, 3, 4, 5].some((i) => {
      return toPositiveNumber(json[`pagu_tahun_${i}`]) > 0;
    });

    const split = hasSlotPagu
      ? {
          pagu_tahun_1: toPositiveNumber(json.pagu_tahun_1),
          pagu_tahun_2: toPositiveNumber(json.pagu_tahun_2),
          pagu_tahun_3: toPositiveNumber(json.pagu_tahun_3),
          pagu_tahun_4: toPositiveNumber(json.pagu_tahun_4),
          pagu_tahun_5: toPositiveNumber(json.pagu_tahun_5),
          pagu_tahun_6: 0,
          pagu_akhir_renstra: currentAkhir || paguAcuan,
        }
      : splitPaguToFiveYears(paguAcuan);

    return {
      ...json,
      ...split,
      pagu_rpjmd_acuan: paguAcuan,
      pagu_readonly: true,
      pagu_cache_available: currentAkhir > 0 || hasSlotPagu,
      pagu_source:
        currentAkhir > 0 || hasSlotPagu
          ? 'renstra_pagu_cache_or_existing_row'
          : 'existing_pagu_rpjmd_acuan_split_fallback',
    };
  }

  const indikator = json.indikator_detail || {};
  const sourceIndikatorId = Number(indikator.source_indikator_id || 0);
  const sourcePagu = sourcePaguMap.get(sourceIndikatorId);

  const paguAcuan = pickPositiveNumber(sourcePagu?.pagu_cached);

  if (!paguAcuan) {
    return {
      ...json,
      pagu_readonly: true,
      pagu_cache_available: false,
      pagu_source: 'none',
    };
  }

  const split = splitPaguToFiveYears(paguAcuan);

  return {
    ...json,
    ...split,
    pagu_rpjmd_acuan: paguAcuan,
    pagu_readonly: true,
    pagu_cache_available: false,
    pagu_source: 'indikator_strategi_source_fallback',
  };
};

const attachStrategiCacheToRows = async ({ rows, transaction }) => {
  const rowsWithTarget = rows.map(applyTargetFinalIfMissing);

  const rowsWithCache = await attachCacheToRows({
    rows: rowsWithTarget,
    stage: 'strategi',

    // Standar final:
    // cache.ref_id = id baris RenstraTabelStrategi
    renstraIdField: 'renstra_id',
    refIdField: 'id',

    transaction,
  });

  const sourceIndikatorIds = rowsWithCache
    .map((row) => Number(row?.indikator_detail?.source_indikator_id || 0))
    .filter((id) => Number.isFinite(id) && id > 0);

  const uniqueSourceIndikatorIds = [...new Set(sourceIndikatorIds)];

  const sourcePaguRows = uniqueSourceIndikatorIds.length
    ? await IndikatorStrategi.findAll({
        where: {
          id: {
            [Op.in]: uniqueSourceIndikatorIds,
          },
        },
        attributes: ['id', 'pagu_cached', 'pagu_cached_at'],
        raw: true,
        transaction,
      })
    : [];

  const sourcePaguMap = new Map(sourcePaguRows.map((item) => [Number(item.id), item]));

  return rowsWithCache.map((row) => applyStrategiPaguFallbackFromIndikator(row, sourcePaguMap));
};

// ========================= CREATE =========================

exports.create = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    assertAllowedBodyFields(req.body, STRATEGI_ALLOWED_BODY_FIELDS);

    const payloadBase = {
      ...req.body,
    };

    // opd_penanggung_jawab tetap disimpan jika dikirim dari form.

    if (!payloadBase.renstra_id || !payloadBase.strategi_id || !payloadBase.indikator_id) {
      await t.rollback();
      return res.status(400).json({
        message: 'renstra_id, strategi_id, dan indikator_id wajib diisi',
      });
    }

    const relasi = await validateStrategiRelasi({
      renstra_id: payloadBase.renstra_id,
      strategi_id: payloadBase.strategi_id,
      indikator_id: payloadBase.indikator_id,
      transaction: t,
    });

    if (!relasi.valid) {
      await t.rollback();
      return res.status(400).json({
        message: relasi.message,
        blocked: true,
      });
    }

    const master = relasi.master;

    const exists = await RenstraTabelStrategi.findOne({
      where: {
        renstra_id: payloadBase.renstra_id,
        strategi_id: payloadBase.strategi_id,
        indikator_id: payloadBase.indikator_id,
      },
      transaction: t,
    });

    if (exists) {
      await t.rollback();
      return res.status(409).json({
        message: 'Data strategi dengan indikator ini sudah ada. Gunakan Edit.',
        existing_id: exists.id,
        blocked: true,
      });
    }

    const payload = {
      ...buildStrategiPayload({
        body: payloadBase,
        current: null,
        strategi: master,
        indikator: relasi.indikator,
        userId: getUserId(req),
      }),
      status_revisi: 'draft',
      versi: 1,
      last_revised_at: null,
      last_revised_by: null,
    };

    const created = await RenstraTabelStrategi.create(
      {
        ...payload,
        status_revisi: 'draft',
        versi: 1,
        last_revised_at: null,
        last_revised_by: null,
      },
      { transaction: t },
    );

    await writeGlobalAudit({
      entity_id: created.id,
      action: 'create',
      before_json: null,
      after_json: created.toJSON(),
      user_id: getUserId(req),
      transaction: t,
    });

    const syncResult = await safeSyncStrategi({
      renstra_id: created.renstra_id,
      strategi_id: created.strategi_id,
      transaction: t,
    });
    await t.commit();
    res.status(201).json({
      message: syncResult.success
        ? 'Data strategi berhasil ditambahkan'
        : 'Data strategi berhasil ditambahkan, tetapi sinkronisasi cache turunan dilewati sementara.',
      data: applyPaguFromCache(applyTargetFinalIfMissing(created), null),
      blocked: false,
      sync_warning: syncResult.warning,
    });
  } catch (err) {
    await t.rollback();
    return res.status(err.statusCode || 400).json({
      error: err.message,
      blocked: err.blocked || false,
    });
  }
};

// ========================= FIND ALL =========================

exports.findAll = async (req, res) => {
  try {
    const { renstra_id, strategi_id, indikator_id } = req.query;

    const where = {};
    if (renstra_id) where.renstra_id = Number(renstra_id);
    if (strategi_id) where.strategi_id = Number(strategi_id);
    if (indikator_id) where.indikator_id = Number(indikator_id);

    const strategiInclude = {
      model: RenstraStrategi,
      as: 'strategi',
      attributes: ['id', 'deskripsi', 'kode_strategi', 'sasaran_id'],
    };

    const rows = await RenstraTabelStrategi.findAll({
      where,
      include: [
        strategiInclude,
        {
          model: IndikatorRenstra,
          as: 'indikator_detail',
          attributes: [
            'id',
            'kode_indikator',
            'nama_indikator',
            'satuan',
            'stage',
            'source_indikator_id',
          ],
        },
      ],
      order: [['id', 'ASC']],
    });

    const result = await attachStrategiCacheToRows({ rows });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ========================= FIND ONE =========================

exports.findOne = async (req, res) => {
  try {
    const row = await RenstraTabelStrategi.findByPk(req.params.id, {
      include: [
        {
          model: RenstraStrategi,
          as: 'strategi',
          attributes: ['id', 'deskripsi', 'kode_strategi', 'sasaran_id'],
        },
        {
          model: IndikatorRenstra,
          as: 'indikator_detail',
          attributes: [
            'id',
            'kode_indikator',
            'nama_indikator',
            'satuan',
            'stage',
            'source_indikator_id',
          ],
        },
      ],
    });

    if (!row) {
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }

    const [result] = await attachStrategiCacheToRows({
      rows: [row],
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ========================= UPDATE =========================

exports.update = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    assertAllowedBodyFields(req.body, STRATEGI_ALLOWED_BODY_FIELDS);

    const { id } = req.params;

    const current = await RenstraTabelStrategi.findByPk(id, {
      transaction: t,
    });

    if (!current) {
      await t.rollback();
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }

    if (current.status_revisi === 'approved') {
      await t.rollback();
      return res.status(409).json({
        message: 'Data sudah approved. Gunakan endpoint revisi.',
        blocked: true,
        audit_mode: true,
      });
    }

    if (!req.body.alasan_revisi || !String(req.body.alasan_revisi).trim()) {
      await t.rollback();
      return res.status(400).json({
        message: 'alasan_revisi wajib diisi saat revisi',
        blocked: true,
      });
    }

    const payloadBase = {
      ...req.body,
    };

    // opd_penanggung_jawab tetap disimpan jika dikirim dari form.

    if (!payloadBase.renstra_id || !payloadBase.strategi_id || !payloadBase.indikator_id) {
      await t.rollback();
      return res.status(400).json({
        message: 'renstra_id, strategi_id, dan indikator_id wajib diisi',
      });
    }

    const relasi = await validateStrategiRelasi({
      renstra_id: payloadBase.renstra_id,
      strategi_id: payloadBase.strategi_id,
      indikator_id: payloadBase.indikator_id,
      transaction: t,
    });

    if (!relasi.valid) {
      await t.rollback();
      return res.status(400).json({
        message: relasi.message,
        blocked: true,
      });
    }

    const master = relasi.master;

    const duplicate = await RenstraTabelStrategi.findOne({
      where: {
        id: { [Op.ne]: id },
        renstra_id: payloadBase.renstra_id,
        strategi_id: payloadBase.strategi_id,
        indikator_id: payloadBase.indikator_id,
      },
      transaction: t,
    });

    if (duplicate) {
      await t.rollback();
      return res.status(409).json({
        message: 'Data strategi dengan indikator ini sudah ada. Gunakan Edit.',
        existing_id: duplicate.id,
        blocked: true,
      });
    }

    const payload = buildStrategiPayload({
      body: payloadBase,
      current,
      strategi: master,
      indikator: relasi.indikator,
      userId: getUserId(req),
    });

    const beforeUpdateJson = current.toJSON();

    const afterPayload = {
      ...payload,
      status_revisi: 'draft',
      versi: Number(current.versi || 1) + 1,
      last_revised_at: new Date(),
      last_revised_by: getUserId(req),
    };

    const versiSesudah = await insertHistory({
      current,
      afterData: afterPayload,
      alasanRevisi: req.body.alasan_revisi,
      userId: getUserId(req),
      transaction: t,
    });

    await RenstraTabelStrategi.update(
      {
        ...afterPayload,
        versi: versiSesudah,
      },
      {
        where: { id },
        transaction: t,
      },
    );

    await writeGlobalAudit({
      entity_id: Number(id),
      action: 'update',
      before_json: beforeUpdateJson,
      after_json: {
        ...afterPayload,
        versi: versiSesudah,
      },
      user_id: getUserId(req),
      transaction: t,
    });

    const updatedData = await RenstraTabelStrategi.findByPk(id, {
      include: [
        {
          model: RenstraStrategi,
          as: 'strategi',
          attributes: ['id', 'deskripsi', 'kode_strategi', 'sasaran_id'],
        },
        {
          model: IndikatorRenstra,
          as: 'indikator_detail',
          attributes: [
            'id',
            'kode_indikator',
            'nama_indikator',
            'satuan',
            'stage',
            'source_indikator_id',
          ],
        },
      ],
      transaction: t,
    });

    const syncResult = await safeSyncStrategi({
      renstra_id: updatedData.renstra_id,
      strategi_id: updatedData.strategi_id,
      transaction: t,
    });
    const [result] = await attachStrategiCacheToRows({
      rows: [updatedData],
      transaction: t,
    });
    await t.commit();
    res.json({
      message: syncResult.success
        ? 'Data strategi berhasil diperbarui'
        : 'Data strategi berhasil diperbarui, tetapi sinkronisasi cache turunan dilewati sementara.',
      data: result,
      blocked: false,
      sync_warning: syncResult.warning,
    });
  } catch (err) {
    await t.rollback();
    return res.status(err.statusCode || 400).json({
      error: err.message,
      blocked: err.blocked || false,
    });
  }
};

// ========================= DELETE =========================

exports.delete = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const id = req.params.id;

    const data = await RenstraTabelStrategi.findByPk(id, {
      transaction: t,
    });

    if (!data) {
      await t.rollback();
      return res.status(404).json({
        message: 'Data tidak ditemukan',
        blocked: true,
      });
    }

    if (data.status_revisi === 'approved') {
      await t.rollback();
      return res.status(409).json({
        message: 'Data approved tidak boleh dihapus',
        blocked: true,
        audit_mode: true,
      });
    }

    const beforeJson = data.toJSON();

    await data.destroy({ transaction: t });

    await writeGlobalAudit({
      entity_id: Number(id),
      action: 'delete',
      before_json: beforeJson,
      after_json: null,
      user_id: getUserId(req),
      transaction: t,
    });

    await t.commit();

    return res.json({
      message: 'Data strategi berhasil dihapus',
      blocked: false,
    });
  } catch (err) {
    await t.rollback();
    return res.status(500).json({ error: err.message });
  }
};

// ========================= CREATE REVISI DARI DATA APPROVED =========================

exports.createRevisi = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    assertAllowedBodyFields(req.body, STRATEGI_ALLOWED_BODY_FIELDS);

    const { id } = req.params;
    const userId = getUserId(req);

    if (!req.body.alasan_revisi || !String(req.body.alasan_revisi).trim()) {
      await t.rollback();
      return res.status(400).json({
        message: 'alasan_revisi wajib diisi saat membuat revisi',
        blocked: true,
      });
    }

    const current = await RenstraTabelStrategi.findByPk(id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!current) {
      await t.rollback();
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }

    if (current.status_revisi !== 'approved') {
      await t.rollback();
      return res.status(409).json({
        message: 'Endpoint revisi hanya untuk data yang sudah approved',
        blocked: true,
      });
    }

    const payloadBase = {
      ...current.toJSON(),
      ...req.body,
      pagu_rpjmd_acuan: current.pagu_rpjmd_acuan,
    };

    if (!payloadBase.renstra_id || !payloadBase.strategi_id || !payloadBase.indikator_id) {
      await t.rollback();
      return res.status(400).json({
        message: 'renstra_id, strategi_id, dan indikator_id wajib diisi',
        blocked: true,
      });
    }

    const relasi = await validateStrategiRelasi({
      renstra_id: payloadBase.renstra_id,
      strategi_id: payloadBase.strategi_id,
      indikator_id: payloadBase.indikator_id,
      transaction: t,
    });

    if (!relasi.valid) {
      await t.rollback();
      return res.status(400).json({
        message: relasi.message,
        blocked: true,
      });
    }

    const payload = {
      ...buildStrategiPayload({
        body: payloadBase,
        current,
        strategi: relasi.master,
        indikator: relasi.indikator,
        userId,
      }),
      status_revisi: 'draft',
      versi: Number(current.versi || 1) + 1,
      last_revised_at: new Date(),
      last_revised_by: userId,
      pagu_rpjmd_acuan: current.pagu_rpjmd_acuan,
    };

    const versiSesudah = await insertHistory({
      current,
      afterData: payload,
      alasanRevisi: req.body.alasan_revisi,
      userId,
      transaction: t,
    });

    await allowApprovedStrategiUpdate(t);

    await RenstraTabelStrategi.update(
      {
        ...payload,
        versi: versiSesudah,
      },
      {
        where: { id },
        transaction: t,
      },
    );

    await lockApprovedStrategiUpdate(t);

    await writeGlobalAudit({
      entity_id: Number(id),
      action: 'revisi',
      before_json: current.toJSON(),
      after_json: {
        ...payload,
        versi: versiSesudah,
      },
      user_id: userId,
      transaction: t,
    });

    const updatedData = await RenstraTabelStrategi.findByPk(id, {
      include: [
        {
          model: RenstraStrategi,
          as: 'strategi',
          attributes: ['id', 'deskripsi', 'kode_strategi', 'renstra_id'],
        },
        {
          model: IndikatorRenstra,
          as: 'indikator_detail',
          attributes: [
            'id',
            'kode_indikator',
            'nama_indikator',
            'satuan',
            'stage',
            'source_indikator_id',
          ],
        },
      ],
      transaction: t,
    });

    const [result] = await attachStrategiCacheToRows({
      rows: [updatedData],
      transaction: t,
    });

    await t.commit();

    return res.json({
      message: 'Revisi strategi berhasil dibuat sebagai draft',
      data: result,
      blocked: false,
    });
  } catch (err) {
    await lockApprovedStrategiUpdate(t).catch(() => {});
    await t.rollback();
    return res.status(err.statusCode || 400).json({
      error: err.message,
      blocked: err.blocked || false,
    });
  }
};

exports.history = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await sequelize.query(
      `
      SELECT *
      FROM renstra_tabel_strategi_history
      WHERE renstra_tabel_strategi_id = :id
      ORDER BY id DESC
      `,
      { replacements: { id } },
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.verifikasiHistory = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { history_id } = req.params;
    const userId = getUserId(req);

    const [history] = await sequelize.query(
      `
      SELECT *
      FROM renstra_tabel_strategi_history
      WHERE id = :history_id
      LIMIT 1
      `,
      {
        replacements: { history_id },
        type: QueryTypes.SELECT,
        transaction: t,
      },
    );

    if (!history) {
      await t.rollback();
      return res.status(404).json({ message: 'History tidak ditemukan' });
    }

    if (history.status_revisi !== 'draft') {
      await t.rollback();
      return res.status(409).json({
        message: 'Hanya revisi berstatus draft yang bisa diverifikasi',
      });
    }

    await sequelize.query(
      `
      UPDATE renstra_tabel_strategi_history
      SET
        status_revisi = 'verifikasi',
        diverifikasi_oleh = :userId,
        diverifikasi_pada = NOW(),
        updatedAt = NOW()
      WHERE id = :history_id
      `,
      {
        replacements: { history_id, userId },
        transaction: t,
      },
    );

    await RenstraTabelStrategi.update(
      {
        status_revisi: 'verifikasi',
        last_revised_at: new Date(),
        last_revised_by: userId,
      },
      {
        where: { id: history.renstra_tabel_strategi_id },
        transaction: t,
      },
    );

    await writeGlobalAudit({
      entity_id: history.renstra_tabel_strategi_id,
      action: 'verifikasi',
      before_json: history,
      after_json: {
        ...history,
        status_revisi: 'verifikasi',
        diverifikasi_oleh: userId,
      },
      user_id: userId,
      transaction: t,
    });

    await t.commit();

    return res.json({ message: 'Revisi strategi berhasil diverifikasi' });
  } catch (err) {
    await t.rollback();
    return res.status(err.statusCode || 400).json({
      error: err.message,
      blocked: err.blocked || false,
    });
  }
};

exports.approveHistory = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { history_id } = req.params;
    const userId = getUserId(req);

    const [history] = await sequelize.query(
      `
      SELECT *
      FROM renstra_tabel_strategi_history
      WHERE id = :history_id
      LIMIT 1
      `,
      {
        replacements: { history_id },
        type: QueryTypes.SELECT,
        transaction: t,
      },
    );

    if (!history) {
      await t.rollback();
      return res.status(404).json({ message: 'History tidak ditemukan' });
    }

    if (history.status_revisi === 'approved') {
      await t.rollback();
      return res.status(409).json({
        message: 'Revisi ini sudah disetujui sebelumnya.',
      });
    }

    if (history.status_revisi !== 'verifikasi') {
      await t.rollback();
      return res.status(409).json({
        message: 'Revisi harus diverifikasi sebelum disetujui',
      });
    }

    const afterJson = sanitizeHistoryPayload(parseJsonField(history.after_json));

    await sequelize.query(
      `
      UPDATE renstra_tabel_strategi_history
      SET
        status_revisi = 'approved',
        disetujui_oleh = :userId,
        disetujui_pada = NOW(),
        updatedAt = NOW()
      WHERE id = :history_id
      `,
      {
        replacements: { history_id, userId },
        transaction: t,
      },
    );

    await RenstraTabelStrategi.update(
      {
        ...afterJson,
        status_revisi: 'approved',
        versi: history.versi_sesudah,
        last_revised_at: new Date(),
        last_revised_by: userId,
      },
      {
        where: { id: history.renstra_tabel_strategi_id },
        transaction: t,
      },
    );

    await writeGlobalAudit({
      entity_id: history.renstra_tabel_strategi_id,
      action: 'approve',
      before_json: parseJsonField(history.before_json),
      after_json: {
        ...afterJson,
        status_revisi: 'approved',
        versi: history.versi_sesudah,
      },
      user_id: userId,
      transaction: t,
    });

    await t.commit();

    return res.json({ message: 'Revisi strategi berhasil disetujui' });
  } catch (err) {
    await t.rollback();
    return res.status(err.statusCode || 400).json({
      error: err.message,
      blocked: err.blocked || false,
    });
  }
};

exports.tolakHistory = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { history_id } = req.params;
    const userId = getUserId(req);

    const [history] = await sequelize.query(
      `
      SELECT *
      FROM renstra_tabel_strategi_history
      WHERE id = :history_id
      LIMIT 1
      `,
      {
        replacements: { history_id },
        type: QueryTypes.SELECT,
        transaction: t,
      },
    );

    if (!history) {
      await t.rollback();
      return res.status(404).json({ message: 'History tidak ditemukan' });
    }

    if (history.status_revisi === 'approved') {
      await t.rollback();
      return res.status(409).json({
        message: 'Revisi yang sudah approved tidak bisa ditolak',
      });
    }

    if (!['draft', 'verifikasi'].includes(history.status_revisi)) {
      await t.rollback();
      return res.status(409).json({
        message: 'Hanya revisi draft atau verifikasi yang bisa ditolak.',
        blocked: true,
      });
    }

    const beforeJson = sanitizeHistoryPayload(parseJsonField(history.before_json));

    await sequelize.query(
      `
      UPDATE renstra_tabel_strategi_history
      SET
        status_revisi = 'ditolak',
        diverifikasi_oleh = :userId,
        diverifikasi_pada = NOW(),
        updatedAt = NOW()
      WHERE id = :history_id
      `,
      {
        replacements: { history_id, userId },
        transaction: t,
      },
    );

    await RenstraTabelStrategi.update(
      {
        ...beforeJson,
        status_revisi: 'ditolak',
        versi: history.versi_sesudah,
        last_revised_at: new Date(),
        last_revised_by: userId,
      },
      {
        where: { id: history.renstra_tabel_strategi_id },
        transaction: t,
      },
    );

    await writeGlobalAudit({
      entity_id: history.renstra_tabel_strategi_id,
      action: 'tolak',
      before_json: parseJsonField(history.after_json),
      after_json: {
        ...beforeJson,
        status_revisi: 'ditolak',
        versi: history.versi_sesudah,
      },
      user_id: userId,
      transaction: t,
    });

    await t.commit();

    return res.json({ message: 'Revisi strategi berhasil ditolak' });
  } catch (err) {
    await t.rollback();
    return res.status(err.statusCode || 400).json({
      error: err.message,
      blocked: err.blocked || false,
    });
  }
};

exports.rebuild = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const current = await RenstraTabelStrategi.findByPk(id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!current) {
      await t.rollback();
      return res.status(404).json({
        message: 'Data strategi tidak ditemukan',
      });
    }

    if (current.status_revisi === 'approved') {
      await t.rollback();
      return res.status(409).json({
        message: 'Data approved tidak boleh direbuild langsung. Gunakan endpoint revisi.',
        blocked: true,
        audit_mode: true,
      });
    }

    const [history] = await sequelize.query(
      `
      SELECT *
      FROM renstra_tabel_strategi_history
      WHERE renstra_tabel_strategi_id = :id
      ORDER BY id DESC
      LIMIT 1
      `,
      {
        replacements: { id },
        type: QueryTypes.SELECT,
        transaction: t,
      },
    );

    if (!history) {
      await t.rollback();
      return res.status(404).json({
        message: 'History revisi tidak ditemukan',
      });
    }

    const [latestApprovedHistory] = await sequelize.query(
      `
      SELECT *
      FROM renstra_tabel_strategi_history
      WHERE renstra_tabel_strategi_id = :id
        AND status_revisi = 'approved'
      ORDER BY id DESC
      LIMIT 1
      `,
      {
        replacements: { id },
        type: QueryTypes.SELECT,
        transaction: t,
      },
    );

    const { payload, rebuild_source } = rebuildStrategiPayloadFromHistory({
      current,
      history,
      latestApprovedHistory,
    });

    payload.last_revised_at = new Date();
    payload.last_revised_by = userId;

    const beforeJson = current.toJSON();

    await RenstraTabelStrategi.update(payload, {
      where: { id },
      transaction: t,
    });

    await writeGlobalAudit({
      entity_id: Number(id),
      action: 'rebuild',
      before_json: beforeJson,
      after_json: {
        ...payload,
        rebuild_source,
      },
      user_id: userId,
      transaction: t,
    });

    const updated = await RenstraTabelStrategi.findByPk(id, {
      transaction: t,
    });

    await t.commit();

    return res.json({
      message: 'Data aktif strategi berhasil dibangun ulang dari history',
      source: {
        ...rebuild_source,
        latest_history_id: history.id,
        latest_history_status: history.status_revisi,
        versi_sebelum: history.versi_sebelum,
        versi_sesudah: history.versi_sesudah,
      },
      data: applyTargetFinalIfMissing(updated),
      blocked: false,
    });
  } catch (err) {
    await t.rollback();
    return res.status(err.statusCode || 400).json({
      error: err.message,
      blocked: err.blocked || false,
    });
  }
};
