// controllers/renstra_tabelArahKebijakanController.js
const { Op, QueryTypes } = require('sequelize');

const {
  sequelize,
  RenstraTabelArahKebijakan,
  RenstraKebijakan,
  RenstraStrategi,
  IndikatorRenstra,
  IndikatorArahKebijakan,
  RenstraAuditLogGlobal,
} = require('../models');

const { attachCacheToRows, applyPaguFromCache } = require('../services/renstraPaguCacheHelper');
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
// 🔴 PAGU KEBIJAKAN TIDAK DIHITUNG DI CONTROLLER, TAPI DIBACA DARI CACHE.
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

const allowApprovedArahKebijakanUpdate = async (transaction) => {
  await sequelize.query('SET @allow_approved_arah_kebijakan_update = 1', {
    transaction,
  });
};

const lockApprovedArahKebijakanUpdate = async (transaction) => {
  await sequelize.query('SET @allow_approved_arah_kebijakan_update = 0', {
    transaction,
  });
};

const writeGlobalAudit = async ({
  module = 'arah_kebijakan',
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

const computePaguFinal = (data = {}) => {
  const paguTahun = [1, 2, 3, 4, 5].map((i) => Number(data?.[`pagu_tahun_${i}`]) || 0);

  return {
    pagu_akhir_renstra: roundUp2(paguTahun.reduce((total, value) => total + value, 0)),
    pagu_tahun_6: 0,
  };
};

const buildEditablePaguPayload = (data = {}) => ({
  pagu_tahun_1: Number(data?.pagu_tahun_1) || 0,
  pagu_tahun_2: Number(data?.pagu_tahun_2) || 0,
  pagu_tahun_3: Number(data?.pagu_tahun_3) || 0,
  pagu_tahun_4: Number(data?.pagu_tahun_4) || 0,
  pagu_tahun_5: Number(data?.pagu_tahun_5) || 0,
  pagu_tahun_6: 0,
  ...computePaguFinal(data),
});

const buildLockedPaguPayload = () => ({
  pagu_tahun_1: 0,
  pagu_tahun_2: 0,
  pagu_tahun_3: 0,
  pagu_tahun_4: 0,
  pagu_tahun_5: 0,
  pagu_tahun_6: 0,
  pagu_akhir_renstra: 0,
});

const ARAH_KEBIJAKAN_ALLOWED_BODY_FIELDS = [
  'renstra_id',
  'kebijakan_id',
  'indikator_id',

  'kode_kebijakan',
  'deskripsi_kebijakan',
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

const buildArahKebijakanPayload = ({ body, current, kebijakan, indikator, userId }) => {
  return buildBaseRenstraPayload({
    body,
    allowedFields: ARAH_KEBIJAKAN_ALLOWED_BODY_FIELDS,
    excludedFields: ['alasan_revisi'],
    current,
    master: kebijakan,
    indikator,
    userId,
    levelIdField: 'kebijakan_id',
    kodeField: 'kode_kebijakan',
    deskripsiField: 'deskripsi_kebijakan',
    masterKodeField: 'kode_kebjkn',
    masterDeskripsiField: 'deskripsi',
    computeFinal,
    buildPaguPayload: buildEditablePaguPayload,
  });
};

const insertHistory = async ({ current, afterData, alasanRevisi, userId, transaction }) => {
  const beforeJson = current.toJSON ? current.toJSON() : current;
  const versiSebelum = Number(beforeJson.versi || 1);
  const versiSesudah = versiSebelum + 1;

  await sequelize.query(
    `
    INSERT INTO renstra_tabel_arah_kebijakan_history
    (
      renstra_tabel_arah_kebijakan_id,
      renstra_id,
      kebijakan_id,
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
      :renstra_tabel_arah_kebijakan_id,
      :renstra_id,
      :kebijakan_id,
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
        renstra_tabel_arah_kebijakan_id: beforeJson.id,
        renstra_id: afterData.renstra_id,
        kebijakan_id: afterData.kebijakan_id,
        indikator_id: afterData.indikator_id,
        versi_sebelum: versiSebelum,
        versi_sesudah: versiSesudah,
        before_json: JSON.stringify(beforeJson),
        after_json: JSON.stringify(afterData),
        alasan_revisi: alasanRevisi || 'Revisi data arah kebijakan',
        dibuat_oleh: userId,
      },
      transaction,
    },
  );

  return versiSesudah;
};

const applyKebijakanPaguAcuanFallback = ({
  row,
  indikatorMap = new Map(),
  sourcePaguMap = new Map(),
}) => {
  const json = row?.toJSON ? row.toJSON() : { ...row };

  const currentAcuan = toPositiveNumber(json.pagu_rpjmd_acuan);
  const currentAkhir = toPositiveNumber(json.pagu_akhir_renstra);

  const indikatorRenstra = indikatorMap.get(Number(json.indikator_id));
  const sourceIndikatorId = Number(indikatorRenstra?.source_indikator_id || 0);
  const sourcePagu = sourcePaguMap.get(sourceIndikatorId);

  const paguAcuan = pickPositiveNumber(
    currentAcuan,
    sourcePagu?.pagu_cached,
    sourcePagu?.total_pagu_rpjmd,
    currentAkhir,
  );

  if (!paguAcuan) {
    return {
      ...json,
      pagu_rpjmd_acuan: 0,
      pagu_readonly: true,
      pagu_source: json.pagu_source || 'none',
    };
  }

  const hasSlotPagu = [1, 2, 3, 4, 5].some((i) => toPositiveNumber(json[`pagu_tahun_${i}`]) > 0);

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
    pagu_source:
      json.pagu_source ||
      (sourcePagu?.pagu_cached
        ? 'indikator_arah_kebijakan_source_fallback'
        : 'existing_pagu_fallback'),
  };
};

const attachKebijakanCacheToRows = async ({ rows, transaction }) => {
  const rowsWithTarget = rows.map(applyTargetFinalIfMissing);

  const rowsWithCache = await attachCacheToRows({
    rows: rowsWithTarget,
    stage: 'kebijakan',

    // Standar final:
    // cache.ref_id = id baris RenstraTabelArahKebijakan
    renstraIdField: 'renstra_id',
    refIdField: 'id',

    transaction,
  });

  const indikatorIds = rowsWithCache
    .map((row) => Number(row.indikator_id || 0))
    .filter((id) => Number.isFinite(id) && id > 0);

  const uniqueIndikatorIds = [...new Set(indikatorIds)];

  const indikatorRows = uniqueIndikatorIds.length
    ? await IndikatorRenstra.findAll({
        where: {
          id: {
            [Op.in]: uniqueIndikatorIds,
          },
        },
        attributes: ['id', 'source_indikator_id'],
        raw: true,
        transaction,
      })
    : [];

  const indikatorMap = new Map(indikatorRows.map((item) => [Number(item.id), item]));

  const sourceIndikatorIds = indikatorRows
    .map((item) => Number(item.source_indikator_id || 0))
    .filter((id) => Number.isFinite(id) && id > 0);

  const uniqueSourceIndikatorIds = [...new Set(sourceIndikatorIds)];

  const sourcePaguRows = uniqueSourceIndikatorIds.length
    ? await IndikatorArahKebijakan.findAll({
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

  return rowsWithCache.map((row) =>
    applyKebijakanPaguAcuanFallback({
      row,
      indikatorMap,
      sourcePaguMap,
    }),
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
    kebijakan,
    strategi,
    histories,
    children,
    pagu_readonly,
    alasan_revisi,
    ...payload
  } = json || {};

  return payload;
};

// ========================= CREATE =========================

exports.create = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    assertAllowedBodyFields(req.body, ARAH_KEBIJAKAN_ALLOWED_BODY_FIELDS);

    const payloadBase = {
      ...req.body,
    };

    if (!payloadBase.renstra_id || !payloadBase.kebijakan_id || !payloadBase.indikator_id) {
      await t.rollback();
      return res.status(400).json({
        message: 'renstra_id, kebijakan_id, dan indikator_id wajib diisi',
      });
    }

    const master = await RenstraKebijakan.findByPk(payloadBase.kebijakan_id, {
      transaction: t,
    });

    const indikator = await require('../models').IndikatorRenstra.findOne({
      where: {
        id: payloadBase.indikator_id,
        stage: 'kebijakan',
        ref_id: payloadBase.kebijakan_id,
        renstra_id: payloadBase.renstra_id,
      },
      transaction: t,
    });

    if (!indikator) {
      await t.rollback();
      return res.status(400).json({
        message:
          'indikator_id tidak valid. Harus indikator_renstra stage kebijakan sesuai kebijakan_id.',
      });
    }

    if (!master) {
      await t.rollback();
      return res.status(404).json({
        message: 'Kebijakan tidak ditemukan',
      });
    }

    const exists = await RenstraTabelArahKebijakan.findOne({
      where: {
        renstra_id: payloadBase.renstra_id,
        kebijakan_id: payloadBase.kebijakan_id,
        indikator_id: payloadBase.indikator_id,
      },
      transaction: t,
    });

    if (exists) {
      await t.rollback();
      return res.status(409).json({
        message: 'Data kebijakan dengan indikator ini sudah ada. Gunakan Edit.',
        existing_id: exists.id,
        blocked: true,
      });
    }

    const payload = {
      ...buildArahKebijakanPayload({
        body: payloadBase,
        current: null,
        kebijakan: master,
        indikator,
        userId: getUserId(req),
      }),
      status_revisi: 'draft',
      versi: 1,
      last_revised_at: null,
      last_revised_by: null,
    };

    const created = await RenstraTabelArahKebijakan.create(payload, {
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

    await t.commit();

    res.status(201).json({
      message: 'Data kebijakan berhasil ditambahkan',
      data: applyPaguFromCache(applyTargetFinalIfMissing(created), null),
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

// ========================= FIND ALL =========================

exports.findAll = async (req, res) => {
  try {
    const { renstra_id, kebijakan_id, indikator_id } = req.query;

    const where = {};
    if (renstra_id) where.renstra_id = Number(renstra_id);
    if (kebijakan_id) where.kebijakan_id = Number(kebijakan_id);
    if (indikator_id) where.indikator_id = Number(indikator_id);

    const rows = await RenstraTabelArahKebijakan.findAll({
      where,
      include: [
        {
          model: RenstraKebijakan,
          as: 'kebijakan',
          attributes: [
            'id',
            'strategi_id',
            'deskripsi',
            'kode_kebjkn',
            'rpjmd_arah_id',
            'renstra_id',
          ],
          include: [
            {
              model: RenstraStrategi,
              as: 'strategi',
              attributes: ['id', 'kode_strategi', 'deskripsi', 'renstra_id'],
            },
          ],
        },
      ],
      order: [['id', 'ASC']],
    });

    const result = await attachKebijakanCacheToRows({ rows });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ========================= FIND ONE =========================

exports.findOne = async (req, res) => {
  try {
    const row = await RenstraTabelArahKebijakan.findByPk(req.params.id, {
      include: [
        {
          model: RenstraKebijakan,
          as: 'kebijakan',
          include: [
            {
              model: RenstraStrategi,
              as: 'strategi',
              attributes: ['id', 'kode_strategi', 'deskripsi', 'renstra_id'],
            },
          ],
        },
      ],
    });

    if (!row) {
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }

    const [result] = await attachKebijakanCacheToRows({
      rows: [row],
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ========================= CREATE REVISI DARI DATA APPROVED =========================

exports.createRevisi = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    assertAllowedBodyFields(req.body, ARAH_KEBIJAKAN_ALLOWED_BODY_FIELDS);

    const { id } = req.params;
    const userId = getUserId(req);

    if (!req.body.alasan_revisi || !String(req.body.alasan_revisi).trim()) {
      await t.rollback();
      return res.status(400).json({
        message: 'alasan_revisi wajib diisi saat membuat revisi',
      });
    }

    const current = await RenstraTabelArahKebijakan.findByPk(id, {
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

    if (!payloadBase.renstra_id || !payloadBase.kebijakan_id || !payloadBase.indikator_id) {
      await t.rollback();
      return res.status(400).json({
        message: 'renstra_id, kebijakan_id, dan indikator_id wajib diisi',
      });
    }

    const master = await RenstraKebijakan.findByPk(payloadBase.kebijakan_id, {
      transaction: t,
    });

    const indikator = await require('../models').IndikatorRenstra.findOne({
      where: {
        id: payloadBase.indikator_id,
        stage: 'kebijakan',
        ref_id: payloadBase.kebijakan_id,
        renstra_id: payloadBase.renstra_id,
      },
      transaction: t,
    });

    if (!indikator) {
      await t.rollback();
      return res.status(400).json({
        message:
          'indikator_id tidak valid. Harus indikator_renstra stage kebijakan sesuai kebijakan_id.',
      });
    }

    if (!master) {
      await t.rollback();
      return res.status(404).json({
        message: 'Kebijakan tidak ditemukan',
      });
    }

    const payload = {
      ...buildArahKebijakanPayload({
        body: payloadBase,
        current,
        kebijakan: master,
        indikator,
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

    await allowApprovedArahKebijakanUpdate(t);

    await RenstraTabelArahKebijakan.update(
      {
        ...payload,
        versi: versiSesudah,
      },
      {
        where: { id },
        transaction: t,
      },
    );

    await lockApprovedArahKebijakanUpdate(t);

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

    const updatedData = await RenstraTabelArahKebijakan.findByPk(id, {
      include: [
        {
          model: RenstraKebijakan,
          as: 'kebijakan',
          include: [
            {
              model: RenstraStrategi,
              as: 'strategi',
              attributes: ['id', 'kode_strategi', 'deskripsi', 'renstra_id'],
            },
          ],
        },
      ],
      transaction: t,
    });

    const [result] = await attachKebijakanCacheToRows({
      rows: [updatedData],
      transaction: t,
    });

    await t.commit();

    return res.json({
      message: 'Revisi arah kebijakan berhasil dibuat sebagai draft',
      data: result,
      blocked: false,
      audit_mode: true,
      workflow_state: 'draft',
    });
  } catch (err) {
    await lockApprovedArahKebijakanUpdate(t).catch(() => {});
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
    assertAllowedBodyFields(req.body, ARAH_KEBIJAKAN_ALLOWED_BODY_FIELDS);

    const { id } = req.params;

    const current = await RenstraTabelArahKebijakan.findByPk(id, {
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

    if (!payloadBase.renstra_id || !payloadBase.kebijakan_id || !payloadBase.indikator_id) {
      await t.rollback();
      return res.status(400).json({
        message: 'renstra_id, kebijakan_id, dan indikator_id wajib diisi',
      });
    }

    const master = await RenstraKebijakan.findByPk(payloadBase.kebijakan_id, {
      transaction: t,
    });

    const indikator = await require('../models').IndikatorRenstra.findOne({
      where: {
        id: payloadBase.indikator_id,
        stage: 'kebijakan',
        ref_id: payloadBase.kebijakan_id,
        renstra_id: payloadBase.renstra_id,
      },
      transaction: t,
    });

    if (!indikator) {
      await t.rollback();
      return res.status(400).json({
        message:
          'indikator_id tidak valid. Harus indikator_renstra stage kebijakan sesuai kebijakan_id.',
      });
    }

    if (!master) {
      await t.rollback();
      return res.status(404).json({
        message: 'Kebijakan tidak ditemukan',
      });
    }

    const duplicate = await RenstraTabelArahKebijakan.findOne({
      where: {
        id: { [Op.ne]: id },
        renstra_id: payloadBase.renstra_id,
        kebijakan_id: payloadBase.kebijakan_id,
        indikator_id: payloadBase.indikator_id,
      },
      transaction: t,
    });

    if (duplicate) {
      await t.rollback();
      return res.status(409).json({
        message: 'Data kebijakan dengan indikator ini sudah ada. Gunakan Edit.',
        existing_id: duplicate.id,
        blocked: true,
      });
    }

    const userId = getUserId(req);

    const payload = {
      ...buildArahKebijakanPayload({
        body: payloadBase,
        current,
        kebijakan: master,
        indikator,
        userId,
      }),
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

    await RenstraTabelArahKebijakan.update(
      {
        ...payload,
        versi: versiSesudah,
      },
      {
        where: { id },
        transaction: t,
      },
    );

    const updatedData = await RenstraTabelArahKebijakan.findByPk(id, {
      include: [
        {
          model: RenstraKebijakan,
          as: 'kebijakan',
          include: [
            {
              model: RenstraStrategi,
              as: 'strategi',
              attributes: ['id', 'kode_strategi', 'deskripsi', 'renstra_id'],
            },
          ],
        },
      ],
      transaction: t,
    });

    const [result] = await attachKebijakanCacheToRows({
      rows: [updatedData],
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

    await t.commit();

    res.json({
      message: 'Data kebijakan berhasil diperbarui',
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

// ========================= REBUILD =========================

exports.rebuild = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const current = await RenstraTabelArahKebijakan.findByPk(id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!current) {
      await t.rollback();
      return res.status(404).json({
        message: 'Data tidak ditemukan',
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

    const beforeJson = current.toJSON();

    const rebuildPayload = {
      target_tahun_6: 0,
      pagu_tahun_6: 0,
      ...computeFinal(beforeJson),
      ...buildEditablePaguPayload(beforeJson),
      pagu_rpjmd_acuan: current.pagu_rpjmd_acuan,
      last_revised_at: new Date(),
      last_revised_by: userId,
    };

    await RenstraTabelArahKebijakan.update(rebuildPayload, {
      where: { id },
      transaction: t,
    });

    const updatedData = await RenstraTabelArahKebijakan.findByPk(id, {
      include: [
        {
          model: RenstraKebijakan,
          as: 'kebijakan',
          include: [
            {
              model: RenstraStrategi,
              as: 'strategi',
              attributes: ['id', 'kode_strategi', 'deskripsi', 'renstra_id'],
            },
          ],
        },
      ],
      transaction: t,
    });

    await writeGlobalAudit({
      entity_id: Number(id),
      action: 'rebuild',
      before_json: beforeJson,
      after_json: updatedData.toJSON(),
      user_id: userId,
      transaction: t,
    });

    const [result] = await attachKebijakanCacheToRows({
      rows: [updatedData],
      transaction: t,
    });

    await t.commit();

    return res.json({
      message: 'Rebuild arah kebijakan berhasil',
      data: result,
      blocked: false,
      audit_mode: true,
      workflow_state: current.status_revisi || 'draft',
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
      FROM renstra_tabel_arah_kebijakan_history
      WHERE renstra_tabel_arah_kebijakan_id = :id
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

// ========================= WORKFLOW =========================

exports.submitVerifikasi = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { id } = req.params;

    const row = await RenstraTabelArahKebijakan.findByPk(id, {
      transaction: t,
    });

    if (!row) {
      await t.rollback();
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }

    await row.update(
      {
        status_revisi: 'verifikasi',
        last_revised_at: new Date(),
        last_revised_by: getUserId(req),
      },
      { transaction: t },
    );

    await t.commit();

    res.json({
      message: 'Data berhasil diajukan ke verifikasi',
      data: row,
    });
  } catch (err) {
    await t.rollback();
    return res.status(err.statusCode || 400).json({
      error: err.message,
      blocked: err.blocked || false,
    });
  }
};

exports.approve = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { id } = req.params;

    const row = await RenstraTabelArahKebijakan.findByPk(id, {
      transaction: t,
    });

    if (!row) {
      await t.rollback();
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }

    await row.update(
      {
        status_revisi: 'approved',
        last_revised_at: new Date(),
        last_revised_by: getUserId(req),
      },
      { transaction: t },
    );

    await sequelize.query(
      `
      UPDATE renstra_tabel_arah_kebijakan_history
      SET
        status_revisi = 'approved',
        disetujui_oleh = :userId,
        disetujui_pada = NOW(),
        updatedAt = NOW()
      WHERE renstra_tabel_arah_kebijakan_id = :id
      ORDER BY id DESC
      LIMIT 1
      `,
      {
        replacements: {
          id,
          userId: getUserId(req),
        },
        transaction: t,
      },
    );

    await t.commit();

    res.json({
      message: 'Data berhasil disetujui',
      data: row,
    });
  } catch (err) {
    await t.rollback();
    return res.status(err.statusCode || 400).json({
      error: err.message,
      blocked: err.blocked || false,
    });
  }
};

exports.reject = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { id } = req.params;

    const row = await RenstraTabelArahKebijakan.findByPk(id, {
      transaction: t,
    });

    if (!row) {
      await t.rollback();
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }

    await row.update(
      {
        status_revisi: 'ditolak',
        last_revised_at: new Date(),
        last_revised_by: getUserId(req),
      },
      { transaction: t },
    );

    await sequelize.query(
      `
      UPDATE renstra_tabel_arah_kebijakan_history
      SET
        status_revisi = 'ditolak',
        diverifikasi_oleh = :userId,
        diverifikasi_pada = NOW(),
        updatedAt = NOW()
      WHERE renstra_tabel_arah_kebijakan_id = :id
      ORDER BY id DESC
      LIMIT 1
      `,
      {
        replacements: {
          id,
          userId: getUserId(req),
        },
        transaction: t,
      },
    );

    await t.commit();

    res.json({
      message: 'Data berhasil ditolak',
      data: row,
    });
  } catch (err) {
    await t.rollback();
    return res.status(err.statusCode || 400).json({
      error: err.message,
      blocked: err.blocked || false,
    });
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
      FROM renstra_tabel_arah_kebijakan_history
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

    await sequelize.query(
      `
      UPDATE renstra_tabel_arah_kebijakan_history
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

    const beforeRow = await RenstraTabelArahKebijakan.findByPk(
      history.renstra_tabel_arah_kebijakan_id,
      { transaction: t },
    );

    await RenstraTabelArahKebijakan.update(
      {
        status_revisi: 'verifikasi',
        last_revised_at: new Date(),
        last_revised_by: userId,
      },
      {
        where: { id: history.renstra_tabel_arah_kebijakan_id },
        transaction: t,
      },
    );

    const afterRow = await RenstraTabelArahKebijakan.findByPk(
      history.renstra_tabel_arah_kebijakan_id,
      { transaction: t },
    );

    await writeGlobalAudit({
      entity_id: history.renstra_tabel_arah_kebijakan_id,
      action: 'verifikasi',
      before_json: beforeRow?.toJSON() || null,
      after_json: afterRow?.toJSON() || null,
      user_id: userId,
      transaction: t,
    });

    await t.commit();

    res.json({
      message: 'Revisi berhasil diverifikasi',
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

exports.approveHistory = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { history_id } = req.params;
    const userId = getUserId(req);

    const [history] = await sequelize.query(
      `
      SELECT *
      FROM renstra_tabel_arah_kebijakan_history
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

    await sequelize.query(
      `
      UPDATE renstra_tabel_arah_kebijakan_history
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

    const beforeRow = await RenstraTabelArahKebijakan.findByPk(
      history.renstra_tabel_arah_kebijakan_id,
      { transaction: t },
    );

    const afterJson = sanitizeHistoryPayload(parseJsonField(history.after_json));

    await RenstraTabelArahKebijakan.update(
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
        where: { id: history.renstra_tabel_arah_kebijakan_id },
        transaction: t,
      },
    );

    const afterRow = await RenstraTabelArahKebijakan.findByPk(
      history.renstra_tabel_arah_kebijakan_id,
      { transaction: t },
    );

    await writeGlobalAudit({
      entity_id: history.renstra_tabel_arah_kebijakan_id,
      action: 'approve',
      before_json: beforeRow?.toJSON() || null,
      after_json: afterRow?.toJSON() || null,
      user_id: userId,
      transaction: t,
    });

    await t.commit();

    res.json({
      message: 'Revisi berhasil disetujui',
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
      FROM renstra_tabel_arah_kebijakan_history
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

    await sequelize.query(
      `
      UPDATE renstra_tabel_arah_kebijakan_history
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

    const beforeRow = await RenstraTabelArahKebijakan.findByPk(
      history.renstra_tabel_arah_kebijakan_id,
      { transaction: t },
    );

    const beforeJson = sanitizeHistoryPayload(parseJsonField(history.before_json));

    await RenstraTabelArahKebijakan.update(
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
        where: { id: history.renstra_tabel_arah_kebijakan_id },
        transaction: t,
      },
    );

    const afterRow = await RenstraTabelArahKebijakan.findByPk(
      history.renstra_tabel_arah_kebijakan_id,
      { transaction: t },
    );

    await writeGlobalAudit({
      entity_id: history.renstra_tabel_arah_kebijakan_id,
      action: 'tolak',
      before_json: beforeRow?.toJSON() || null,
      after_json: afterRow?.toJSON() || null,
      user_id: userId,
      transaction: t,
    });

    await t.commit();

    res.json({
      message: 'Revisi berhasil ditolak',
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

// ========================= DELETE =========================

exports.delete = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const row = await RenstraTabelArahKebijakan.findByPk(req.params.id, {
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

    await RenstraTabelArahKebijakan.destroy({
      where: { id: req.params.id },
      transaction: t,
    });

    await writeGlobalAudit({
      entity_id: Number(req.params.id),
      action: 'delete',
      before_json: row.toJSON(),
      after_json: null,
      user_id: getUserId(req),
      transaction: t,
    });

    const deleted = true;

    if (!deleted) {
      await t.rollback();
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }

    await t.commit();

    res.json({
      message: 'Data kebijakan berhasil dihapus',
      blocked: false,
      data: row.toJSON(),
    });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
};
