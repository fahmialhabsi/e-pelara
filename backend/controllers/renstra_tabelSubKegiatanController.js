const { QueryTypes } = require('sequelize');
const {
  sequelize,
  RenstraTabelSubkegiatan,
  RenstraSubkegiatan,
  RenstraProgram,
  RenstraKegiatan,
  IndikatorRenstra,
  IndikatorSubKegiatan,
  RenstraAuditLogGlobal,
} = require('../models');

const renstraPaguSync = require('../services/renstraPaguCachedIncrementalSyncService');

const isApproved = (row) => row?.status_revisi === 'approved';

const parsePositiveIntQuery = (value, fieldName) => {
  const raw = Array.isArray(value) ? value[0] : value;

  if (raw === undefined || raw === null || raw === '') {
    return null;
  }

  const parsed = Number(raw);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    const error = new Error(`${fieldName} tidak valid. Harus bilangan bulat positif.`);
    error.statusCode = 400;
    throw error;
  }

  return parsed;
};

const allowApprovedSubkegiatanUpdate = async (transaction) => {
  await sequelize.query('SET @allow_approved_subkegiatan_update = 1', { transaction });
};

const lockApprovedSubkegiatanUpdate = async (transaction) => {
  await sequelize.query('SET @allow_approved_subkegiatan_update = 0', { transaction });
};

const getUserId = (req) => {
  return req.user?.id || req.user?.userId || req.userId || null;
};

const writeGlobalAudit = async ({
  module = 'sub_kegiatan',
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

const computeTargetOnly = (data) => {
  const targetValues = [1, 2, 3, 4, 5].map((i) => Number(data[`target_tahun_${i}`]) || 0);

  return {
    target_tahun_6: 0,
    target_akhir_renstra: roundUp2(
      targetValues.reduce((a, b) => a + b, 0) / targetValues.length || 0,
    ),
  };
};

const normalizeSubKegiatanPaguPayload = ({ body, current }) => {
  const paguRpjmdAcuan =
    Number(current?.pagu_rpjmd_acuan || 0) > 0
      ? Number(current.pagu_rpjmd_acuan || 0)
      : Number(body?.pagu_rpjmd_acuan || 0);

  const currentJson = current?.toJSON ? current.toJSON() : current || {};

  let paguValues = [1, 2, 3, 4, 5].map((i) => {
    const key = `pagu_tahun_${i}`;

    if (body?.[key] !== undefined && body?.[key] !== null && body?.[key] !== '') {
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
    pagu_akhir_renstra: paguValues.reduce((a, b) => a + b, 0),
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
    created_at,
    updated_at,
    renstra,
    program,
    kegiatan,
    sub_kegiatan,
    subkegiatan,
    indikator,
    indikator_detail,
    histories,
    children,
    ...payload
  } = json || {};

  return payload;
};

const applyPaguReadonly = (item) => {
  const json = item?.toJSON ? item.toJSON() : { ...item };

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

  json.target_tahun_1 = Number(json.target_tahun_1 || 0);
  json.target_tahun_2 = Number(json.target_tahun_2 || 0);
  json.target_tahun_3 = Number(json.target_tahun_3 || 0);
  json.target_tahun_4 = Number(json.target_tahun_4 || 0);
  json.target_tahun_5 = Number(json.target_tahun_5 || 0);
  json.target_tahun_6 = 0;

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

const insertHistory = async ({ current, afterData, alasanRevisi, userId, transaction }) => {
  const beforeJson = current.toJSON ? current.toJSON() : current;
  const versiSebelum = Number(beforeJson.versi || 1);
  const versiSesudah = versiSebelum + 1;

  await sequelize.query(
    `
    INSERT INTO renstra_tabel_subkegiatan_history
    (
      renstra_tabel_subkegiatan_id,
      renstra_id,
      sub_kegiatan_id,
      indikator_id,
      versi_sebelum,
      versi_sesudah,
      before_json,
      after_json,
      alasan_revisi,
      status_revisi,
      dibuat_oleh,
      dibuat_pada,
      created_at,
      updated_at
    )
    VALUES
    (
      :renstra_tabel_subkegiatan_id,
      :renstra_id,
      :sub_kegiatan_id,
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
        renstra_tabel_subkegiatan_id: beforeJson.id,
        renstra_id: afterData.renstra_id,
        sub_kegiatan_id: afterData.sub_kegiatan_id,
        indikator_id: afterData.indikator_id,
        versi_sebelum: versiSebelum,
        versi_sesudah: versiSesudah,
        before_json: JSON.stringify(beforeJson),
        after_json: JSON.stringify(afterData),
        alasan_revisi: alasanRevisi || 'Revisi data sub kegiatan',
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

const rebuildSubKegiatanPayloadFromHistory = ({
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
    ...normalizeSubKegiatanPaguPayload({
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

const getSourcePagu = async (indikator, transaction) => {
  if (!indikator?.source_indikator_id) return 0;

  const source = await IndikatorSubKegiatan.findByPk(indikator.source_indikator_id, {
    attributes: ['id', 'pagu_cached'],
    transaction,
  });

  return Number(source?.pagu_cached || 0);
};

const SUB_KEGIATAN_ALLOWED_BODY_FIELDS = [
  'renstra_id',
  'program_id',
  'kegiatan_id',
  'kebijakan_id',
  'strategi_id',
  'sub_kegiatan_id',
  'subkegiatan_id',
  'indikator_id',
  'indikator_manual',
  'kode_subkegiatan',
  'nama_subkegiatan',
  'sub_bidang_penanggung_jawab',
  'baseline',
  'satuan_target',
  'lokasi',
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

const buildSubKegiatanPayload = async ({
  body,
  current,
  subKegiatan,
  indikator,
  userId,
  transaction,
}) => {
  const paguRpjmdAcuan =
    Number(current?.pagu_rpjmd_acuan || 0) > 0
      ? Number(current.pagu_rpjmd_acuan || 0)
      : await getSourcePagu(indikator, transaction);

  const base = {
    ...body,

    renstra_id: Number(body.renstra_id || current?.renstra_id || subKegiatan.program?.renstra_id),
    program_id: Number(body.program_id || current?.program_id || subKegiatan.renstra_program_id),
    kegiatan_id: Number(body.kegiatan_id || current?.kegiatan_id || subKegiatan.kegiatan_id),
    sub_kegiatan_id: Number(body.sub_kegiatan_id || current?.sub_kegiatan_id || subKegiatan.id),
    subkegiatan_id: Number(
      body.subkegiatan_id || current?.subkegiatan_id || subKegiatan.sub_kegiatan_id,
    ),
    indikator_id: Number(body.indikator_id || current?.indikator_id || indikator.id),

    kode_subkegiatan:
      body.kode_subkegiatan || current?.kode_subkegiatan || subKegiatan.kode_sub_kegiatan,
    nama_subkegiatan:
      body.nama_subkegiatan || current?.nama_subkegiatan || subKegiatan.nama_sub_kegiatan,
    sub_bidang_penanggung_jawab:
      body.sub_bidang_penanggung_jawab ||
      current?.sub_bidang_penanggung_jawab ||
      subKegiatan.sub_bidang_opd,

    baseline: body.baseline ?? current?.baseline ?? indikator.baseline,
    satuan_target: body.satuan_target ?? indikator.satuan ?? current?.satuan_target,
    lokasi:
      body.lokasi ??
      current?.lokasi ??
      indikator.lokasi ??
      subKegiatan.sub_bidang_opd ??
      subKegiatan.nama_bidang_opd,

    target_tahun_1:
      body.target_tahun_1 !== undefined
        ? Number(body.target_tahun_1) || 0
        : Number(current?.target_tahun_1 || 0),
    target_tahun_2:
      body.target_tahun_2 !== undefined
        ? Number(body.target_tahun_2) || 0
        : Number(current?.target_tahun_2 || 0),
    target_tahun_3:
      body.target_tahun_3 !== undefined
        ? Number(body.target_tahun_3) || 0
        : Number(current?.target_tahun_3 || 0),
    target_tahun_4:
      body.target_tahun_4 !== undefined
        ? Number(body.target_tahun_4) || 0
        : Number(current?.target_tahun_4 || 0),
    target_tahun_5:
      body.target_tahun_5 !== undefined
        ? Number(body.target_tahun_5) || 0
        : Number(current?.target_tahun_5 || 0),
    target_tahun_6: 0,

    pagu_rpjmd_acuan: paguRpjmdAcuan,

    last_revised_at: new Date(),
    last_revised_by: userId,
  };

  return {
    ...base,
    ...computeTargetOnly(base),
    ...normalizeSubKegiatanPaguPayload({
      body: {
        ...body,
        pagu_rpjmd_acuan: paguRpjmdAcuan,
      },
      current: {
        ...current?.toJSON?.(),
        pagu_rpjmd_acuan: paguRpjmdAcuan,
      },
    }),
  };
};

const tabelSubKegiatanListIncludes = [
  {
    model: RenstraProgram,
    as: 'program',
    attributes: ['id', 'kode_program', 'nama_program', 'opd_penanggung_jawab'],
  },
  {
    model: RenstraKegiatan,
    as: 'kegiatan',
    attributes: ['id', 'kode_kegiatan', 'nama_kegiatan', 'bidang_opd'],
  },
  {
    model: RenstraSubkegiatan,
    as: 'sub_kegiatan',
    attributes: [
      'id',
      'kode_sub_kegiatan',
      'nama_sub_kegiatan',
      'sub_bidang_opd',
      'nama_opd',
      'nama_bidang_opd',
      'renstra_program_id',
      'kegiatan_id',
      'sub_kegiatan_id',
    ],
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
      'source_indikator_id',
    ],
  },
];

// ========================= CREATE =========================
exports.create = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    assertAllowedBodyFields(req.body, SUB_KEGIATAN_ALLOWED_BODY_FIELDS);

    const { renstra_id, sub_kegiatan_id, indikator_id } = req.body;
    const userId = getUserId(req);

    const subKegiatan = await RenstraSubkegiatan.findOne({
      where: { id: Number(sub_kegiatan_id) },
      include: [
        {
          model: RenstraProgram,
          as: 'program',
          attributes: ['id', 'renstra_id'],
        },
      ],
      transaction: t,
    });

    if (!subKegiatan) {
      await t.rollback();
      return res.status(400).json({
        message: 'sub_kegiatan_id tidak valid. Harus ID RenstraSubkegiatan.',
        blocked: true,
      });
    }

    const finalRenstraId = Number(renstra_id || subKegiatan.program?.renstra_id);

    const indikator = await IndikatorRenstra.findOne({
      where: {
        id: Number(indikator_id),
        renstra_id: finalRenstraId,
        stage: 'sub_kegiatan',
        ref_id: subKegiatan.id,
      },
      transaction: t,
    });

    if (!indikator) {
      await t.rollback();
      return res.status(400).json({
        message: 'indikator_id tidak valid. Harus ID indikator_renstra stage sub_kegiatan.',
        blocked: true,
      });
    }

    const existing = await RenstraTabelSubkegiatan.findOne({
      where: {
        renstra_id: finalRenstraId,
        sub_kegiatan_id: subKegiatan.id,
        indikator_id: indikator.id,
      },
      transaction: t,
    });

    if (existing) {
      await t.rollback();
      return res.status(409).json({
        message: 'Data sub kegiatan dengan indikator ini sudah ada. Gunakan Edit.',
        existing_id: existing.id,
        blocked: true,
      });
    }

    const payload = await buildSubKegiatanPayload({
      body: {
        ...req.body,
        renstra_id: finalRenstraId,
        kebijakan_id: req.body.kebijakan_id ?? null,
        strategi_id: req.body.strategi_id ?? null,
        sub_kegiatan_id: subKegiatan.id,
        indikator_id: indikator.id,
      },
      current: null,
      subKegiatan,
      indikator,
      userId,
      transaction: t,
    });

    const created = await RenstraTabelSubkegiatan.create(
      {
        ...payload,
        status_revisi: 'draft',
        versi: 1,
      },
      { transaction: t },
    );

    await writeGlobalAudit({
      entity_id: created.id,
      action: 'create',
      before_json: null,
      after_json: created.toJSON(),
      user_id: userId,
      transaction: t,
    });

    if (typeof renstraPaguSync.syncFromSubKegiatan === 'function') {
      await renstraPaguSync.syncFromSubKegiatan({
        subkegiatan: created,
        type: 'create',
        transaction: t,
      });
    }

    await t.commit();

    return res.status(201).json({
      message: 'Sub kegiatan berhasil ditambahkan',
      data: applyPaguReadonly(created),
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

// ========================= CREATE REVISI =========================
exports.createRevisi = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    assertAllowedBodyFields(req.body, SUB_KEGIATAN_ALLOWED_BODY_FIELDS);

    const { id } = req.params;
    const userId = getUserId(req);

    if (!req.body.alasan_revisi || !String(req.body.alasan_revisi).trim()) {
      await t.rollback();
      return res.status(400).json({
        message: 'alasan_revisi wajib diisi saat membuat revisi',
      });
    }

    const current = await RenstraTabelSubkegiatan.findByPk(id, {
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
      });
    }

    const subKegiatan = await RenstraSubkegiatan.findOne({
      where: {
        id: Number(req.body.sub_kegiatan_id || current.sub_kegiatan_id),
      },
      include: [
        {
          model: RenstraProgram,
          as: 'program',
          attributes: ['id', 'renstra_id'],
        },
      ],
      transaction: t,
    });

    if (!subKegiatan) {
      await t.rollback();
      return res.status(400).json({
        message: 'sub_kegiatan_id tidak valid. Harus ID RenstraSubkegiatan.',
      });
    }

    const finalRenstraId = Number(
      req.body.renstra_id || current.renstra_id || subKegiatan.program?.renstra_id,
    );

    const indikator = await IndikatorRenstra.findOne({
      where: {
        id: Number(req.body.indikator_id || current.indikator_id),
        renstra_id: finalRenstraId,
        stage: 'sub_kegiatan',
        ref_id: subKegiatan.id,
      },
      transaction: t,
    });

    if (!indikator) {
      await t.rollback();
      return res.status(400).json({
        message: 'indikator_id tidak valid. Harus ID indikator_renstra stage sub_kegiatan.',
      });
    }

    const payload = {
      ...(await buildSubKegiatanPayload({
        body: req.body,
        current,
        subKegiatan,
        indikator,
        userId,
        transaction: t,
      })),
      kebijakan_id: req.body.kebijakan_id ?? null,
      strategi_id: req.body.strategi_id ?? null,
      status_revisi: 'draft',
      versi: Number(current.versi || 1) + 1,
    };

    const versiSesudah = await insertHistory({
      current,
      afterData: payload,
      alasanRevisi: req.body.alasan_revisi,
      userId,
      transaction: t,
    });

    await allowApprovedSubkegiatanUpdate(t);

    try {
      await RenstraTabelSubkegiatan.update(
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
      await lockApprovedSubkegiatanUpdate(t);
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

    await t.commit();

    const result = await RenstraTabelSubkegiatan.findByPk(id, {
      include: tabelSubKegiatanListIncludes,
    });

    return res.json({
      message: 'Revisi sub kegiatan berhasil dibuat sebagai draft',
      data: applyPaguReadonly(result),
      blocked: false,
      audit_mode: true,
      workflow_state: 'draft',
    });
  } catch (err) {
    await t.rollback();
    console.error('CREATE REVISI SUB KEGIATAN ERROR:', err);
    return res.status(err.statusCode || 400).json({
      error: err.message,
      blocked: err.blocked || false,
    });
  }
};

// ========================= UPDATE =========================
exports.update = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    assertAllowedBodyFields(req.body, SUB_KEGIATAN_ALLOWED_BODY_FIELDS);

    const id = req.params.id;
    const userId = getUserId(req);

    const existing = await RenstraTabelSubkegiatan.findByPk(id, {
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

    if (isApproved(existing)) {
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

    const subKegiatan = await RenstraSubkegiatan.findOne({
      where: {
        id: Number(req.body.sub_kegiatan_id || existing.sub_kegiatan_id),
      },
      include: [
        {
          model: RenstraProgram,
          as: 'program',
          attributes: ['id', 'renstra_id'],
        },
      ],
      transaction: t,
    });

    if (!subKegiatan) {
      await t.rollback();
      return res.status(400).json({
        message: 'sub_kegiatan_id tidak valid. Harus ID RenstraSubkegiatan.',
      });
    }

    const finalRenstraId = Number(
      req.body.renstra_id || existing.renstra_id || subKegiatan.program?.renstra_id,
    );

    const indikator = await IndikatorRenstra.findOne({
      where: {
        id: Number(req.body.indikator_id || existing.indikator_id),
        renstra_id: finalRenstraId,
        stage: 'sub_kegiatan',
        ref_id: subKegiatan.id,
      },
      transaction: t,
    });

    if (!indikator) {
      await t.rollback();
      return res.status(400).json({
        message: 'indikator_id tidak valid. Harus ID indikator_renstra stage sub_kegiatan.',
      });
    }

    const payload = {
      ...(await buildSubKegiatanPayload({
        body: req.body,
        current: existing,
        subKegiatan,
        indikator,
        userId,
        transaction: t,
      })),
      kebijakan_id: req.body.kebijakan_id ?? null,
      strategi_id: req.body.strategi_id ?? null,
      status_revisi: 'draft',
      versi: Number(existing.versi || 1) + 1,
    };

    const versiSesudah = await insertHistory({
      current: existing,
      afterData: payload,
      alasanRevisi: req.body.alasan_revisi,
      userId,
      transaction: t,
    });

    const beforeUpdateJson = existing.toJSON();

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

    if (typeof renstraPaguSync.syncFromSubKegiatan === 'function') {
      await renstraPaguSync.syncFromSubKegiatan({
        subkegiatan: existing,
        type: 'update',
        transaction: t,
      });
    }

    await t.commit();

    return res.status(200).json({
      message: 'Sub kegiatan berhasil diperbarui',
      data: applyPaguReadonly(existing),
      blocked: false,
      audit_mode: true,
      workflow_state: 'draft',
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

    const sub = await RenstraTabelSubkegiatan.findByPk(id, {
      transaction: t,
    });

    if (!sub) {
      await t.rollback();
      return res.status(404).json({
        message: 'Data tidak ditemukan',
        blocked: true,
      });
    }

    if (sub.status_revisi === 'approved') {
      await t.rollback();
      return res.status(409).json({
        message: 'Data approved tidak boleh dihapus',
        blocked: true,
        audit_mode: true,
      });
    }

    const deletedData = sub.toJSON();

    await sub.destroy({ transaction: t });

    await writeGlobalAudit({
      entity_id: Number(id),
      action: 'delete',
      before_json: deletedData,
      after_json: null,
      user_id: getUserId(req),
      transaction: t,
    });

    if (typeof renstraPaguSync.syncFromSubKegiatan === 'function') {
      await renstraPaguSync.syncFromSubKegiatan({
        subkegiatan: deletedData,
        type: 'delete',
        transaction: t,
      });
    }

    await t.commit();

    return res.json({
      message: 'Sub kegiatan berhasil dihapus',
      data: applyPaguReadonly(deletedData),
      blocked: false,
    });
  } catch (err) {
    await t.rollback();
    return res.status(500).json({ error: err.message });
  }
};

// ========================= FIND ALL =========================
exports.findAll = async (req, res) => {
  try {
    const subKegiatanQuery = req.query.sub_kegiatan_id ?? req.query.subkegiatan_id;

    if (
      req.query.sub_kegiatan_id !== undefined &&
      req.query.subkegiatan_id !== undefined &&
      String(req.query.sub_kegiatan_id) !== String(req.query.subkegiatan_id)
    ) {
      return res.status(400).json({
        message: 'sub_kegiatan_id dan subkegiatan_id tidak boleh berbeda.',
      });
    }

    const where = {};

    const renstraId = parsePositiveIntQuery(req.query.renstra_id, 'renstra_id');
    if (renstraId !== null) {
      where.renstra_id = renstraId;
    }

    const programId = parsePositiveIntQuery(req.query.program_id, 'program_id');
    if (programId !== null) {
      where.program_id = programId;
    }

    const kegiatanId = parsePositiveIntQuery(req.query.kegiatan_id, 'kegiatan_id');
    if (kegiatanId !== null) {
      where.kegiatan_id = kegiatanId;
    }

    const subKegiatanId = parsePositiveIntQuery(subKegiatanQuery, 'sub_kegiatan_id');
    if (subKegiatanId !== null) {
      where.sub_kegiatan_id = subKegiatanId;
    }

    const indikatorId = parsePositiveIntQuery(req.query.indikator_id, 'indikator_id');
    if (indikatorId !== null) {
      where.indikator_id = indikatorId;
    }

    const rows = await RenstraTabelSubkegiatan.findAll({
      where,
      include: tabelSubKegiatanListIncludes,
      order: [['id', 'ASC']],
    });

    return res.status(200).json(rows.map((row) => applyPaguReadonly(row)));
  } catch (err) {
    if (err?.statusCode === 400) {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ error: err.message });
  }
};

// ========================= FIND ONE =========================
exports.findOne = async (req, res) => {
  try {
    const data = await RenstraTabelSubkegiatan.findByPk(req.params.id, {
      include: tabelSubKegiatanListIncludes,
    });

    if (!data) {
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }

    return res.status(200).json(applyPaguReadonly(data));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// ========================= HISTORY =========================
exports.history = async (req, res) => {
  try {
    const { id } = req.params;

    const rows = await sequelize.query(
      `
      SELECT *
      FROM renstra_tabel_subkegiatan_history
      WHERE renstra_tabel_subkegiatan_id = :id
      ORDER BY id DESC
      `,
      {
        replacements: { id },
        type: QueryTypes.SELECT,
      },
    );

    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// ========================= WORKFLOW =========================
exports.verifikasiHistory = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { history_id } = req.params;
    const userId = getUserId(req);

    const [history] = await sequelize.query(
      `
      SELECT *
      FROM renstra_tabel_subkegiatan_history
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
      UPDATE renstra_tabel_subkegiatan_history
      SET
        status_revisi = 'verifikasi',
        diverifikasi_oleh = :userId,
        diverifikasi_pada = NOW(),
        updated_at = NOW()
      WHERE id = :history_id
      `,
      {
        replacements: { history_id, userId },
        transaction: t,
      },
    );

    await RenstraTabelSubkegiatan.update(
      {
        status_revisi: 'verifikasi',
        last_revised_at: new Date(),
        last_revised_by: userId,
      },
      {
        where: { id: history.renstra_tabel_subkegiatan_id },
        transaction: t,
      },
    );

    await writeGlobalAudit({
      entity_id: history.renstra_tabel_subkegiatan_id,
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

    return res.json({
      message: 'Revisi sub kegiatan berhasil diverifikasi',
      blocked: false,
      audit_mode: true,
      workflow_state: 'verifikasi',
    });
  } catch (err) {
    await t.rollback();
    return res.status(400).json({ error: err.message });
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
      FROM renstra_tabel_subkegiatan_history
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

    await sequelize.query(
      `
      UPDATE renstra_tabel_subkegiatan_history
      SET
        status_revisi = 'approved',
        disetujui_oleh = :userId,
        disetujui_pada = NOW(),
        updated_at = NOW()
      WHERE id = :history_id
      `,
      {
        replacements: { history_id, userId },
        transaction: t,
      },
    );

    const afterJson = sanitizeHistoryPayload(parseJsonField(history.after_json));

    await RenstraTabelSubkegiatan.update(
      {
        ...afterJson,
        status_revisi: 'approved',
        versi: history.versi_sesudah,
        last_revised_at: new Date(),
        last_revised_by: userId,
      },
      {
        where: { id: history.renstra_tabel_subkegiatan_id },
        transaction: t,
      },
    );

    await writeGlobalAudit({
      entity_id: history.renstra_tabel_subkegiatan_id,
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

    return res.json({
      message: 'Revisi sub kegiatan berhasil disetujui',
      blocked: false,
      audit_mode: true,
      workflow_state: 'approved',
    });
  } catch (err) {
    await t.rollback();
    return res.status(400).json({ error: err.message });
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
      FROM renstra_tabel_subkegiatan_history
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

    await sequelize.query(
      `
      UPDATE renstra_tabel_subkegiatan_history
      SET
        status_revisi = 'ditolak',
        diverifikasi_oleh = :userId,
        diverifikasi_pada = NOW(),
        updated_at = NOW()
      WHERE id = :history_id
      `,
      {
        replacements: { history_id, userId },
        transaction: t,
      },
    );

    const beforeJson = sanitizeHistoryPayload(parseJsonField(history.before_json));

    await RenstraTabelSubkegiatan.update(
      {
        ...beforeJson,
        status_revisi: 'ditolak',
        versi: history.versi_sesudah,
        last_revised_at: new Date(),
        last_revised_by: userId,
      },
      {
        where: { id: history.renstra_tabel_subkegiatan_id },
        transaction: t,
      },
    );

    await writeGlobalAudit({
      entity_id: history.renstra_tabel_subkegiatan_id,
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

    return res.json({
      message: 'Revisi sub kegiatan berhasil ditolak',
      blocked: false,
      audit_mode: true,
      workflow_state: 'ditolak',
    });
  } catch (err) {
    await t.rollback();
    return res.status(400).json({ error: err.message });
  }
};

// ========================= REBUILD ACTIVE FROM HISTORY =========================
exports.rebuildActiveFromHistory = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const current = await RenstraTabelSubkegiatan.findByPk(id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!current) {
      await t.rollback();
      return res.status(404).json({
        message: 'Data sub kegiatan tidak ditemukan',
      });
    }

    if (current.status_revisi === 'approved') {
      await t.rollback();
      return res.status(409).json({
        message: 'Data approved tidak boleh rebuild langsung.',
        blocked: true,
        audit_mode: true,
      });
    }

    const [history] = await sequelize.query(
      `
      SELECT *
      FROM renstra_tabel_subkegiatan_history
      WHERE renstra_tabel_subkegiatan_id = :id
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
        FROM renstra_tabel_subkegiatan_history
        WHERE renstra_tabel_subkegiatan_id = :id
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
      FROM renstra_tabel_subkegiatan_history
      WHERE renstra_tabel_subkegiatan_id = :id
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

    const { payload, rebuild_source } = rebuildSubKegiatanPayloadFromHistory({
      current,
      history,
      latestApprovedHistory,
      latestValidPaguHistory: validPaguRow || null,
    });

    const beforeRebuildJson = current.toJSON();

    await RenstraTabelSubkegiatan.update(
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

    const updated = await RenstraTabelSubkegiatan.findByPk(id, {
      include: tabelSubKegiatanListIncludes,
      transaction: t,
    });

    const result = applyPaguReadonly(updated);

    await t.commit();

    return res.json({
      message: 'Data aktif sub kegiatan berhasil dibangun ulang dari history',
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
    console.error('REBUILD ACTIVE SUB KEGIATAN ERROR:', err);
    return res.status(400).json({
      error: err.message,
    });
  }
};

// ========================= EXPORT EXCEL =========================
exports.exportExcel = async (req, res) => {
  return res.status(501).json({
    message: 'Export Excel Sub Kegiatan belum diimplementasikan',
  });
};

// ========================= EXPORT PDF =========================
exports.exportPdf = async (req, res) => {
  return res.status(501).json({
    message: 'Export PDF Sub Kegiatan belum diimplementasikan',
  });
};
