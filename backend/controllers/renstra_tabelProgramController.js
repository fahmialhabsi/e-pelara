// controllers/renstra_tabelProgramController.js
const { Op, QueryTypes } = require('sequelize');

const {
  sequelize,
  RenstraTabelProgram,
  RenstraProgram,
  IndikatorRenstra,
  IndikatorProgram,
  RenstraAuditLogGlobal,
} = require('../models');

const { programWhereForRenstraOpdQuery } = require('../helpers/renstraOpdProgramFilter');
const { buildBaseRenstraPayload } = require('../services/renstraPayloadBuilderHelper');

const { attachCacheToRows, applyPaguFromCache } = require('../services/renstraPaguCacheHelper');

const { syncProgram } = require('../services/renstraPaguCachedIncrementalSyncService');

// ========================= UTIL =========================

const roundUp2 = (value) => {
  const num = Number(value) || 0;
  return Math.ceil(num * 100) / 100;
};

const computeFinalFromTahun = (data = {}) => {
  const targetValues = [1, 2, 3, 4, 5].map((i) => Number(data?.[`target_tahun_${i}`]) || 0);

  const avg = targetValues.reduce((a, b) => a + b, 0) / targetValues.length || 0;

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
    json.target_akhir_renstra = computeFinalFromTahun(json).target_akhir_renstra;
  }

  return json;
};

const getUserId = (req) => {
  return req.user?.id || req.user?.userId || req.userId || null;
};

const allowApprovedProgramUpdate = async (transaction) => {
  await sequelize.query('SET @allow_approved_program_update = 1', {
    transaction,
  });
};

const lockApprovedProgramUpdate = async (transaction) => {
  await sequelize.query('SET @allow_approved_program_update = 0', {
    transaction,
  });
};

const writeGlobalAudit = async ({
  module = 'program',
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

const buildLockedPaguPayload = () => ({
  pagu_tahun_1: 0,
  pagu_tahun_2: 0,
  pagu_tahun_3: 0,
  pagu_tahun_4: 0,
  pagu_tahun_5: 0,
  pagu_tahun_6: 0,
  pagu_akhir_renstra: 0,
});

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
    indikator_detail,
    renstra,
    histories,
    children,
    ...payload
  } = json || {};

  return payload;
};

const normalizeProgramPaguPayload = (input = {}) => {
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

const getProgramPaguRpjmdAcuan = async ({ indikator, transaction }) => {
  if (!indikator?.source_indikator_id) return 0;

  const source = await IndikatorProgram.findByPk(indikator.source_indikator_id, {
    attributes: ['id', 'pagu_cached'],
    raw: true,
    transaction,
  });

  return Number(source?.pagu_cached || 0);
};

const PROGRAM_ALLOWED_BODY_FIELDS = [
  'renstra_id',
  'program_id',
  'kebijakan_id',
  'indikator_id',

  'kode_program',
  'nama_program',
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

const buildProgramPayload = ({ body, current, program, indikator, userId }) => {
  const basePayload = buildBaseRenstraPayload({
    body,
    allowedFields: PROGRAM_ALLOWED_BODY_FIELDS,
    excludedFields: ['alasan_revisi'],
    current,
    master: program,
    indikator,
    userId,
    levelIdField: 'program_id',
    kodeField: 'kode_program',
    deskripsiField: 'nama_program',
    masterKodeField: 'kode_program',
    masterDeskripsiField: 'nama_program',
    computeFinal: computeFinalFromTahun,

    // Jangan biarkan shared builder mengunci pagu Program ke 0.
    buildPaguPayload: () => ({}),
  });

  return {
    ...basePayload,
    ...normalizeProgramPaguPayload({
      body,
      current,
    }),
    target_tahun_6: 0,
    pagu_tahun_6: 0,
  };
};

const validateProgramAndIndikator = async ({
  renstra_id,
  program_id,
  indikator_id,
  transaction,
}) => {
  if (!renstra_id || !program_id || !indikator_id) {
    return {
      valid: false,
      status: 400,
      message: 'renstra_id, program_id, dan indikator_id wajib diisi',
    };
  }

  const program = await RenstraProgram.findOne({
    where: {
      id: program_id,
      renstra_id,
    },
    transaction,
  });

  if (!program) {
    return {
      valid: false,
      status: 400,
      message: 'program_id tidak valid. Harus ID RenstraProgram.',
    };
  }

  const indikator = await IndikatorRenstra.findOne({
    where: {
      id: indikator_id,
      renstra_id,
      stage: 'program',
      ref_id: program_id,
    },
    transaction,
  });

  if (!indikator) {
    return {
      valid: false,
      status: 400,
      message:
        'indikator_id tidak valid. Harus ID indikator_renstra stage program dengan ref_id = program_id.',
    };
  }

  return {
    valid: true,
    program,
    indikator,
  };
};

const insertHistory = async ({ current, afterData, alasanRevisi, userId, transaction }) => {
  const beforeJson = current.toJSON ? current.toJSON() : current;
  const versiSebelum = Number(beforeJson.versi || 1);
  const versiSesudah = versiSebelum + 1;

  await sequelize.query(
    `
    INSERT INTO renstra_tabel_program_history
    (
      renstra_tabel_program_id,
      renstra_id,
      program_id,
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
      :renstra_tabel_program_id,
      :renstra_id,
      :program_id,
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
        renstra_tabel_program_id: beforeJson.id,
        renstra_id: afterData.renstra_id,
        program_id: afterData.program_id,
        indikator_id: afterData.indikator_id,
        versi_sebelum: versiSebelum,
        versi_sesudah: versiSesudah,
        before_json: JSON.stringify(beforeJson),
        after_json: JSON.stringify(afterData),
        alasan_revisi: alasanRevisi || 'Revisi data program',
        dibuat_oleh: userId,
      },
      transaction,
    },
  );

  return versiSesudah;
};

const attachProgramCacheToRows = async ({ rows, transaction }) => {
  const rowsWithTarget = rows.map(applyTargetFinalIfMissing);

  return attachCacheToRows({
    rows: rowsWithTarget,
    stage: 'program',

    // Standar final:
    // cache.ref_id = id baris RenstraTabelProgram
    renstraIdField: 'renstra_id',
    refIdField: 'id',

    transaction,
  });
};

// ========================= CREATE =========================

exports.create = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    assertAllowedBodyFields(req.body, PROGRAM_ALLOWED_BODY_FIELDS);

    const check = await validateProgramAndIndikator({
      renstra_id: req.body.renstra_id,
      program_id: req.body.program_id,
      indikator_id: req.body.indikator_id,
      transaction: t,
    });

    if (!check.valid) {
      await t.rollback();
      return res.status(check.status).json({ message: check.message });
    }

    const { program, indikator } = check;

    const existing = await RenstraTabelProgram.findOne({
      where: {
        renstra_id: req.body.renstra_id,
        program_id: req.body.program_id,
        indikator_id: req.body.indikator_id,
      },
      transaction: t,
    });

    if (existing) {
      await t.rollback();
      return res.status(409).json({
        message: 'Data program dengan indikator ini sudah ada. Gunakan Edit.',
        existing_id: existing.id,
        blocked: true,
      });
    }

    const paguRpjmdAcuan = await getProgramPaguRpjmdAcuan({
      indikator,
      transaction: t,
    });

    const bodyWithPaguAcuan = {
      ...req.body,
      pagu_rpjmd_acuan: paguRpjmdAcuan,
    };

    const payload = {
      ...buildProgramPayload({
        body: bodyWithPaguAcuan,
        current: null,
        program,
        indikator,
        userId: getUserId(req),
      }),
      kebijakan_id: req.body.kebijakan_id ?? null,
      pagu_rpjmd_acuan: paguRpjmdAcuan,
      status_revisi: 'draft',
      versi: 1,
      last_revised_at: null,
      last_revised_by: null,
    };

    const created = await RenstraTabelProgram.create(payload, {
      transaction: t,
    });

    await writeGlobalAudit({
      entity_id: created.id,
      action: 'create',
      before_json: null,
      after_json: created.toJSON(),
      user_id: getUserId(req),
      transaction: t,
    });

    // 🔄 Jika Kegiatan/SubKegiatan sudah ada lebih dulu,
    // sync ulang cache program setelah row Program terbentuk.
    await syncProgram({
      renstra_id: program.renstra_id || program.renstra_opd_id || req.body.renstra_id,
      program_id: created.program_id,
      transaction: t,
    });

    const createdFull = await RenstraTabelProgram.findByPk(created.id, {
      include: [
        { model: RenstraProgram, as: 'program' },
        { model: IndikatorRenstra, as: 'indikator_detail' },
      ],
      transaction: t,
    });

    const result = applyTargetFinalIfMissing(createdFull);

    await t.commit();

    res.status(201).json({
      message: 'Program berhasil ditambahkan',
      data: result,
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

// ====================== CREATE REVISI DARI DATA APPROVED =========================
exports.createRevisi = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    assertAllowedBodyFields(req.body, PROGRAM_ALLOWED_BODY_FIELDS);

    const { id } = req.params;
    const userId = getUserId(req);

    if (!req.body.alasan_revisi || !String(req.body.alasan_revisi).trim()) {
      await t.rollback();
      return res.status(400).json({
        message: 'alasan_revisi wajib diisi saat membuat revisi',
        blocked: true,
      });
    }

    const current = await RenstraTabelProgram.findByPk(id, {
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
        audit_mode: true,
      });
    }

    const payloadBase = {
      ...current.toJSON(),
      ...req.body,
      pagu_rpjmd_acuan: current.pagu_rpjmd_acuan,
    };

    const check = await validateProgramAndIndikator({
      renstra_id: payloadBase.renstra_id,
      program_id: payloadBase.program_id,
      indikator_id: payloadBase.indikator_id,
      transaction: t,
    });

    if (!check.valid) {
      await t.rollback();
      return res.status(check.status).json({
        message: check.message,
        blocked: true,
      });
    }

    const payload = {
      ...buildProgramPayload({
        body: payloadBase,
        current,
        program: check.program,
        indikator: check.indikator,
        userId,
      }),
      kebijakan_id: req.body.kebijakan_id ?? null,
      status_revisi: 'draft',
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

    await allowApprovedProgramUpdate(t);

    try {
      await RenstraTabelProgram.update(
        {
          ...payload,
          versi: versiSesudah,
          target_tahun_6: 0,
          pagu_tahun_6: 0,
        },
        {
          where: { id },
          transaction: t,
        },
      );
    } finally {
      await lockApprovedProgramUpdate(t);
    }

    const updatedData = await RenstraTabelProgram.findByPk(id, {
      include: [
        { model: RenstraProgram, as: 'program' },
        { model: IndikatorRenstra, as: 'indikator_detail' },
      ],
      transaction: t,
    });

    await writeGlobalAudit({
      entity_id: Number(id),
      action: 'revisi',
      before_json: current.toJSON(),
      after_json: updatedData.toJSON(),
      user_id: userId,
      transaction: t,
    });

    const result = applyTargetFinalIfMissing(updatedData);

    await t.commit();

    return res.json({
      message: 'Revisi program berhasil dibuat sebagai draft',
      data: result,
      blocked: false,
      audit_mode: true,
      workflow_state: 'draft',
    });
  } catch (err) {
    await lockApprovedProgramUpdate(t).catch(() => {});
    await t.rollback();
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
    assertAllowedBodyFields(req.body, PROGRAM_ALLOWED_BODY_FIELDS);

    const { id } = req.params;
    const userId = getUserId(req);

    const current = await RenstraTabelProgram.findByPk(id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
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
      ...current.toJSON(),
      ...req.body,
      pagu_rpjmd_acuan: current.pagu_rpjmd_acuan,
    };

    const check = await validateProgramAndIndikator({
      renstra_id: payloadBase.renstra_id,
      program_id: payloadBase.program_id,
      indikator_id: payloadBase.indikator_id,
      transaction: t,
    });

    if (!check.valid) {
      await t.rollback();
      return res.status(check.status).json({
        message: check.message,
        blocked: true,
      });
    }

    const duplicate = await RenstraTabelProgram.findOne({
      where: {
        id: { [Op.ne]: id },
        renstra_id: payloadBase.renstra_id,
        program_id: payloadBase.program_id,
        indikator_id: payloadBase.indikator_id,
      },
      transaction: t,
    });

    if (duplicate) {
      await t.rollback();
      return res.status(409).json({
        message: 'Data program dengan indikator ini sudah ada. Gunakan Edit.',
        existing_id: duplicate.id,
        blocked: true,
      });
    }

    const payload = {
      ...buildProgramPayload({
        body: payloadBase,
        current,
        program: check.program,
        indikator: check.indikator,
        userId,
      }),
      kebijakan_id: req.body.kebijakan_id ?? null,
      status_revisi: 'draft',
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

    await RenstraTabelProgram.update(
      {
        ...payload,
        versi: versiSesudah,
        target_tahun_6: 0,
        pagu_tahun_6: 0,
      },
      {
        where: { id },
        transaction: t,
      },
    );

    const updatedData = await RenstraTabelProgram.findByPk(id, {
      include: [
        { model: RenstraProgram, as: 'program' },
        { model: IndikatorRenstra, as: 'indikator_detail' },
      ],
      transaction: t,
    });

    await writeGlobalAudit({
      entity_id: Number(id),
      action: 'update',
      before_json: current.toJSON(),
      after_json: updatedData.toJSON(),
      user_id: userId,
      transaction: t,
    });

    const result = applyTargetFinalIfMissing(updatedData);

    await t.commit();

    return res.json({
      message: 'Data program berhasil diperbarui',
      data: result,
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

// ========================= HISTORY =========================

exports.history = async (req, res) => {
  try {
    const { id } = req.params;

    const rows = await sequelize.query(
      `
      SELECT *
      FROM renstra_tabel_program_history
      WHERE renstra_tabel_program_id = :id
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

// ========================= HISTORY WORKFLOW =========================

exports.verifikasiHistory = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { history_id } = req.params;
    const userId = getUserId(req);

    const [history] = await sequelize.query(
      `
      SELECT *
      FROM renstra_tabel_program_history
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

    const beforeRow = await RenstraTabelProgram.findByPk(history.renstra_tabel_program_id, {
      transaction: t,
    });

    await sequelize.query(
      `
      UPDATE renstra_tabel_program_history
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

    await RenstraTabelProgram.update(
      {
        status_revisi: 'verifikasi',
        last_revised_at: new Date(),
        last_revised_by: userId,
      },
      {
        where: { id: history.renstra_tabel_program_id },
        transaction: t,
      },
    );

    const afterRow = await RenstraTabelProgram.findByPk(history.renstra_tabel_program_id, {
      transaction: t,
    });

    await writeGlobalAudit({
      entity_id: history.renstra_tabel_program_id,
      action: 'verifikasi',
      before_json: beforeRow?.toJSON() || null,
      after_json: afterRow?.toJSON() || null,
      user_id: userId,
      transaction: t,
    });

    await t.commit();

    return res.json({
      message: 'Revisi program berhasil diverifikasi',
      blocked: false,
      audit_mode: true,
      workflow_state: 'verifikasi',
    });
  } catch (err) {
    await t.rollback();
    return res.status(err.statusCode || 400).json({
      error: err.message,
      blocked: err.blocked || false,
    });
  }
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

const rebuildProgramPayloadFromHistory = ({
  current,
  history,
  latestApprovedHistory = null,
  latestValidPaguHistory = null,
}) => {
  const status = history.status_revisi;

  const selected = getValidHistoryPayload({
    history,
    approvedHistory: latestApprovedHistory,
    validPaguHistory: latestValidPaguHistory,
  });

  let payload = sanitizeHistoryPayload(selected.json);

  payload = {
    ...payload,
    ...normalizeProgramPaguPayload({
      body: payload,
      current,
    }),
  };

  payload = {
    ...payload,
    ...computeFinalFromTahun(payload),
  };

  return {
    payload: {
      ...payload,
      status_revisi: status,
      versi: Number(history.versi_sesudah || current.versi || 1),
    },
    rebuild_source: {
      source: selected.source,
      source_history_id: selected.source_history_id,
    },
  };
};

exports.approveHistory = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { history_id } = req.params;
    const userId = getUserId(req);

    const [history] = await sequelize.query(
      `
      SELECT *
      FROM renstra_tabel_program_history
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

    const beforeRow = await RenstraTabelProgram.findByPk(history.renstra_tabel_program_id, {
      transaction: t,
    });

    const afterJson = sanitizeHistoryPayload(parseJsonField(history.after_json));

    await sequelize.query(
      `
      UPDATE renstra_tabel_program_history
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

    await RenstraTabelProgram.update(
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
        where: { id: history.renstra_tabel_program_id },
        transaction: t,
      },
    );

    const afterRow = await RenstraTabelProgram.findByPk(history.renstra_tabel_program_id, {
      transaction: t,
    });

    await writeGlobalAudit({
      entity_id: history.renstra_tabel_program_id,
      action: 'approve',
      before_json: beforeRow?.toJSON() || null,
      after_json: afterRow?.toJSON() || null,
      user_id: userId,
      transaction: t,
    });

    await t.commit();

    return res.json({
      message: 'Revisi program berhasil disetujui',
      blocked: false,
      audit_mode: true,
      workflow_state: 'approved',
    });
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
      FROM renstra_tabel_program_history
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

    const beforeRow = await RenstraTabelProgram.findByPk(history.renstra_tabel_program_id, {
      transaction: t,
    });

    const beforeJson = sanitizeHistoryPayload(parseJsonField(history.before_json));

    await sequelize.query(
      `
      UPDATE renstra_tabel_program_history
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

    await RenstraTabelProgram.update(
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
        where: { id: history.renstra_tabel_program_id },
        transaction: t,
      },
    );

    const afterRow = await RenstraTabelProgram.findByPk(history.renstra_tabel_program_id, {
      transaction: t,
    });

    await writeGlobalAudit({
      entity_id: history.renstra_tabel_program_id,
      action: 'tolak',
      before_json: beforeRow?.toJSON() || null,
      after_json: afterRow?.toJSON() || null,
      user_id: userId,
      transaction: t,
    });

    await t.commit();

    return res.json({
      message: 'Revisi program berhasil ditolak',
      blocked: false,
      audit_mode: true,
      workflow_state: 'ditolak',
    });
  } catch (err) {
    await t.rollback();
    return res.status(err.statusCode || 400).json({
      error: err.message,
      blocked: err.blocked || false,
    });
  }
};

// ========================= REBUILD ACTIVE FROM HISTORY =========================

exports.rebuildActiveFromHistory = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const current = await RenstraTabelProgram.findByPk(id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!current) {
      await t.rollback();
      return res.status(404).json({
        message: 'Data program tidak ditemukan',
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
      FROM renstra_tabel_program_history
      WHERE renstra_tabel_program_id = :id
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
          FROM renstra_tabel_program_history
          WHERE renstra_tabel_program_id = :id
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
        FROM renstra_tabel_program_history
        WHERE renstra_tabel_program_id = :id
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

    const { payload, rebuild_source } = rebuildProgramPayloadFromHistory({
      current,
      history,
      latestApprovedHistory,
      latestValidPaguHistory: validPaguRow || null,
    });

    const beforeRebuildJson = current.toJSON();

    await RenstraTabelProgram.update(
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

    const updated = await RenstraTabelProgram.findByPk(id, {
      include: [
        { model: RenstraProgram, as: 'program' },
        { model: IndikatorRenstra, as: 'indikator_detail' },
      ],
      transaction: t,
    });

    const result = applyTargetFinalIfMissing(updated);

    await t.commit();

    return res.json({
      message: 'Data aktif program berhasil dibangun ulang dari history',
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
    console.error('REBUILD ACTIVE PROGRAM ERROR:', err);
    return res.status(err.statusCode || 400).json({
      error: err.message,
      blocked: err.blocked || false,
    });
  }
};

// ========================= FIND ALL =========================

exports.findAll = async (req, res) => {
  try {
    const { renstra_id } = req.query;

    let programWhere = {};
    if (renstra_id) {
      programWhere = await programWhereForRenstraOpdQuery(renstra_id);
    }

    const rows = await RenstraTabelProgram.findAll({
      include: [
        {
          model: RenstraProgram,
          as: 'program',
          where: Object.keys(programWhere).length ? programWhere : undefined,
          required: !!renstra_id,
        },
        {
          model: IndikatorRenstra,
          as: 'indikator_detail',
        },
      ],
      order: [['id', 'ASC']],
    });

    const result = rows.map(applyTargetFinalIfMissing);

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ========================= FIND ONE =========================

exports.findOne = async (req, res) => {
  try {
    const row = await RenstraTabelProgram.findByPk(req.params.id, {
      include: [
        {
          model: RenstraProgram,
          as: 'program',
        },
        {
          model: IndikatorRenstra,
          as: 'indikator_detail',
        },
      ],
    });

    if (!row) {
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }

    const result = applyTargetFinalIfMissing(row);

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ========================= DELETE =========================

exports.delete = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const row = await RenstraTabelProgram.findByPk(req.params.id, {
      transaction: t,
    });

    if (!row) {
      await t.rollback();
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }

    if (row.status_revisi === 'approved') {
      await t.rollback();
      return res.status(409).json({
        message: 'Data approved tidak boleh dihapus',
        blocked: true,
        audit_mode: true,
      });
    }

    const deletedData = row.toJSON();

    await RenstraTabelProgram.destroy({
      where: { id: req.params.id },
      transaction: t,
    });

    await writeGlobalAudit({
      entity_id: Number(req.params.id),
      action: 'delete',
      before_json: deletedData,
      after_json: null,
      user_id: getUserId(req),
      transaction: t,
    });

    await t.commit();

    res.json({
      message: 'Data program berhasil dihapus',
      blocked: false,
      audit_mode: true,
      data: deletedData,
    });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
};
