// controllers/renstra_tabelKegiatanController.js
const { Op, QueryTypes } = require('sequelize');
const {
  sequelize,
  RenstraTabelKegiatan,
  RenstraKegiatan,
  RenstraProgram,
  RenstraTabelSubkegiatan,
  IndikatorRenstra,
  IndikatorKegiatan,
  RenstraAuditLogGlobal,
} = require('../models');

const { syncProgram } = require('../services/renstraPaguCachedIncrementalSyncService');

const { buildBaseRenstraPayload } = require('../services/renstraPayloadBuilderHelper');

const { attachCacheToRows, applyPaguFromCache } = require('../services/renstraPaguCacheHelper');

const getUserId = (req) => {
  return req.user?.id || req.user?.userId || req.userId || null;
};

const allowApprovedKegiatanUpdate = async (transaction) => {
  await sequelize.query('SET @allow_approved_kegiatan_update = 1', {
    transaction,
  });
};

const lockApprovedKegiatanUpdate = async (transaction) => {
  await sequelize.query('SET @allow_approved_kegiatan_update = 0', {
    transaction,
  });
};

const writeGlobalAudit = async ({
  module = 'kegiatan',
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

const roundUp2 = (value) => {
  const num = Number(value) || 0;
  return Math.ceil(num * 100) / 100;
};

const applyTargetFinalIfMissing = (item) => {
  const json = item?.toJSON ? item.toJSON() : { ...item };

  if (
    json.target_akhir_renstra === null ||
    json.target_akhir_renstra === undefined ||
    json.target_akhir_renstra === ''
  ) {
    json.target_akhir_renstra = computeTargetOnly(json).target_akhir_renstra;
  }

  json.target_tahun_6 = 0;

  return json;
};

const parseOptionalPositiveInteger = (value) => {
  if (Array.isArray(value)) return NaN;
  if (value === undefined || value === null || value === '') return null;

  const normalized = String(value).trim();
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : NaN;
};

const computeTargetOnly = (data = {}) => {
  const targetValues = [1, 2, 3, 4, 5].map((i) => Number(data?.[`target_tahun_${i}`]) || 0);

  return {
    target_tahun_6: 0,
    target_akhir_renstra: roundUp2(
      targetValues.reduce((a, b) => a + b, 0) / targetValues.length || 0,
    ),
  };
};

const getKegiatanPaguRpjmdAcuan = async ({ indikator, transaction }) => {
  if (!indikator?.source_indikator_id) return 0;

  const source = await IndikatorKegiatan.findByPk(indikator.source_indikator_id, {
    attributes: ['id', 'pagu_cached'],
    raw: true,
    transaction,
  });

  return Number(source?.pagu_cached || 0);
};

const normalizeKegiatanPaguPayload = (input = {}) => {
  const body = input.body ? input.body : input;
  const current = input.current || null;
  const currentJson = current?.toJSON ? current.toJSON() : current || {};

  const paguRpjmdAcuan =
    Number(currentJson?.pagu_rpjmd_acuan || 0) > 0
      ? Number(currentJson.pagu_rpjmd_acuan || 0)
      : Number(body?.pagu_rpjmd_acuan || 0);

  let paguValues = [1, 2, 3, 4, 5].map((i) => {
    const key = `pagu_tahun_${i}`;

    if (body[key] !== undefined && body[key] !== null && body[key] !== '') {
      return Number(body[key]) || 0;
    }

    return Number(currentJson?.[key]) || 0;
  });

  if (paguValues.every((v) => v === 0) && paguRpjmdAcuan > 0) {
    const paguDasar = Math.floor(paguRpjmdAcuan / 5);
    const sisaPagu = paguRpjmdAcuan - paguDasar * 5;

    paguValues = [paguDasar, paguDasar, paguDasar, paguDasar, paguDasar + sisaPagu];
  }

  return {
    pagu_tahun_1: paguValues[0],
    pagu_tahun_2: paguValues[1],
    pagu_tahun_3: paguValues[2],
    pagu_tahun_4: paguValues[3],
    pagu_tahun_5: paguValues[4],
    pagu_tahun_6: 0,
    pagu_rpjmd_acuan: paguRpjmdAcuan,
    pagu_akhir_renstra: roundUp2(paguValues.reduce((a, b) => a + b, 0)),
  };
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
    program,
    kegiatan,
    indikator,
    indikator_detail,
    subkegiatans,
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
    INSERT INTO renstra_tabel_kegiatan_history
    (
      renstra_tabel_kegiatan_id,
      renstra_id,
      program_id,
      kegiatan_id,
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
      :renstra_tabel_kegiatan_id,
      :renstra_id,
      :program_id,
      :kegiatan_id,
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
        renstra_tabel_kegiatan_id: beforeJson.id,
        renstra_id: afterData.renstra_id,
        program_id: afterData.program_id,
        kegiatan_id: afterData.kegiatan_id,
        indikator_id: afterData.indikator_id,
        versi_sebelum: versiSebelum,
        versi_sesudah: versiSesudah,
        before_json: JSON.stringify(beforeJson),
        after_json: JSON.stringify(afterData),
        alasan_revisi: alasanRevisi || 'Revisi data kegiatan',
        dibuat_oleh: userId,
      },
      transaction,
    },
  );

  return versiSesudah;
};

const getJsonPaguAkhir = (json) => {
  const parsed = parseJsonField(json);
  return Number(parsed?.pagu_akhir_renstra || 0);
};

const getValidHistoryPayload = ({ history, approvedHistory, validPaguHistory }) => {
  if (history.status_revisi === 'ditolak') {
    if (approvedHistory && getJsonPaguAkhir(approvedHistory.after_json) > 0) {
      return {
        json: parseJsonField(approvedHistory.after_json),
        source: 'approved_after_json',
        source_history_id: approvedHistory.id,
      };
    }

    if (validPaguHistory) {
      return {
        json: parseJsonField(validPaguHistory.after_json),
        source: 'valid_pagu_after_json',
        source_history_id: validPaguHistory.id,
      };
    }

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

const rebuildKegiatanPayloadFromHistory = ({
  current,
  history,
  latestApprovedHistory = null,
  latestValidPaguHistory = null,
}) => {
  const selected = getValidHistoryPayload({
    history,
    approvedHistory: latestApprovedHistory,
    validPaguHistory: latestValidPaguHistory,
  });

  let payload = sanitizeHistoryPayload(selected.json);

  payload = {
    ...payload,
    ...computeTargetOnly(payload),
    ...normalizeKegiatanPaguPayload({
      body: payload,
      current,
    }),
  };

  return {
    payload: {
      ...payload,
      status_revisi: history.status_revisi,
      versi: Number(history.versi_sesudah || current.versi || 1),
    },
    rebuild_source: {
      source: selected.source,
      source_history_id: selected.source_history_id,
    },
  };
};

const KEGIATAN_ALLOWED_BODY_FIELDS = [
  'renstra_id',
  'program_id',
  'kebijakan_id',
  'kegiatan_id',
  'indikator_id',
  'kode_kegiatan',
  'nama_kegiatan',
  'indikator',
  'baseline',
  'satuan_target',
  'lokasi',
  'bidang_penanggung_jawab',
  'opd_penanggung_jawab',
  'target_tahun_1',
  'target_tahun_2',
  'target_tahun_3',
  'target_tahun_4',
  'target_tahun_5',
  'pagu_tahun_1',
  'pagu_tahun_2',
  'pagu_tahun_3',
  'pagu_tahun_4',
  'pagu_tahun_5',
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

const validateKegiatanAndIndikator = async ({
  renstra_id,
  kegiatan_id,
  indikator_id,
  transaction,
}) => {
  if (!renstra_id || !kegiatan_id || !indikator_id) {
    return {
      valid: false,
      status: 400,
      message: 'renstra_id, kegiatan_id, dan indikator_id wajib diisi',
    };
  }

  const kegiatan = await RenstraKegiatan.findOne({
    where: {
      id: Number(kegiatan_id),
      renstra_id: Number(renstra_id),
    },
    transaction,
  });

  if (!kegiatan) {
    return {
      valid: false,
      status: 400,
      message: 'kegiatan_id tidak valid. Harus ID RenstraKegiatan.',
    };
  }

  const indikator = await IndikatorRenstra.findOne({
    where: {
      id: Number(indikator_id),
      renstra_id: Number(renstra_id),
      stage: 'kegiatan',
      ref_id: Number(kegiatan_id),
    },
    transaction,
  });

  if (!indikator) {
    return {
      valid: false,
      status: 400,
      message:
        'indikator_id tidak valid. Harus indikator_renstra stage kegiatan dengan ref_id = kegiatan_id.',
    };
  }

  return {
    valid: true,
    kegiatan,
    indikator,
  };
};

const attachKegiatanCacheToRows = async ({ rows, transaction }) => {
  const rowsWithTarget = rows.map(applyTargetFinalIfMissing);

  return attachCacheToRows({
    rows: rowsWithTarget,
    stage: 'kegiatan',
    renstraIdField: 'renstra_id',
    refIdField: 'id',
    transaction,
  });
};

const buildKegiatanPayload = ({ body, current, kegiatan, indikator, userId }) => {
  const basePayload = buildBaseRenstraPayload({
    body,
    allowedFields: KEGIATAN_ALLOWED_BODY_FIELDS,
    excludedFields: ['alasan_revisi'],
    current,
    master: kegiatan,
    indikator,
    userId,
    levelIdField: 'kegiatan_id',
    kodeField: 'kode_kegiatan',
    deskripsiField: 'nama_kegiatan',
    masterKodeField: 'kode_kegiatan',
    masterDeskripsiField: 'nama_kegiatan',
    computeFinal: computeTargetOnly,

    // Jangan biarkan shared builder mengunci/menimpa pagu Kegiatan.
    buildPaguPayload: () => ({}),
  });

  return {
    ...basePayload,
    ...normalizeKegiatanPaguPayload({
      body,
      current,
    }),
    program_id: body.program_id ?? current?.program_id ?? kegiatan.program_id ?? null,
    kebijakan_id: body.kebijakan_id ?? current?.kebijakan_id ?? null,
    bidang_penanggung_jawab:
      body.bidang_penanggung_jawab ??
      current?.bidang_penanggung_jawab ??
      kegiatan.bidang_opd ??
      null,
    target_tahun_6: 0,
    pagu_tahun_6: 0,
  };
};

const applyPaguReadonly = (item) => {
  const json = item?.toJSON ? item.toJSON() : { ...item };

  // ================= PAGU =================
  json.pagu_tahun_1 = Number(json.pagu_tahun_1 || 0);
  json.pagu_tahun_2 = Number(json.pagu_tahun_2 || 0);
  json.pagu_tahun_3 = Number(json.pagu_tahun_3 || 0);
  json.pagu_tahun_4 = Number(json.pagu_tahun_4 || 0);
  json.pagu_tahun_5 = Number(json.pagu_tahun_5 || 0);
  json.pagu_tahun_6 = 0;

  json.pagu_akhir_renstra =
    json.pagu_tahun_1 +
    json.pagu_tahun_2 +
    json.pagu_tahun_3 +
    json.pagu_tahun_4 +
    json.pagu_tahun_5;

  json.pagu_readonly = true;

  // ================= TARGET =================
  json.target_tahun_1 = Number(json.target_tahun_1 || 0);
  json.target_tahun_2 = Number(json.target_tahun_2 || 0);
  json.target_tahun_3 = Number(json.target_tahun_3 || 0);
  json.target_tahun_4 = Number(json.target_tahun_4 || 0);
  json.target_tahun_5 = Number(json.target_tahun_5 || 0);

  // 🔴 PAKSA tahun ke-6 selalu 0
  json.target_tahun_6 = 0;

  // 🔴 HITUNG ULANG FINAL (ANTI DATA RUSAK)
  json.target_akhir_renstra = roundUp2(
    (json.target_tahun_1 +
      json.target_tahun_2 +
      json.target_tahun_3 +
      json.target_tahun_4 +
      json.target_tahun_5) /
      5,
  );

  return json;
};

// ------------------ CREATE ------------------
exports.create = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    assertAllowedBodyFields(req.body, KEGIATAN_ALLOWED_BODY_FIELDS);

    const userId = getUserId(req);
    const createRenstraId = Number(req.body.renstra_id);
    const createProgramId = Number(req.body.program_id);
    const createKegiatanId = Number(req.body.kegiatan_id);
    const createIndikatorId = Number(req.body.indikator_id);

    const check = await validateKegiatanAndIndikator({
      renstra_id: createRenstraId,
      kegiatan_id: createKegiatanId,
      indikator_id: createIndikatorId,
      transaction: t,
    });

    if (!check.valid) {
      await t.rollback();
      return res.status(check.status).json({
        message: check.message,
        blocked: true,
      });
    }

    const { kegiatan, indikator } = check;

    const existing = await RenstraTabelKegiatan.findOne({
      where: {
        renstra_id: createRenstraId,
        program_id: createProgramId,
        kegiatan_id: createKegiatanId,
        indikator_id: createIndikatorId,
      },
      transaction: t,
    });

    if (existing) {
      await t.rollback();
      return res.status(409).json({
        message: 'Data kegiatan dengan indikator ini sudah ada. Gunakan Edit.',
        existing_id: existing.id,
        blocked: true,
      });
    }

    const paguRpjmdAcuan = await getKegiatanPaguRpjmdAcuan({
      indikator,
      transaction: t,
    });

    const bodyWithPaguAcuan = {
      ...req.body,
      pagu_rpjmd_acuan: paguRpjmdAcuan,
    };

    const payload = {
      ...buildKegiatanPayload({
        body: bodyWithPaguAcuan,
        current: null,
        kegiatan,
        indikator,
        userId,
      }),
      kebijakan_id: req.body.kebijakan_id ?? null,
      pagu_rpjmd_acuan: paguRpjmdAcuan,
      status_revisi: 'draft',
      versi: 1,
      last_revised_at: null,
      last_revised_by: null,
    };

    const created = await RenstraTabelKegiatan.create(payload, {
      transaction: t,
    });

    await writeGlobalAudit({
      entity_id: created.id,
      action: 'create',
      before_json: null,
      after_json: created.toJSON(),
      user_id: userId,
      transaction: t,
    });

    await syncProgram({
      renstra_id:
        kegiatan.renstra_id ||
        kegiatan.renstra_opd_id ||
        kegiatan.program?.renstra_id ||
        createRenstraId,
      program_id: created.program_id,
      transaction: t,
    });

    const createdFull = await RenstraTabelKegiatan.findByPk(created.id, {
      include: tabelKegiatanListIncludes,
      transaction: t,
    });

    const result = applyTargetFinalIfMissing(createdFull);

    await t.commit();

    return res.status(201).json({
      message: '✅ Data kegiatan berhasil disimpan',
      data: result,
      warnings: {},
      blocked: false,
    });
  } catch (err) {
    await t.rollback();
    return res.status(err.statusCode || 500).json({
      error: err.message,
      blocked: err.blocked || false,
    });
  }
};

// ------------------ CREATE REVISI DARI DATA APPROVED ------------------
exports.createRevisi = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    assertAllowedBodyFields(req.body, KEGIATAN_ALLOWED_BODY_FIELDS);

    const { id } = req.params;
    const userId = getUserId(req);

    if (!req.body.alasan_revisi || !String(req.body.alasan_revisi).trim()) {
      await t.rollback();
      return res.status(400).json({
        message: 'alasan_revisi wajib diisi saat membuat revisi',
        blocked: true,
      });
    }

    const current = await RenstraTabelKegiatan.findByPk(id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!current) {
      await t.rollback();
      return res.status(404).json({
        message: 'Data tidak ditemukan',
        blocked: true,
      });
    }

    if (current.status_revisi !== 'approved') {
      await t.rollback();
      return res.status(409).json({
        message: 'Endpoint revisi hanya untuk data yang sudah approved',
        blocked: true,
      });
    }

    const revisiKegiatanId = Number(req.body.kegiatan_id ?? current.kegiatan_id);
    const revisiRenstraId = Number(req.body.renstra_id ?? current.renstra_id);
    const revisiIndikatorId = Number(req.body.indikator_id ?? current.indikator_id);

    const check = await validateKegiatanAndIndikator({
      renstra_id: revisiRenstraId,
      kegiatan_id: revisiKegiatanId,
      indikator_id: revisiIndikatorId,
      transaction: t,
    });

    if (!check.valid) {
      await t.rollback();
      return res.status(check.status).json({
        message: check.message,
        blocked: true,
      });
    }

    const { kegiatan, indikator } = check;

    const payloadBase = {
      ...current.toJSON(),
      ...req.body,
      pagu_rpjmd_acuan: current.pagu_rpjmd_acuan,
    };

    const payload = {
      ...buildKegiatanPayload({
        body: payloadBase,
        current,
        kegiatan,
        indikator,
        userId,
      }),
      kebijakan_id: req.body.kebijakan_id ?? current?.kebijakan_id ?? null,
      status_revisi: 'draft',
      last_revised_at: new Date(),
      last_revised_by: userId,
      pagu_rpjmd_acuan: current.pagu_rpjmd_acuan,
    };

    const versiSesudah = await insertHistory({
      current,
      afterData: {
        ...payload,
        versi: Number(current.versi || 1) + 1,
      },
      alasanRevisi: req.body.alasan_revisi,
      userId,
      transaction: t,
    });

    await allowApprovedKegiatanUpdate(t);

    try {
      await RenstraTabelKegiatan.update(
        {
          ...payload,
          versi: versiSesudah,
        },
        {
          where: { id },
          transaction: t,
        },
      );
    } finally {
      await lockApprovedKegiatanUpdate(t);
    }

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

    await syncProgram({
      renstra_id:
        kegiatan.renstra_id ||
        kegiatan.renstra_opd_id ||
        kegiatan.program?.renstra_id ||
        revisiRenstraId,
      program_id: payload.program_id || kegiatan.program_id || current.program_id,
      transaction: t,
    });

    const resultFull = await RenstraTabelKegiatan.findByPk(id, {
      include: tabelKegiatanListIncludes,
      transaction: t,
    });

    const result = applyTargetFinalIfMissing(resultFull);

    await t.commit();

    return res.json({
      message: 'Revisi kegiatan berhasil dibuat sebagai draft',
      data: result,
      blocked: false,
      audit_mode: true,
      workflow_state: 'draft',
    });
  } catch (err) {
    await t.rollback();
    console.error('CREATE REVISI KEGIATAN ERROR:', err);
    return res.status(err.statusCode || 400).json({
      error: err.message,
      blocked: err.blocked || false,
    });
  }
};

// ------------------ UPDATE ------------------
exports.update = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    assertAllowedBodyFields(req.body, KEGIATAN_ALLOWED_BODY_FIELDS);

    const id = req.params.id;
    const userId = getUserId(req);

    const existing = await RenstraTabelKegiatan.findByPk(id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!existing) {
      await t.rollback();
      return res.status(404).json({
        message: 'Data tidak ditemukan',
        blocked: true,
      });
    }

    if (existing.status_revisi === 'approved') {
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

    const updateKegiatanId = Number(req.body.kegiatan_id ?? existing.kegiatan_id);
    const updateRenstraId = Number(req.body.renstra_id ?? existing.renstra_id);
    const updateIndikatorId = Number(req.body.indikator_id ?? existing.indikator_id);

    const check = await validateKegiatanAndIndikator({
      renstra_id: updateRenstraId,
      kegiatan_id: updateKegiatanId,
      indikator_id: updateIndikatorId,
      transaction: t,
    });

    if (!check.valid) {
      await t.rollback();
      return res.status(check.status).json({
        message: check.message,
        blocked: true,
      });
    }

    const { kegiatan, indikator } = check;

    const beforeUpdateJson = existing.toJSON();

    const payloadBase = {
      ...existing.toJSON(),
      ...req.body,
      pagu_rpjmd_acuan: existing.pagu_rpjmd_acuan,
    };

    const payload = {
      ...buildKegiatanPayload({
        body: payloadBase,
        current: existing,
        kegiatan,
        indikator,
        userId,
      }),
      kebijakan_id: req.body.kebijakan_id ?? existing.kebijakan_id ?? null,
      status_revisi: 'draft',
      last_revised_at: new Date(),
      last_revised_by: userId,
      pagu_rpjmd_acuan: existing.pagu_rpjmd_acuan,
    };

    const versiSesudah = await insertHistory({
      current: existing,
      afterData: {
        ...payload,
        versi: Number(existing.versi || 1) + 1,
      },
      alasanRevisi: req.body.alasan_revisi,
      userId,
      transaction: t,
    });

    await existing.update(
      {
        ...payload,
        versi: versiSesudah,
      },
      { transaction: t },
    );

    await writeGlobalAudit({
      entity_id: existing.id,
      action: 'update',
      before_json: beforeUpdateJson,
      after_json: existing.toJSON(),
      user_id: userId,
      transaction: t,
    });

    await syncProgram({
      renstra_id:
        kegiatan.renstra_id ||
        kegiatan.renstra_opd_id ||
        kegiatan.program?.renstra_id ||
        updateRenstraId,
      program_id: existing.program_id,
      transaction: t,
    });

    const updatedFull = await RenstraTabelKegiatan.findByPk(existing.id, {
      include: tabelKegiatanListIncludes,
      transaction: t,
    });

    const result = applyTargetFinalIfMissing(updatedFull);

    await t.commit();

    return res.status(200).json({
      message: 'Data kegiatan berhasil diperbarui',
      data: result,
      blocked: false,
      audit_mode: true,
      workflow_state: 'draft',
    });
  } catch (err) {
    await t.rollback();
    return res.status(err.statusCode || 500).json({
      error: err.message,
      blocked: err.blocked || false,
    });
  }
};

// ------------------ DELETE ------------------
exports.delete = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const id = req.params.id;

    const kegiatan = await RenstraTabelKegiatan.findByPk(id, {
      transaction: t,
    });

    if (!kegiatan) {
      await t.rollback();
      return res.status(404).json({
        message: 'Data tidak ditemukan',
        blocked: true,
        warnings: {},
      });
    }

    if (kegiatan.status_revisi === 'approved') {
      await t.rollback();
      return res.status(409).json({
        message: 'Data approved tidak boleh dihapus',
        blocked: true,
        audit_mode: true,
      });
    }

    const deletedData = kegiatan.toJSON();

    await kegiatan.destroy({ transaction: t });

    await writeGlobalAudit({
      entity_id: Number(id),
      action: 'delete',
      before_json: deletedData,
      after_json: null,
      user_id: getUserId(req),
      transaction: t,
    });

    await t.commit();

    res.status(200).json({
      message: '✅ Data berhasil dihapus',
      blocked: false,
      warnings: {},
      data: applyPaguReadonly(deletedData),
    });
  } catch (err) {
    await t.rollback();
    res.status(err.statusCode || 500).json({
      error: err.message,
      blocked: err.blocked || false,
    });
  }
};

// ------------------ FINDERS ------------------
const tabelKegiatanListIncludes = [
  {
    model: RenstraProgram,
    as: 'program',
    attributes: ['id', 'kode_program', 'nama_program', 'opd_penanggung_jawab'],
  },
  {
    model: IndikatorRenstra,
    as: 'indikator_detail',
    attributes: [
      'id',
      'kode_indikator',
      'nama_indikator',
      'satuan',
      'baseline',
      'target_tahun_1',
      'target_tahun_2',
      'target_tahun_3',
      'target_tahun_4',
      'target_tahun_5',
      'target_tahun_6',
      'lokasi',
    ],
  },
  {
    model: RenstraKegiatan,
    as: 'kegiatan',
    attributes: ['id', 'kode_kegiatan', 'nama_kegiatan', 'bidang_opd'],
  },
  {
    model: RenstraTabelSubkegiatan,
    as: 'subkegiatans',
  },
];

exports.findAll = async (req, res) => {
  try {
    const queryFilters = ['renstra_id', 'program_id', 'kegiatan_id', 'indikator_id'].reduce(
      (acc, key) => {
        const parsed = parseOptionalPositiveInteger(req.query?.[key]);
        if (Number.isNaN(parsed)) {
          acc.invalid.push(key);
        } else if (parsed !== null) {
          acc.where[key] = parsed;
        }
        return acc;
      },
      { where: {}, invalid: [] },
    );

    if (queryFilters.invalid.length > 0) {
      return res.status(400).json({
        message: `Parameter query harus berupa bilangan bulat positif: ${queryFilters.invalid.join(
          ', ',
        )}`,
        blocked: true,
      });
    }

    const findAllOptions = {
      include: tabelKegiatanListIncludes,
      order: [['id', 'ASC']],
    };

    if (Object.keys(queryFilters.where).length > 0) {
      findAllOptions.where = queryFilters.where;
    }

    const data = await RenstraTabelKegiatan.findAll(findAllOptions);

    const result = data.map(applyTargetFinalIfMissing);

    return res.status(200).json(result);
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      error: err.message,
      blocked: err.blocked || false,
    });
  }
};

exports.findOne = async (req, res) => {
  try {
    const data = await RenstraTabelKegiatan.findByPk(req.params.id, {
      include: tabelKegiatanListIncludes,
    });

    if (!data) {
      return res.status(404).json({
        message: 'Data tidak ditemukan',
        blocked: true,
      });
    }

    const result = applyTargetFinalIfMissing(data);

    return res.status(200).json(result);
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      error: err.message,
      blocked: err.blocked || false,
    });
  }
};

// ------------------ HISTORY ------------------

exports.history = async (req, res) => {
  try {
    const { id } = req.params;

    const rows = await sequelize.query(
      `
      SELECT *
      FROM renstra_tabel_kegiatan_history
      WHERE renstra_tabel_kegiatan_id = :id
      ORDER BY id DESC
      `,
      {
        replacements: { id },
        type: QueryTypes.SELECT,
      },
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ------------------ HISTORY WORKFLOW ------------------

exports.verifikasiHistory = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { history_id } = req.params;
    const userId = getUserId(req);

    const [history] = await sequelize.query(
      `
      SELECT *
      FROM renstra_tabel_kegiatan_history
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
        blocked: true,
        audit_mode: true,
      });
    }

    const beforeRow = await RenstraTabelKegiatan.findByPk(history.renstra_tabel_kegiatan_id, {
      transaction: t,
    });

    await sequelize.query(
      `
      UPDATE renstra_tabel_kegiatan_history
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

    await RenstraTabelKegiatan.update(
      {
        status_revisi: 'verifikasi',
        last_revised_at: new Date(),
        last_revised_by: userId,
      },
      {
        where: { id: history.renstra_tabel_kegiatan_id },
        transaction: t,
      },
    );

    const afterRow = await RenstraTabelKegiatan.findByPk(history.renstra_tabel_kegiatan_id, {
      transaction: t,
    });

    await writeGlobalAudit({
      entity_id: history.renstra_tabel_kegiatan_id,
      action: 'verifikasi',
      before_json: beforeRow?.toJSON() || null,
      after_json: afterRow?.toJSON() || null,
      user_id: userId,
      transaction: t,
    });

    await t.commit();

    return res.json({
      message: 'Revisi kegiatan berhasil diverifikasi',
      blocked: false,
      audit_mode: true,
      workflow_state: 'verifikasi',
    });
  } catch (err) {
    await t.rollback();
    res.status(err.statusCode || 400).json({
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
      FROM renstra_tabel_kegiatan_history
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
        blocked: true,
        audit_mode: true,
      });
    }

    if (history.status_revisi !== 'verifikasi') {
      await t.rollback();
      return res.status(409).json({
        message: 'Revisi harus diverifikasi sebelum disetujui',
        blocked: true,
        audit_mode: true,
      });
    }

    const beforeRow = await RenstraTabelKegiatan.findByPk(history.renstra_tabel_kegiatan_id, {
      transaction: t,
    });

    await sequelize.query(
      `
      UPDATE renstra_tabel_kegiatan_history
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

    const afterJson = sanitizeHistoryPayload(parseJsonField(history.after_json));

    await RenstraTabelKegiatan.update(
      {
        ...afterJson,
        status_revisi: 'approved',
        versi: history.versi_sesudah,
        target_tahun_6: 0,
        pagu_tahun_6: 0,
        last_revised_at: new Date(),
        last_revised_by: userId,
      },
      {
        where: { id: history.renstra_tabel_kegiatan_id },
        transaction: t,
      },
    );

    const afterRow = await RenstraTabelKegiatan.findByPk(history.renstra_tabel_kegiatan_id, {
      transaction: t,
    });

    await writeGlobalAudit({
      entity_id: history.renstra_tabel_kegiatan_id,
      action: 'approve',
      before_json: beforeRow?.toJSON() || null,
      after_json: afterRow?.toJSON() || null,
      user_id: userId,
      transaction: t,
    });

    await t.commit();

    return res.json({
      message: 'Revisi kegiatan berhasil disetujui',
      blocked: false,
      audit_mode: true,
      workflow_state: 'approved',
    });
  } catch (err) {
    await t.rollback();
    res.status(err.statusCode || 400).json({
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
      FROM renstra_tabel_kegiatan_history
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
        blocked: true,
        audit_mode: true,
      });
    }

    if (!['draft', 'verifikasi'].includes(history.status_revisi)) {
      await t.rollback();
      return res.status(409).json({
        message: 'Hanya revisi draft atau verifikasi yang bisa ditolak.',
        blocked: true,
        audit_mode: true,
      });
    }

    const beforeRow = await RenstraTabelKegiatan.findByPk(history.renstra_tabel_kegiatan_id, {
      transaction: t,
    });

    await sequelize.query(
      `
      UPDATE renstra_tabel_kegiatan_history
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

    const beforeJson = sanitizeHistoryPayload(parseJsonField(history.before_json));

    await RenstraTabelKegiatan.update(
      {
        ...beforeJson,
        status_revisi: 'ditolak',
        versi: history.versi_sesudah,
        target_tahun_6: 0,
        pagu_tahun_6: 0,
        last_revised_at: new Date(),
        last_revised_by: userId,
      },
      {
        where: { id: history.renstra_tabel_kegiatan_id },
        transaction: t,
      },
    );

    const afterRow = await RenstraTabelKegiatan.findByPk(history.renstra_tabel_kegiatan_id, {
      transaction: t,
    });

    await writeGlobalAudit({
      entity_id: history.renstra_tabel_kegiatan_id,
      action: 'tolak',
      before_json: beforeRow?.toJSON() || null,
      after_json: afterRow?.toJSON() || null,
      user_id: userId,
      transaction: t,
    });

    await t.commit();

    return res.json({
      message: 'Revisi kegiatan berhasil ditolak',
      blocked: false,
      audit_mode: true,
      workflow_state: 'ditolak',
    });
  } catch (err) {
    await t.rollback();
    res.status(err.statusCode || 400).json({
      error: err.message,
      blocked: err.blocked || false,
    });
  }
};

// ------------------ REBUILD ACTIVE FROM HISTORY ------------------

exports.rebuildActiveFromHistory = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const current = await RenstraTabelKegiatan.findByPk(id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!current) {
      await t.rollback();
      return res.status(404).json({
        message: 'Data kegiatan tidak ditemukan',
        blocked: true,
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
      FROM renstra_tabel_kegiatan_history
      WHERE renstra_tabel_kegiatan_id = :id
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

    let latestApprovedHistory = null;

    if (history.status_revisi === 'ditolak') {
      const [approvedRow] = await sequelize.query(
        `
        SELECT *
        FROM renstra_tabel_kegiatan_history
        WHERE renstra_tabel_kegiatan_id = :id
          AND status_revisi = 'approved'
          AND id < :history_id
        ORDER BY id DESC
        LIMIT 1
        `,
        {
          replacements: {
            id,
            history_id: history.id,
          },
          type: QueryTypes.SELECT,
          transaction: t,
        },
      );

      latestApprovedHistory = approvedRow || null;
    }

    const [validPaguRow] = await sequelize.query(
      `
      SELECT *
      FROM renstra_tabel_kegiatan_history
      WHERE renstra_tabel_kegiatan_id = :id
        AND CAST(JSON_UNQUOTE(JSON_EXTRACT(after_json, '$.pagu_akhir_renstra')) AS DECIMAL(20,2)) > 0
      ORDER BY id DESC
      LIMIT 1
      `,
      {
        replacements: { id },
        type: QueryTypes.SELECT,
        transaction: t,
      },
    );

    const { payload, rebuild_source } = rebuildKegiatanPayloadFromHistory({
      current,
      history,
      latestApprovedHistory,
      latestValidPaguHistory: validPaguRow || null,
    });

    const beforeRebuildJson = current.toJSON();

    await RenstraTabelKegiatan.update(
      {
        ...payload,
        last_revised_at: new Date(),
        last_revised_by: userId,
      },
      {
        where: { id },
        transaction: t,
      },
    );

    await writeGlobalAudit({
      entity_id: Number(id),
      action: 'rebuild',
      before_json: beforeRebuildJson,
      after_json: {
        ...payload,
        rebuild_source,
      },
      user_id: userId,
      transaction: t,
    });

    const updated = await RenstraTabelKegiatan.findByPk(id, {
      include: tabelKegiatanListIncludes,
      transaction: t,
    });

    const result = applyPaguReadonly(updated);

    await t.commit();

    return res.json({
      message: 'Data aktif kegiatan berhasil dibangun ulang dari history',
      source: {
        history_id: history.id,
        status_revisi: history.status_revisi,
        versi_sebelum: history.versi_sebelum,
        versi_sesudah: history.versi_sesudah,
        rebuild_source,
      },
      data: result,
    });
  } catch (err) {
    await t.rollback();
    console.error('REBUILD ACTIVE KEGIATAN ERROR:', err);
    return res.status(err.statusCode || 400).json({
      error: err.message,
      blocked: err.blocked || false,
    });
  }
};

// ------------------ AVAILABLE PAGU ------------------
// 🔴 Dinonaktifkan karena kegiatan bukan sumber pagu.
// Pagu kegiatan berasal dari agregasi subkegiatan/cache.
exports.availablePagu = async (req, res) => {
  res.json({
    message: 'Pagu kegiatan bersifat read-only dan dihitung otomatis dari subkegiatan.',
    available: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    pagu_readonly: true,
  });
};
