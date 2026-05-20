// controllers/renstra_tabelTujuanController.js
const { Op } = require("sequelize");

const {
  sequelize,
  RenstraTabelTujuan,
  IndikatorRenstra,
  RenstraTujuan,
  RenstraOPD,
} = require("../models");

const {
  attachCacheToRows,
  applyPaguFromCache,
} = require("../services/renstraPaguCacheHelper");

const TARGET_FIELDS = [
  "target_tahun_1",
  "target_tahun_2",
  "target_tahun_3",
  "target_tahun_4",
  "target_tahun_5",
];

const PAGU_FIELDS = [
  "pagu_tahun_1",
  "pagu_tahun_2",
  "pagu_tahun_3",
  "pagu_tahun_4",
  "pagu_tahun_5",
];

const getActorId = (req) =>
  req.user?.id || req.body.user_id || req.body.changed_by || null;

const computeFinal5Years = (data) => {
  const targetValues = TARGET_FIELDS.map((field) => Number(data[field]) || 0);
  const paguValues = PAGU_FIELDS.map((field) => Number(data[field]) || 0);

  return {
    target_akhir_renstra:
      targetValues.reduce((a, b) => a + b, 0) / TARGET_FIELDS.length || 0,
    pagu_akhir_renstra: paguValues.reduce((a, b) => a + b, 0),
  };
};

const sanitizeTujuanPayload = (body) => {
  const payload = { ...body };

  delete payload.id;
  delete payload.created_at;
  delete payload.updated_at;
  delete payload.pagu_rpjmd_acuan;
  delete payload.versi;
  delete payload.status_revisi;
  delete payload.last_revised_at;
  delete payload.last_revised_by;

  // Renstra 5 tahun: tahun ke-6 tidak dipakai.
  payload.target_tahun_6 = 0;
  payload.pagu_tahun_6 = 0;

  return {
    ...payload,
    ...computeFinal5Years(payload),
  };
};

const insertTujuanHistory = async ({
  row,
  beforeJson,
  afterJson,
  alasanRevisi,
  actorId,
  transaction,
}) => {
  const versiSebelum = Number(beforeJson.versi || 1);
  const versiSesudah = versiSebelum + 1;

  await sequelize.query(
    `
    INSERT INTO renstra_tabel_tujuan_history (
      renstra_tabel_tujuan_id,
      renstra_id,
      tujuan_id,
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
    VALUES (
      :renstra_tabel_tujuan_id,
      :renstra_id,
      :tujuan_id,
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
        renstra_tabel_tujuan_id: row.id,
        renstra_id: row.opd_id || null,
        tujuan_id: row.tujuan_id || null,
        indikator_id: row.indikator_id || null,
        versi_sebelum: versiSebelum,
        versi_sesudah: versiSesudah,
        before_json: JSON.stringify(beforeJson),
        after_json: JSON.stringify(afterJson),
        alasan_revisi: alasanRevisi || null,
        dibuat_oleh: actorId,
      },
      transaction,
    }
  );

  return versiSesudah;
};

// ========================= UTIL =========================

const roundUp2 = (value) => {
  const num = Number(value) || 0;
  return Math.ceil(num * 100) / 100;
};

// 🔴 HANYA HITUNG TARGET.
// 🔴 PAGU TUJUAN TIDAK DIHITUNG DI CONTROLLER, TAPI DIBACA DARI CACHE.
const computeFinal = (data) => {
  const targets = [1, 2, 3, 4, 5, 6].map(
    (i) => Number(data[`target_tahun_${i}`]) || 0
  );

  const avg = targets.reduce((a, b) => a + b, 0) / targets.length || 0;

  return {
    target_akhir_renstra: roundUp2(avg),
  };
};

const applyTujuanLabel = (item) => {
  const json = item?.toJSON ? item.toJSON() : { ...item };

  if (json.tujuan) {
    json.kode_tujuan = json.tujuan.no_tujuan;
    json.nama_tujuan = json.tujuan.isi_tujuan;
  }

  return json;
};

const applyTargetFinalIfMissing = (item) => {
  const json = applyTujuanLabel(item);

  if (
    json.target_akhir_renstra === null ||
    json.target_akhir_renstra === undefined ||
    json.target_akhir_renstra === ""
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

const attachTujuanCacheToRows = async ({ rows, transaction }) => {
  const rowsWithTarget = rows.map(applyTargetFinalIfMissing);

  return attachCacheToRows({
    rows: rowsWithTarget,
    stage: "tujuan",

    // Standar final:
    // cache.ref_id = id baris RenstraTabelTujuan
    renstraIdField: "renstra_id",
    refIdField: "id",

    transaction,
  });
};

// ========================= INCLUDE =========================

const tujuanInclude = [
  {
    model: IndikatorRenstra,
    as: "indikator",
    attributes: ["id", "kode_indikator", "nama_indikator"],
  },
  {
    model: RenstraTujuan,
    as: "tujuan",
    attributes: ["id", "no_tujuan", "isi_tujuan"],
  },
  {
    model: RenstraOPD,
    as: "opd",
    attributes: ["id", "nama_opd"],
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

    if (
      !payloadBase.renstra_id ||
      !payloadBase.tujuan_id ||
      !payloadBase.indikator_id
    ) {
      await t.rollback();
      return res.status(400).json({
        message: "renstra_id, tujuan_id, dan indikator_id wajib diisi",
      });
    }

    const indikator = await IndikatorRenstra.findByPk(
      payloadBase.indikator_id,
      { transaction: t }
    );

    if (!indikator) {
      await t.rollback();
      return res.status(404).json({ error: "Indikator tidak ditemukan" });
    }

    const masterTujuan = await RenstraTujuan.findByPk(payloadBase.tujuan_id, {
      transaction: t,
    });

    if (!masterTujuan) {
      await t.rollback();
      return res.status(404).json({ error: "Tujuan tidak ditemukan" });
    }

    if (
      payloadBase.renstra_id != null &&
      Number(masterTujuan.renstra_id) !== Number(payloadBase.renstra_id)
    ) {
      await t.rollback();
      return res.status(400).json({
        message: "tujuan_id tidak sesuai dengan renstra_id yang dipilih",
      });
    }

    const exists = await RenstraTabelTujuan.findOne({
      where: {
        tujuan_id: payloadBase.tujuan_id,
        indikator_id: payloadBase.indikator_id,
      },
      transaction: t,
    });

    if (exists) {
      await t.rollback();
      return res.status(409).json({
        message: "Data tujuan dengan indikator ini sudah ada. Gunakan Edit.",
        existing_id: exists.id,
        blocked: true,
      });
    }

    const payload = {
      ...payloadBase,

      satuan_target: indikator.satuan || payloadBase.satuan_target,

      kode_tujuan:
        payloadBase.kode_tujuan || masterTujuan.no_tujuan || null,

      nama_tujuan:
        payloadBase.nama_tujuan || masterTujuan.isi_tujuan || null,

      // 🔴 Parent tidak boleh menerima pagu dari form.
      ...buildLockedPaguPayload(),
    };

    const created = await RenstraTabelTujuan.create(payload, {
      transaction: t,
    });

    const createdFull = await RenstraTabelTujuan.findByPk(created.id, {
      include: tujuanInclude,
      transaction: t,
    });

    await t.commit();

    res.status(201).json({
      message: "Data tujuan berhasil ditambahkan",
      data: applyPaguFromCache(applyTargetFinalIfMissing(createdFull), null),
      blocked: false,
    });
  } catch (err) {
    await t.rollback();
    res.status(400).json({ error: err.message });
  }
};

// ========================= FIND ALL =========================

exports.findAll = async (req, res) => {
  try {
    const { renstra_id, tujuan_id, indikator_id, opd_id } = req.query;

    const where = {};
    let tujuanIds = null;
    if (renstra_id != null && renstra_id !== "") {
      const renstraNum = Number(renstra_id);
      if (!Number.isFinite(renstraNum)) {
        return res.status(400).json({ error: "renstra_id harus berupa angka" });
      }
      const tujuanRowsForRenstra = await RenstraTujuan.findAll({
        attributes: ["id"],
        where: { renstra_id: renstraNum },
      });
      tujuanIds = tujuanRowsForRenstra
        .map((row) => Number(row.id))
        .filter((id) => Number.isFinite(id));
      if (!tujuanIds.length) {
        return res.json([]);
      }
    }
    if (tujuan_id != null && tujuan_id !== "") {
      const tujuanNum = Number(tujuan_id);
      if (!Number.isFinite(tujuanNum)) {
        return res.status(400).json({ error: "tujuan_id harus berupa angka" });
      }
      where.tujuan_id = tujuanNum;
    }
    if (indikator_id != null && indikator_id !== "") {
      const indikatorNum = Number(indikator_id);
      if (!Number.isFinite(indikatorNum)) {
        return res.status(400).json({ error: "indikator_id harus berupa angka" });
      }
      where.indikator_id = indikatorNum;
    }
    if (opd_id != null && opd_id !== "") {
      const opdNum = Number(opd_id);
      if (!Number.isFinite(opdNum)) {
        return res.status(400).json({ error: "opd_id harus berupa angka" });
      }
      where.opd_id = opdNum;
    }

    const [rows, tujuanRows] = await Promise.all([
      RenstraTabelTujuan.findAll({
        where: {
          ...where,
          ...(tujuanIds ? { tujuan_id: tujuanIds } : {}),
        },
        order: [["id", "DESC"]],
        attributes: [
          "id",
          "tujuan_id",
          "opd_id",
          "indikator_id",
          "kode_tujuan",
          "nama_tujuan",
          "pagu_akhir_renstra",
        ],
      }),
      RenstraTujuan.findAll({
        attributes: ["id", "renstra_id", "no_tujuan", "isi_tujuan"],
      }),
    ]);

    const tujuanMap = new Map(
      tujuanRows.map((t) => [Number(t.id), t.toJSON ? t.toJSON() : t])
    );

    const rowsWithTarget = rows.map((row) => {
      const json = applyTargetFinalIfMissing(row);
      const tujuan = tujuanMap.get(Number(json.tujuan_id)) || null;
      return {
        id: json.id,
        tujuan_id: json.tujuan_id,
        renstra_id: tujuan?.renstra_id ?? null,
        opd_id: json.opd_id,
        indikator_id: json.indikator_id,
        no_tujuan: json.kode_tujuan ?? tujuan?.no_tujuan ?? null,
        nomor_tujuan: json.kode_tujuan ?? tujuan?.no_tujuan ?? null,
        isi_tujuan: json.nama_tujuan ?? tujuan?.isi_tujuan ?? null,
        pagu_tujuan: Number(json.pagu_akhir_renstra || 0),
        total_pagu: Number(json.pagu_akhir_renstra || 0),
        pagu_akhir_renstra: Number(json.pagu_akhir_renstra || 0),
      };
    });

    const result = await attachTujuanCacheToRows({ rows: rowsWithTarget }).then((items) =>
      items.map((item) => ({
        id: item.id,
        tujuan_id: item.tujuan_id,
        no_tujuan: item.no_tujuan ?? item.nomor_tujuan ?? null,
        nomor_tujuan: item.nomor_tujuan ?? item.no_tujuan ?? null,
        isi_tujuan: item.isi_tujuan ?? null,
        pagu_tujuan: item.pagu_tujuan ?? item.total_pagu ?? 0,
        total_pagu: item.total_pagu ?? item.pagu_tujuan ?? 0,
      }))
    );

    res.json(result);
  } catch (err) {
    console.error("[renstra_tabelTujuanController.findAll]", err);
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

    if (renstra_id != null && renstra_id !== "") {
      const renstraNum = Number(renstra_id);
      if (!Number.isFinite(renstraNum)) {
        return res.status(400).json({ error: "renstra_id harus berupa angka" });
      }

      const tujuanRowsForRenstra = await RenstraTujuan.findAll({
        attributes: ["id"],
        where: { renstra_id: renstraNum },
      });
      const tujuanIds = tujuanRowsForRenstra
        .map((row) => Number(row.id))
        .filter((id) => Number.isFinite(id));

      if (!tujuanIds.includes(Number(tujuan_id))) {
        return res.json([]);
      }
    }

    const rows = await RenstraTabelTujuan.findAll({
      where,
      order: [["id", "ASC"]],
      attributes: [
        "id",
        "tujuan_id",
        "opd_id",
        "indikator_id",
        "kode_tujuan",
        "nama_tujuan",
        "pagu_akhir_renstra",
      ],
    });

    const tujuan = await RenstraTujuan.findByPk(Number(tujuan_id), {
      attributes: ["id", "renstra_id", "no_tujuan", "isi_tujuan"],
    });

    const result = await attachTujuanCacheToRows({
      rows: rows.map((row) => ({
        ...(row.toJSON ? row.toJSON() : row),
        renstra_id: tujuan?.renstra_id ?? null,
        no_tujuan: row.kode_tujuan ?? tujuan?.no_tujuan ?? null,
        nomor_tujuan: row.kode_tujuan ?? tujuan?.no_tujuan ?? null,
        isi_tujuan: row.nama_tujuan ?? tujuan?.isi_tujuan ?? null,
      })),
    }).then((items) =>
      items.map((item) => ({
        id: item.id,
        tujuan_id: item.tujuan_id,
        renstra_id: tujuan?.renstra_id ?? null,
        no_tujuan: item.no_tujuan ?? item.nomor_tujuan ?? null,
        nomor_tujuan: item.nomor_tujuan ?? item.no_tujuan ?? null,
        isi_tujuan: item.isi_tujuan ?? null,
        pagu_tujuan: item.pagu_tujuan ?? item.total_pagu ?? 0,
        total_pagu: item.total_pagu ?? item.pagu_tujuan ?? 0,
      }))
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ========================= FIND ONE =========================

exports.findOne = async (req, res) => {
  try {
    const { id } = req.params;

    const row = await RenstraTabelTujuan.findByPk(id, {
      include: tujuanInclude,
      attributes: [
        "id",
        "tujuan_id",
        "opd_id",
        "indikator_id",
        "kode_tujuan",
        "nama_tujuan",
        "target_tahun_1",
        "target_tahun_2",
        "target_tahun_3",
        "target_tahun_4",
        "target_tahun_5",
        "target_tahun_6",
        "pagu_rpjmd_acuan",
        "pagu_tahun_1",
        "pagu_tahun_2",
        "pagu_tahun_3",
        "pagu_tahun_4",
        "pagu_tahun_5",
        "pagu_tahun_6",
        "pagu_akhir_renstra",
        "target_akhir_renstra",
        "baseline",
        "satuan_target",
        "lokasi",
        "versi",
        "status_revisi",
        "last_revised_at",
        "last_revised_by",
      ],
    });

    if (!row) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    const tujuan = await RenstraTujuan.findByPk(Number(row.tujuan_id), {
      attributes: ["id", "renstra_id", "no_tujuan", "isi_tujuan"],
    });

    const [result] = await attachTujuanCacheToRows({
      rows: [
        {
          ...(row.toJSON ? row.toJSON() : row),
          renstra_id: tujuan?.renstra_id ?? null,
          no_tujuan: row.kode_tujuan ?? tujuan?.no_tujuan ?? null,
          nomor_tujuan: row.kode_tujuan ?? tujuan?.no_tujuan ?? null,
          isi_tujuan: row.nama_tujuan ?? tujuan?.isi_tujuan ?? null,
        },
      ],
    }).then((items) =>
      items.map((item) => ({
        ...item,
        renstra_id: tujuan?.renstra_id ?? null,
      }))
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ========================= UPDATE =========================

exports.update = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { id } = req.params;

    const current = await RenstraTabelTujuan.findByPk(id, {
      transaction: t,
    });

    if (!current) {
      await t.rollback();
      return res.status(404).json({ message: "Data not found" });
    }

    const payloadBase = {
      ...req.body,
      ...buildLockedPaguPayload(),
      ...computeFinal(req.body),
    };

    if (
      !payloadBase.renstra_id ||
      !payloadBase.tujuan_id ||
      !payloadBase.indikator_id
    ) {
      await t.rollback();
      return res.status(400).json({
        message: "renstra_id, tujuan_id, dan indikator_id wajib diisi",
      });
    }

    const indikator = await IndikatorRenstra.findByPk(
      payloadBase.indikator_id,
      { transaction: t }
    );

    if (!indikator) {
      await t.rollback();
      return res.status(404).json({ error: "Indikator tidak ditemukan" });
    }

    const masterTujuan = await RenstraTujuan.findByPk(payloadBase.tujuan_id, {
      transaction: t,
    });

    if (!masterTujuan) {
      await t.rollback();
      return res.status(404).json({ error: "Tujuan tidak ditemukan" });
    }

    if (
      payloadBase.renstra_id != null &&
      Number(masterTujuan.renstra_id) !== Number(payloadBase.renstra_id)
    ) {
      await t.rollback();
      return res.status(400).json({
        message: "tujuan_id tidak sesuai dengan renstra_id yang dipilih",
      });
    }

    const duplicate = await RenstraTabelTujuan.findOne({
      where: {
        id: { [Op.ne]: id },
        tujuan_id: payloadBase.tujuan_id,
        indikator_id: payloadBase.indikator_id,
      },
      transaction: t,
    });

    if (duplicate) {
      await t.rollback();
      return res.status(409).json({
        message: "Data tujuan dengan indikator ini sudah ada. Gunakan Edit.",
        existing_id: duplicate.id,
        blocked: true,
      });
    }

    const payload = {
      ...payloadBase,

      satuan_target: indikator.satuan || payloadBase.satuan_target,

      kode_tujuan:
        payloadBase.kode_tujuan || masterTujuan.no_tujuan || null,

      nama_tujuan:
        payloadBase.nama_tujuan || masterTujuan.isi_tujuan || null,

      // 🔴 Parent tidak boleh update pagu dari form.
      ...buildLockedPaguPayload(),
    };

    await RenstraTabelTujuan.update(payload, {
      where: { id },
      transaction: t,
    });

    const updatedData = await RenstraTabelTujuan.findByPk(id, {
      include: tujuanInclude,
      transaction: t,
    });

    const [result] = await attachTujuanCacheToRows({
      rows: [updatedData],
      transaction: t,
    });

    await t.commit();

    res.json({
      message: "Data tujuan berhasil diperbarui",
      data: result,
      blocked: false,
    });
  } catch (err) {
    await t.rollback();
    res.status(400).json({ error: err.message });
  }
};

// ========================= REVISI =========================
exports.revisi = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { id } = req.params;
    const actorId = getActorId(req);
    const alasanRevisi = req.body.alasan_revisi;

    if (!alasanRevisi || String(alasanRevisi).trim() === "") {
      await t.rollback();
      return res.status(400).json({
        message: "Alasan revisi wajib diisi",
        blocked: true,
      });
    }

    const row = await RenstraTabelTujuan.findByPk(id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!row) {
      await t.rollback();
      return res.status(404).json({
        message: "Data tujuan Renstra tidak ditemukan",
        blocked: true,
      });
    }

    const beforeJson = row.toJSON();

    const payload = sanitizeTujuanPayload(req.body);

    const afterJson = {
      ...beforeJson,
      ...payload,
      versi: Number(beforeJson.versi || 1) + 1,
      status_revisi: "draft",
      last_revised_at: new Date(),
      last_revised_by: actorId,
    };

    const versiSesudah = await insertTujuanHistory({
      row: beforeJson,
      beforeJson,
      afterJson,
      alasanRevisi,
      actorId,
      transaction: t,
    });

    await row.update(
      {
        ...payload,
        versi: versiSesudah,
        status_revisi: "draft",
        last_revised_at: new Date(),
        last_revised_by: actorId,
      },
      { transaction: t }
    );

    const updated = await RenstraTabelTujuan.findByPk(id, {
      include: [
        { model: IndikatorRenstra, as: "indikator" },
        { model: RenstraTujuan, as: "tujuan" },
        { model: RenstraOPD, as: "opd" },
      ],
      transaction: t,
    });

    await t.commit();

    res.json({
      message: "✅ Revisi tujuan berhasil disimpan sebagai draft",
      data: updated,
      before: beforeJson,
      after: afterJson,
      blocked: false,
    });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
};

// ========================= HISTORY =========================
exports.history = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await sequelize.query(
      `
      SELECT *
      FROM renstra_tabel_tujuan_history
      WHERE renstra_tabel_tujuan_id = :id
      ORDER BY id DESC
      `,
      {
        replacements: { id },
      }
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ========================= VERIFIKASI REVISI =========================
exports.verifikasiHistory = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { history_id } = req.params;
    const actorId = getActorId(req);

    await sequelize.query(
      `
      UPDATE renstra_tabel_tujuan_history
      SET
        status_revisi = 'verifikasi',
        diverifikasi_oleh = :actorId,
        diverifikasi_pada = NOW(),
        updated_at = NOW()
      WHERE id = :history_id
        AND status_revisi = 'draft'
      `,
      {
        replacements: { history_id, actorId },
        transaction: t,
      }
    );

    await t.commit();

    res.json({
      message: "✅ Revisi tujuan berhasil diverifikasi",
      blocked: false,
    });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
};

// ========================= APPROVE REVISI =========================
exports.approveHistory = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { history_id } = req.params;
    const actorId = getActorId(req);

    const [rows] = await sequelize.query(
      `
      SELECT *
      FROM renstra_tabel_tujuan_history
      WHERE id = :history_id
      LIMIT 1
      `,
      {
        replacements: { history_id },
        transaction: t,
      }
    );

    const history = rows[0];

    if (!history) {
      await t.rollback();
      return res.status(404).json({
        message: "History revisi tidak ditemukan",
        blocked: true,
      });
    }

    if (history.status_revisi !== "verifikasi") {
      await t.rollback();
      return res.status(400).json({
        message: "Revisi harus diverifikasi sebelum approve",
        blocked: true,
      });
    }

    await sequelize.query(
      `
      UPDATE renstra_tabel_tujuan_history
      SET
        status_revisi = 'approved',
        disetujui_oleh = :actorId,
        disetujui_pada = NOW(),
        updated_at = NOW()
      WHERE id = :history_id
      `,
      {
        replacements: { history_id, actorId },
        transaction: t,
      }
    );

    await RenstraTabelTujuan.update(
      {
        status_revisi: "approved",
      },
      {
        where: { id: history.renstra_tabel_tujuan_id },
        transaction: t,
      }
    );

    await t.commit();

    res.json({
      message: "✅ Revisi tujuan berhasil disetujui",
      blocked: false,
    });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
};

// ========================= TOLAK REVISI =========================
exports.tolakHistory = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { history_id } = req.params;
    const actorId = getActorId(req);

    await sequelize.query(
      `
      UPDATE renstra_tabel_tujuan_history
      SET
        status_revisi = 'ditolak',
        disetujui_oleh = :actorId,
        disetujui_pada = NOW(),
        updated_at = NOW()
      WHERE id = :history_id
        AND status_revisi IN ('draft', 'verifikasi')
      `,
      {
        replacements: { history_id, actorId },
        transaction: t,
      }
    );

    await t.commit();

    res.json({
      message: "✅ Revisi tujuan berhasil ditolak",
      blocked: false,
    });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
};

// ========================= DELETE =========================

exports.delete = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { id } = req.params;

    const deleted = await RenstraTabelTujuan.destroy({
      where: { id },
      transaction: t,
    });

    if (!deleted) {
      await t.rollback();
      return res.status(404).json({ message: "Data not found" });
    }

    await t.commit();

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
};
