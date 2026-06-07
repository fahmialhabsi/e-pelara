// controllers/renstra_tabelSasaranController.js
const { Op } = require('sequelize');

const { sequelize, RenstraTabelSasaran, IndikatorRenstra, Sasaran } = require('../models');

const { attachCacheToRows, applyPaguFromCache } = require('../services/renstraPaguCacheHelper');

// ========================= UTIL =========================

const roundUp2 = (value) => {
  const num = Number(value) || 0;
  return Math.ceil(num * 100) / 100;
};

// 🔴 HANYA HITUNG TARGET.
// 🔴 PAGU SASARAN TIDAK DIHITUNG DI CONTROLLER, TAPI DIBACA DARI CACHE.
const computeFinal = (data) => {
  const targets = [1, 2, 3, 4, 5, 6].map((i) => Number(data[`target_tahun_${i}`]) || 0);

  const avg = targets.reduce((a, b) => a + b, 0) / targets.length || 0;

  return {
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

const buildLockedPaguPayload = () => ({
  pagu_tahun_1: 0,
  pagu_tahun_2: 0,
  pagu_tahun_3: 0,
  pagu_tahun_4: 0,
  pagu_tahun_5: 0,
  pagu_tahun_6: 0,
  pagu_akhir_renstra: 0,
});

const attachSasaranCacheToRows = async ({ rows, transaction }) => {
  const rowsWithTarget = rows.map(applyTargetFinalIfMissing);

  return attachCacheToRows({
    rows: rowsWithTarget,
    stage: 'sasaran',

    // Standar final:
    // cache.ref_id = id baris RenstraTabelSasaran
    renstraIdField: 'renstra_id',
    refIdField: 'id',

    transaction,
  });
};

const SASARAN_TABEL_INCLUDE = [
  {
    model: IndikatorRenstra,
    as: 'indikator',
    attributes: ['id', 'kode_indikator', 'nama_indikator', 'baseline', 'source_indikator_id'],
  },
  {
    model: Sasaran,
    as: 'sasaran_rpjmd',
    attributes: ['id', 'nomor', 'isi_sasaran'],
  },
];

// ========================= CREATE =========================

exports.create = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const payloadBase = {
      ...req.body,
      ...buildLockedPaguPayload(),
      ...computeFinal(req.body),
    };

    delete payloadBase.opd_penanggung_jawab;

    if (!payloadBase.renstra_id || !payloadBase.sasaran_id || !payloadBase.indikator_id) {
      await t.rollback();
      return res.status(400).json({
        message: 'renstra_id, sasaran_id, dan indikator_id wajib diisi',
      });
    }

    const indikator = await IndikatorRenstra.findByPk(payloadBase.indikator_id, {
      transaction: t,
    });

    if (!indikator) {
      await t.rollback();
      return res.status(404).json({ error: 'Indikator tidak ditemukan' });
    }

    const exists = await RenstraTabelSasaran.findOne({
      where: {
        renstra_id: payloadBase.renstra_id,
        sasaran_id: payloadBase.sasaran_id,
        indikator_id: payloadBase.indikator_id,
      },
      transaction: t,
    });

    if (exists) {
      await t.rollback();
      return res.status(409).json({
        message: 'Data sasaran dengan indikator ini sudah ada. Gunakan Edit.',
        existing_id: exists.id,
        blocked: true,
      });
    }

    const payload = {
      ...payloadBase,
      strategi_id: req.body.strategi_id ?? null,
      satuan_target: indikator.satuan || payloadBase.satuan_target,

      // 🔴 Parent tidak boleh menerima pagu dari form.
      ...buildLockedPaguPayload(),
    };

    const created = await RenstraTabelSasaran.create(payload, {
      transaction: t,
    });

    await t.commit();

    res.status(201).json({
      message: 'Data sasaran berhasil ditambahkan',
      data: applyPaguFromCache(applyTargetFinalIfMissing(created), null),
      blocked: false,
    });
  } catch (err) {
    await t.rollback();
    res.status(400).json({ error: err.message });
  }
};

// ========================= UPDATE =========================

exports.update = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { id } = req.params;

    const current = await RenstraTabelSasaran.findByPk(id, {
      transaction: t,
    });

    if (!current) {
      await t.rollback();
      return res.status(404).json({ message: 'Data not found' });
    }

    const payloadBase = {
      ...req.body,
      ...buildLockedPaguPayload(),
      ...computeFinal(req.body),
    };

    delete payloadBase.opd_penanggung_jawab;

    if (!payloadBase.renstra_id || !payloadBase.sasaran_id || !payloadBase.indikator_id) {
      await t.rollback();
      return res.status(400).json({
        message: 'renstra_id, sasaran_id, dan indikator_id wajib diisi',
      });
    }

    const indikator = await IndikatorRenstra.findByPk(payloadBase.indikator_id, {
      transaction: t,
    });

    if (!indikator) {
      await t.rollback();
      return res.status(404).json({ error: 'Indikator tidak ditemukan' });
    }

    const duplicate = await RenstraTabelSasaran.findOne({
      where: {
        id: { [Op.ne]: id },
        renstra_id: payloadBase.renstra_id,
        sasaran_id: payloadBase.sasaran_id,
        indikator_id: payloadBase.indikator_id,
      },
      transaction: t,
    });

    if (duplicate) {
      await t.rollback();
      return res.status(409).json({
        message: 'Data sasaran dengan indikator ini sudah ada. Gunakan Edit.',
        existing_id: duplicate.id,
        blocked: true,
      });
    }

    const payload = {
      ...payloadBase,
      strategi_id: req.body.strategi_id ?? null,
      satuan_target: indikator.satuan || payloadBase.satuan_target,

      // 🔴 Parent tidak boleh update pagu dari form.
      ...buildLockedPaguPayload(),
    };

    await RenstraTabelSasaran.update(payload, {
      where: { id },
      transaction: t,
    });

    const updatedData = await RenstraTabelSasaran.findByPk(id, {
      include: SASARAN_TABEL_INCLUDE,
      transaction: t,
    });

    const [result] = await attachSasaranCacheToRows({
      rows: [updatedData],
      transaction: t,
    });

    await t.commit();

    res.json({
      message: 'Data sasaran berhasil diperbarui',
      data: result,
      blocked: false,
    });
  } catch (err) {
    await t.rollback();
    res.status(400).json({ error: err.message });
  }
};

// ========================= DELETE =========================

exports.delete = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { id } = req.params;

    const deleted = await RenstraTabelSasaran.destroy({
      where: { id },
      transaction: t,
    });

    if (!deleted) {
      await t.rollback();
      return res.status(404).json({ message: 'Data not found' });
    }

    await t.commit();

    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
};

// ========================= FIND ALL =========================

exports.findAll = async (req, res) => {
  try {
    const { renstra_id, sasaran_id, indikator_id, tujuan_id } = req.query;

    const where = {};
    if (renstra_id) where.renstra_id = Number(renstra_id);
    if (sasaran_id) where.sasaran_id = Number(sasaran_id);
    if (indikator_id) where.indikator_id = Number(indikator_id);
    if (tujuan_id) where.tujuan_id = Number(tujuan_id);

    const rows = await RenstraTabelSasaran.findAll({
      where,
      include: SASARAN_TABEL_INCLUDE,
      order: [['id', 'ASC']],
    });

    const result = await attachSasaranCacheToRows({ rows });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ========================= FIND ONE =========================

exports.findOne = async (req, res) => {
  try {
    const { id } = req.params;

    const row = await RenstraTabelSasaran.findByPk(id, {
      include: SASARAN_TABEL_INCLUDE,
    });

    if (!row) {
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }

    const [result] = await attachSasaranCacheToRows({
      rows: [row],
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ========================= FIND BY TUJUAN =========================

exports.findByTujuan = async (req, res) => {
  try {
    const { tujuan_id } = req.params;
    const { renstra_id } = req.query;

    const where = {
      tujuan_id: Number(tujuan_id),
    };

    if (renstra_id) {
      where.renstra_id = Number(renstra_id);
    }

    const rows = await RenstraTabelSasaran.findAll({
      where,
      include: SASARAN_TABEL_INCLUDE,
      order: [['id', 'ASC']],
    });

    const result = await attachSasaranCacheToRows({ rows });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.revisi = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { alasan_revisi, ...payload } = req.body;

    const dataLama = await RenstraTabelSasaran.findByPk(id, {
      transaction: t,
    });

    if (!dataLama) {
      await t.rollback();
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }

    payload.pagu_rpjmd_acuan = dataLama.pagu_rpjmd_acuan;
    payload.target_tahun_6 = 0;
    payload.pagu_tahun_6 = 0;

    const targetAkhir =
      (payload.target_tahun_1 || 0) +
      (payload.target_tahun_2 || 0) +
      (payload.target_tahun_3 || 0) +
      (payload.target_tahun_4 || 0) +
      (payload.target_tahun_5 || 0);

    const paguAkhir =
      (payload.pagu_tahun_1 || 0) +
      (payload.pagu_tahun_2 || 0) +
      (payload.pagu_tahun_3 || 0) +
      (payload.pagu_tahun_4 || 0) +
      (payload.pagu_tahun_5 || 0);

    payload.target_akhir_renstra = targetAkhir;
    payload.pagu_akhir_renstra = paguAkhir;

    await sequelize.query(
      `
      INSERT INTO renstra_tabel_sasaran_history (
        renstra_tabel_sasaran_id,
        renstra_id,
        tujuan_id,
        sasaran_id,
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
      ) VALUES (
        :id,
        :renstra_id,
        :tujuan_id,
        :sasaran_id,
        :indikator_id,
        :versi_sebelum,
        :versi_sesudah,
        :before_json,
        :after_json,
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
          id,
          renstra_id: dataLama.renstra_id,
          tujuan_id: dataLama.tujuan_id,
          sasaran_id: dataLama.sasaran_id,
          indikator_id: dataLama.indikator_id,
          versi_sebelum: dataLama.versi,
          versi_sesudah: dataLama.versi + 1,
          before_json: JSON.stringify(dataLama.toJSON()),
          after_json: JSON.stringify(payload),
          alasan_revisi,
          dibuat_oleh: req.user.id,
        },
        transaction: t,
      },
    );

    await dataLama.update(
      {
        ...payload,
        versi: dataLama.versi + 1,
        status_revisi: 'draft',
        last_revised_at: new Date(),
        last_revised_by: req.user.id,
      },
      { transaction: t },
    );

    await t.commit();

    res.json({ message: 'Revisi berhasil' });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
};

exports.history = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await sequelize.query(
      `
      SELECT *
      FROM renstra_tabel_sasaran_history
      WHERE renstra_tabel_sasaran_id = :id
      ORDER BY id DESC
      `,
      {
        replacements: { id },
      },
    );

    res.json(rows);
  } catch (err) {
    console.error('❌ [Sasaran.history] error:', err);
    res.status(500).json({
      message: 'Terjadi kesalahan server internal.',
      error: err.message,
    });
  }
};

exports.verifikasiHistory = async (req, res) => {
  try {
    const { history_id } = req.params;

    const [rows] = await sequelize.query(
      `SELECT * FROM renstra_tabel_sasaran_history WHERE id = :id`,
      { replacements: { id: history_id } },
    );

    const row = rows[0];
    if (!row) return res.status(404).json({ message: 'Not found' });

    if (row.status_revisi !== 'draft') {
      return res.status(400).json({ message: 'Harus draft dulu' });
    }

    await sequelize.query(
      `
      UPDATE renstra_tabel_sasaran_history
      SET status_revisi = 'verifikasi',
          diverifikasi_oleh = :user_id,
          diverifikasi_pada = NOW()
      WHERE id = :id
      `,
      {
        replacements: { id: history_id, user_id: req.user.id },
      },
    );

    res.json({ message: 'Berhasil verifikasi' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.approveHistory = async (req, res) => {
  try {
    const { history_id } = req.params;

    const [rows] = await sequelize.query(
      `SELECT * FROM renstra_tabel_sasaran_history WHERE id = :id`,
      { replacements: { id: history_id } },
    );

    const row = rows[0];
    if (!row) return res.status(404).json({ message: 'Not found' });

    if (row.status_revisi === 'approved') {
      return res.json({ message: 'Sudah disetujui sebelumnya' });
    }

    await sequelize.query(
      `
      UPDATE renstra_tabel_sasaran_history
      SET status_revisi = 'approved',
          disetujui_oleh = :user_id,
          disetujui_pada = NOW()
      WHERE id = :id
      `,
      {
        replacements: { id: history_id, user_id: req.user.id },
      },
    );

    await sequelize.query(
      `
      UPDATE renstra_tabel_sasaran
      SET status_revisi = 'approved'
      WHERE id = :main_id
      `,
      {
        replacements: { main_id: row.renstra_tabel_sasaran_id },
      },
    );

    res.json({ message: 'Approved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.tolakHistory = async (req, res) => {
  try {
    const { history_id } = req.params;

    await sequelize.query(
      `
      UPDATE renstra_tabel_sasaran_history
      SET status_revisi = 'ditolak'
      WHERE id = :id
      `,
      {
        replacements: { id: history_id },
      },
    );

    res.json({ message: 'Ditolak' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
