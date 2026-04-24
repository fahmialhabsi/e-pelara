"use strict";

const { enrichRuleRegistry } = require("./renjaGovernanceSeverityService");

const RENJA_POLICY_ALIGNMENT_RULES = [
  {
    code: "POLICY_CHAIN_EXISTS",
    description: "Item RENJA harus bisa ditelusuri ke chain kebijakan.",
    severity: "error",
    is_blocking: true,
    scope: "item",
    source_type: "RENSTRA",
  },
  {
    code: "POLICY_CHAIN_INCOMPLETE",
    description: "Chain kebijakan tidak lengkap.",
    severity: "error",
    is_blocking: true,
    scope: "item",
    source_type: "RENSTRA",
  },
  {
    code: "POLICY_CHAIN_BROKEN",
    description: "Chain kebijakan putus pada parent-child.",
    severity: "error",
    is_blocking: true,
    scope: "item",
    source_type: "RENSTRA",
  },
  {
    code: "STRATEGY_NOT_ALIGNED",
    description: "Strategi RENJA tidak aligned dengan sumber.",
    severity: "warning",
    is_blocking: false,
    scope: "item",
    source_type: "RENSTRA",
  },
  {
    code: "ARAH_KEBIJAKAN_NOT_ALIGNED",
    description: "Arah kebijakan RENJA tidak aligned dengan sumber.",
    severity: "warning",
    is_blocking: false,
    scope: "item",
    source_type: "RENSTRA",
  },
  {
    code: "SASARAN_NOT_ALIGNED",
    description: "Sasaran RENJA tidak aligned dengan sumber.",
    severity: "warning",
    is_blocking: false,
    scope: "item",
    source_type: "RENSTRA",
  },
  {
    code: "TUJUAN_NOT_ALIGNED",
    description: "Tujuan RENJA tidak aligned dengan sumber.",
    severity: "warning",
    is_blocking: false,
    scope: "item",
    source_type: "RENSTRA",
  },
  {
    code: "MISI_NOT_ALIGNED",
    description: "Misi RENJA tidak aligned dengan sumber.",
    severity: "warning",
    is_blocking: false,
    scope: "item",
    source_type: "RENSTRA",
  },
  {
    code: "PROGRAM_WITHOUT_ARAH_KEBIJAKAN",
    description: "Program tidak memiliki arah kebijakan.",
    severity: "error",
    is_blocking: true,
    scope: "item",
    source_type: "RENSTRA",
  },
  {
    code: "ARAH_KEBIJAKAN_WITHOUT_STRATEGI",
    description: "Arah kebijakan tidak memiliki strategi valid.",
    severity: "error",
    is_blocking: true,
    scope: "item",
    source_type: "RENSTRA",
  },
  {
    code: "STRATEGI_WITHOUT_SASARAN",
    description: "Strategi tidak memiliki sasaran valid.",
    severity: "error",
    is_blocking: true,
    scope: "item",
    source_type: "RENSTRA",
  },
  {
    code: "SASARAN_WITHOUT_TUJUAN",
    description: "Sasaran tidak memiliki tujuan valid.",
    severity: "error",
    is_blocking: true,
    scope: "item",
    source_type: "RENSTRA",
  },
  {
    code: "TUJUAN_WITHOUT_MISI",
    description: "Tujuan tidak memiliki misi valid.",
    severity: "error",
    is_blocking: true,
    scope: "item",
    source_type: "RENSTRA",
  },
];

const POLICY_CHAIN_SQL = `
SELECT
  ri.id AS renja_item_id,
  ri.program_id AS actual_program_id,
  ri.kegiatan_id AS actual_kegiatan_id,
  ri.sub_kegiatan_id AS actual_sub_kegiatan_id,
  ri.source_renstra_program_id,
  ri.source_renstra_kegiatan_id,
  ri.source_renstra_subkegiatan_id,

  p_act.nama_program AS actual_program_nama,
  p_act.kode_program AS actual_program_kode,
  k_act.nama_kegiatan AS actual_kegiatan_nama,
  k_act.kode_kegiatan AS actual_kegiatan_kode,
  sk_act.nama_sub_kegiatan AS actual_sub_kegiatan_nama,
  sk_act.kode_sub_kegiatan AS actual_sub_kegiatan_kode,
  s_act.id AS actual_sasaran_id,
  s_act.isi_sasaran AS actual_sasaran_nama,
  t_act.id AS actual_tujuan_id,
  t_act.isi_tujuan AS actual_tujuan_nama,
  m_act.id AS actual_misi_id,
  m_act.isi_misi AS actual_misi_nama,

  ps_act.strategi_id AS actual_strategi_id,
  st_act.deskripsi AS actual_strategi_nama,
  pak_act.arah_kebijakan_id AS actual_arah_kebijakan_id,
  ak_act.deskripsi AS actual_arah_kebijakan_nama,

  rp.id AS expected_renstra_program_id,
  rp.nama_program AS expected_program_nama,
  rp.kode_program AS expected_program_kode,
  rp.rpjmd_program_id AS expected_program_id,
  rk_exp.id AS expected_renstra_kegiatan_id,
  rk_exp.nama_kegiatan AS expected_kegiatan_nama,
  rk_exp.kode_kegiatan AS expected_kegiatan_kode,
  rs_exp.id AS expected_renstra_sub_kegiatan_id,
  rs_exp.nama_sub_kegiatan AS expected_sub_kegiatan_nama,
  rs_exp.kode_sub_kegiatan AS expected_sub_kegiatan_kode,
  s_exp.id AS expected_sasaran_id,
  s_exp.isi_sasaran AS expected_sasaran_nama,
  t_exp.id AS expected_tujuan_id,
  t_exp.isi_tujuan AS expected_tujuan_nama,
  m_exp.id AS expected_misi_id,
  m_exp.isi_misi AS expected_misi_nama,
  ps_exp.strategi_id AS expected_strategi_id,
  st_exp.deskripsi AS expected_strategi_nama,
  pak_exp.arah_kebijakan_id AS expected_arah_kebijakan_id,
  ak_exp.deskripsi AS expected_arah_kebijakan_nama
FROM renja_item ri
LEFT JOIN renstra_program rp ON rp.id = ri.source_renstra_program_id

LEFT JOIN program p_act ON p_act.id = ri.program_id
LEFT JOIN kegiatan k_act ON k_act.id = ri.kegiatan_id
LEFT JOIN sub_kegiatan sk_act ON sk_act.id = ri.sub_kegiatan_id
LEFT JOIN sasaran s_act ON s_act.id = p_act.sasaran_id
LEFT JOIN tujuan t_act ON t_act.id = s_act.tujuan_id
LEFT JOIN misi m_act ON m_act.id = t_act.misi_id
LEFT JOIN (
  SELECT program_id, MIN(strategi_id) AS strategi_id
  FROM program_strategi
  GROUP BY program_id
) ps_act ON ps_act.program_id = p_act.id
LEFT JOIN strategi st_act ON st_act.id = ps_act.strategi_id
LEFT JOIN (
  SELECT program_id, MIN(arah_kebijakan_id) AS arah_kebijakan_id
  FROM program_arah_kebijakan
  GROUP BY program_id
) pak_act ON pak_act.program_id = p_act.id
LEFT JOIN arah_kebijakan ak_act ON ak_act.id = pak_act.arah_kebijakan_id

LEFT JOIN program p_exp ON p_exp.id = rp.rpjmd_program_id
LEFT JOIN renstra_kegiatan rk_exp ON rk_exp.id = ri.source_renstra_kegiatan_id
LEFT JOIN renstra_subkegiatan rs_exp ON rs_exp.id = ri.source_renstra_subkegiatan_id
LEFT JOIN sasaran s_exp ON s_exp.id = p_exp.sasaran_id
LEFT JOIN tujuan t_exp ON t_exp.id = s_exp.tujuan_id
LEFT JOIN misi m_exp ON m_exp.id = t_exp.misi_id
LEFT JOIN (
  SELECT program_id, MIN(strategi_id) AS strategi_id
  FROM program_strategi
  GROUP BY program_id
) ps_exp ON ps_exp.program_id = p_exp.id
LEFT JOIN strategi st_exp ON st_exp.id = ps_exp.strategi_id
LEFT JOIN (
  SELECT program_id, MIN(arah_kebijakan_id) AS arah_kebijakan_id
  FROM program_arah_kebijakan
  GROUP BY program_id
) pak_exp ON pak_exp.program_id = p_exp.id
LEFT JOIN arah_kebijakan ak_exp ON ak_exp.id = pak_exp.arah_kebijakan_id
WHERE ri.id = :renjaItemId
LIMIT 1
`;

function mapChainRecord(row) {
  if (!row) return null;
  return {
    actual: {
      program_id: row.actual_program_id || null,
      program: row.actual_program_nama || null,
      program_kode: row.actual_program_kode || null,
      kegiatan_id: row.actual_kegiatan_id || null,
      kegiatan: row.actual_kegiatan_nama || null,
      kegiatan_kode: row.actual_kegiatan_kode || null,
      sub_kegiatan_id: row.actual_sub_kegiatan_id || null,
      sub_kegiatan: row.actual_sub_kegiatan_nama || null,
      sub_kegiatan_kode: row.actual_sub_kegiatan_kode || null,
      sasaran_id: row.actual_sasaran_id || null,
      sasaran: row.actual_sasaran_nama || null,
      tujuan_id: row.actual_tujuan_id || null,
      tujuan: row.actual_tujuan_nama || null,
      misi_id: row.actual_misi_id || null,
      misi: row.actual_misi_nama || null,
      strategi_id: row.actual_strategi_id || null,
      strategi: row.actual_strategi_nama || null,
      arah_kebijakan_id: row.actual_arah_kebijakan_id || null,
      arah_kebijakan: row.actual_arah_kebijakan_nama || null,
    },
    expected: {
      renstra_program_id: row.expected_renstra_program_id || null,
      program_id: row.expected_program_id || null,
      program: row.expected_program_nama || null,
      program_kode: row.expected_program_kode || null,
      renstra_kegiatan_id: row.expected_renstra_kegiatan_id || null,
      kegiatan: row.expected_kegiatan_nama || null,
      kegiatan_kode: row.expected_kegiatan_kode || null,
      renstra_sub_kegiatan_id: row.expected_renstra_sub_kegiatan_id || null,
      sub_kegiatan: row.expected_sub_kegiatan_nama || null,
      sub_kegiatan_kode: row.expected_sub_kegiatan_kode || null,
      sasaran_id: row.expected_sasaran_id || null,
      sasaran: row.expected_sasaran_nama || null,
      tujuan_id: row.expected_tujuan_id || null,
      tujuan: row.expected_tujuan_nama || null,
      misi_id: row.expected_misi_id || null,
      misi: row.expected_misi_nama || null,
      strategi_id: row.expected_strategi_id || null,
      strategi: row.expected_strategi_nama || null,
      arah_kebijakan_id: row.expected_arah_kebijakan_id || null,
      arah_kebijakan: row.expected_arah_kebijakan_nama || null,
    },
  };
}

async function getPolicyChainByRenjaItem(db, renjaItemId, opts = {}) {
  const { sequelize } = db;
  const row = await sequelize
    .query(POLICY_CHAIN_SQL, {
      replacements: { renjaItemId: Number(renjaItemId) },
      type: db.Sequelize.QueryTypes.SELECT,
      plain: true,
      transaction: opts.transaction || undefined,
    })
    .catch(() => null);
  return mapChainRecord(row || null);
}

async function getPolicyChainByRenjaItemSequelize(db, renjaItemId, opts = {}) {
  const q = opts.transaction ? { transaction: opts.transaction } : {};
  const {
    RenjaItem,
    RenstraProgram,
    RenstraKegiatan,
    RenstraSubkegiatan,
    Program,
    Kegiatan,
    SubKegiatan,
    Sasaran,
    Tujuan,
    Misi,
    Strategi,
    ArahKebijakan,
  } = db;

  const item = await RenjaItem.findByPk(Number(renjaItemId), q);
  if (!item) return null;

  const [actualProgram, actualKegiatan, actualSub, expectedProgram, expectedKegiatan, expectedSub] =
    await Promise.all([
      item.program_id ? Program.findByPk(item.program_id, q) : null,
      item.kegiatan_id ? Kegiatan.findByPk(item.kegiatan_id, q) : null,
      item.sub_kegiatan_id ? SubKegiatan.findByPk(item.sub_kegiatan_id, q) : null,
      item.source_renstra_program_id ? RenstraProgram.findByPk(item.source_renstra_program_id, q) : null,
      item.source_renstra_kegiatan_id ? RenstraKegiatan.findByPk(item.source_renstra_kegiatan_id, q) : null,
      item.source_renstra_subkegiatan_id ? RenstraSubkegiatan.findByPk(item.source_renstra_subkegiatan_id, q) : null,
    ]);

  const [actualSasaran, expectedMasterProgram] = await Promise.all([
    actualProgram?.sasaran_id ? Sasaran.findByPk(actualProgram.sasaran_id, q) : null,
    expectedProgram?.rpjmd_program_id ? Program.findByPk(expectedProgram.rpjmd_program_id, q) : null,
  ]);
  const [actualTujuan, expectedSasaran] = await Promise.all([
    actualSasaran?.tujuan_id ? Tujuan.findByPk(actualSasaran.tujuan_id, q) : null,
    expectedMasterProgram?.sasaran_id ? Sasaran.findByPk(expectedMasterProgram.sasaran_id, q) : null,
  ]);
  const [actualMisi, expectedTujuan] = await Promise.all([
    actualTujuan?.misi_id ? Misi.findByPk(actualTujuan.misi_id, q) : null,
    expectedSasaran?.tujuan_id ? Tujuan.findByPk(expectedSasaran.tujuan_id, q) : null,
  ]);
  const expectedMisi = expectedTujuan?.misi_id ? await Misi.findByPk(expectedTujuan.misi_id, q) : null;

  const [actualStrategiRows, actualArahRows, expectedStrategiRows, expectedArahRows] = await Promise.all([
    actualProgram?.id
      ? db.sequelize.query(
          "SELECT strategi_id FROM program_strategi WHERE program_id = :programId ORDER BY strategi_id ASC LIMIT 1",
          {
            replacements: { programId: actualProgram.id },
            type: db.Sequelize.QueryTypes.SELECT,
            ...q,
          },
        )
      : [],
    actualProgram?.id
      ? db.sequelize.query(
          "SELECT arah_kebijakan_id FROM program_arah_kebijakan WHERE program_id = :programId ORDER BY arah_kebijakan_id ASC LIMIT 1",
          {
            replacements: { programId: actualProgram.id },
            type: db.Sequelize.QueryTypes.SELECT,
            ...q,
          },
        )
      : [],
    expectedMasterProgram?.id
      ? db.sequelize.query(
          "SELECT strategi_id FROM program_strategi WHERE program_id = :programId ORDER BY strategi_id ASC LIMIT 1",
          {
            replacements: { programId: expectedMasterProgram.id },
            type: db.Sequelize.QueryTypes.SELECT,
            ...q,
          },
        )
      : [],
    expectedMasterProgram?.id
      ? db.sequelize.query(
          "SELECT arah_kebijakan_id FROM program_arah_kebijakan WHERE program_id = :programId ORDER BY arah_kebijakan_id ASC LIMIT 1",
          {
            replacements: { programId: expectedMasterProgram.id },
            type: db.Sequelize.QueryTypes.SELECT,
            ...q,
          },
        )
      : [],
  ]);

  const actualStrategi = actualStrategiRows?.[0]?.strategi_id
    ? await Strategi.findByPk(actualStrategiRows[0].strategi_id, q)
    : null;
  const actualArah = actualArahRows?.[0]?.arah_kebijakan_id
    ? await ArahKebijakan.findByPk(actualArahRows[0].arah_kebijakan_id, q)
    : null;
  const expectedStrategi = expectedStrategiRows?.[0]?.strategi_id
    ? await Strategi.findByPk(expectedStrategiRows[0].strategi_id, q)
    : null;
  const expectedArah = expectedArahRows?.[0]?.arah_kebijakan_id
    ? await ArahKebijakan.findByPk(expectedArahRows[0].arah_kebijakan_id, q)
    : null;

  return {
    actual: {
      program_id: actualProgram?.id || null,
      program: actualProgram?.nama_program || null,
      program_kode: actualProgram?.kode_program || null,
      kegiatan_id: actualKegiatan?.id || null,
      kegiatan: actualKegiatan?.nama_kegiatan || null,
      kegiatan_kode: actualKegiatan?.kode_kegiatan || null,
      sub_kegiatan_id: actualSub?.id || null,
      sub_kegiatan: actualSub?.nama_sub_kegiatan || null,
      sub_kegiatan_kode: actualSub?.kode_sub_kegiatan || null,
      sasaran_id: actualSasaran?.id || null,
      sasaran: actualSasaran?.isi_sasaran || null,
      tujuan_id: actualTujuan?.id || null,
      tujuan: actualTujuan?.isi_tujuan || null,
      misi_id: actualMisi?.id || null,
      misi: actualMisi?.isi_misi || null,
      strategi_id: actualStrategi?.id || null,
      strategi: actualStrategi?.deskripsi || null,
      arah_kebijakan_id: actualArah?.id || null,
      arah_kebijakan: actualArah?.deskripsi || null,
    },
    expected: {
      renstra_program_id: expectedProgram?.id || null,
      program_id: expectedMasterProgram?.id || null,
      program: expectedProgram?.nama_program || expectedMasterProgram?.nama_program || null,
      program_kode: expectedProgram?.kode_program || expectedMasterProgram?.kode_program || null,
      renstra_kegiatan_id: expectedKegiatan?.id || null,
      kegiatan: expectedKegiatan?.nama_kegiatan || null,
      kegiatan_kode: expectedKegiatan?.kode_kegiatan || null,
      renstra_sub_kegiatan_id: expectedSub?.id || null,
      sub_kegiatan: expectedSub?.nama_sub_kegiatan || null,
      sub_kegiatan_kode: expectedSub?.kode_sub_kegiatan || null,
      sasaran_id: expectedSasaran?.id || null,
      sasaran: expectedSasaran?.isi_sasaran || null,
      tujuan_id: expectedTujuan?.id || null,
      tujuan: expectedTujuan?.isi_tujuan || null,
      misi_id: expectedMisi?.id || null,
      misi: expectedMisi?.isi_misi || null,
      strategi_id: expectedStrategi?.id || null,
      strategi: expectedStrategi?.deskripsi || null,
      arah_kebijakan_id: expectedArah?.id || null,
      arah_kebijakan: expectedArah?.deskripsi || null,
    },
  };
}

async function getExpectedPolicyChainFromRenstraProgram(db, renstraProgramId) {
  if (!Number.isFinite(Number(renstraProgramId))) return null;
  const {
    RenstraProgram,
    Program,
    Sasaran,
    Tujuan,
    Misi,
    program_strategi: ProgramStrategiSnake,
    ProgramStrategi: ProgramStrategiPascal,
    ProgramArahKebijakan: ProgramArahKebijakanPascal,
    program_arah_kebijakan: ProgramArahKebijakanSnake,
    Strategi,
    ArahKebijakan,
  } = db;
  const ProgramStrategi = ProgramStrategiSnake || ProgramStrategiPascal;
  const ProgramArahKebijakan = ProgramArahKebijakanPascal || ProgramArahKebijakanSnake;

  const rp = await RenstraProgram.findByPk(Number(renstraProgramId));
  if (!rp || !rp.rpjmd_program_id) return null;

  const p = await Program.findByPk(rp.rpjmd_program_id);
  const sasaran = p?.sasaran_id ? await Sasaran.findByPk(p.sasaran_id) : null;
  const tujuan = sasaran?.tujuan_id ? await Tujuan.findByPk(sasaran.tujuan_id) : null;
  const misi = tujuan?.misi_id ? await Misi.findByPk(tujuan.misi_id) : null;

  const ps = ProgramStrategi
    ? await ProgramStrategi.findOne({
        where: { program_id: p?.id || null },
        order: [["strategi_id", "ASC"]],
      })
    : null;
  const pak = ProgramArahKebijakan
    ? await ProgramArahKebijakan.findOne({
        where: { program_id: p?.id || null },
        order: [["arah_kebijakan_id", "ASC"]],
      })
    : null;
  const strategi = ps?.strategi_id ? await Strategi.findByPk(ps.strategi_id) : null;
  const arah = pak?.arah_kebijakan_id ? await ArahKebijakan.findByPk(pak.arah_kebijakan_id) : null;

  return {
    renstra_program_id: rp.id,
    program_id: p?.id || null,
    program: p?.nama_program || rp.nama_program || null,
    program_kode: p?.kode_program || rp.kode_program || null,
    sasaran_id: sasaran?.id || null,
    sasaran: sasaran?.isi_sasaran || null,
    tujuan_id: tujuan?.id || null,
    tujuan: tujuan?.isi_tujuan || null,
    misi_id: misi?.id || null,
    misi: misi?.isi_misi || null,
    strategi_id: strategi?.id || null,
    strategi: strategi?.deskripsi || null,
    arah_kebijakan_id: arah?.id || null,
    arah_kebijakan: arah?.deskripsi || null,
  };
}

async function getIndicatorsAcrossHierarchy(db, chain = {}) {
  const { IndikatorRenstra, Indikator } = db;
  const expected = chain.expected || {};
  const actual = chain.actual || {};
  const out = {
    expected: {},
    actual: {},
  };

  const renstraOr = [];
  if (expected.renstra_program_id) renstraOr.push({ stage: "program", ref_id: expected.renstra_program_id });
  if (expected.renstra_kegiatan_id) renstraOr.push({ stage: "kegiatan", ref_id: expected.renstra_kegiatan_id });
  if (expected.renstra_sub_kegiatan_id || expected.renstra_subkegiatan_id) {
    renstraOr.push({
      stage: "sub_kegiatan",
      ref_id: expected.renstra_sub_kegiatan_id || expected.renstra_subkegiatan_id,
    });
  }
  if (renstraOr.length) {
    const rows = await IndikatorRenstra.findAll({ where: { [db.Sequelize.Op.or]: renstraOr }, limit: 200 });
    for (const r of rows) {
      const k = `${r.stage}:${r.ref_id}`;
      if (!out.expected[k]) out.expected[k] = [];
      out.expected[k].push(r.nama_indikator);
    }
  }

  const indikatorRows = await Indikator.findAll({
    where: {
      [db.Sequelize.Op.or]: [
        actual.misi_id ? { misi_id: actual.misi_id, stage: "misi" } : null,
        actual.tujuan_id ? { tujuan_id: actual.tujuan_id, stage: "tujuan" } : null,
        actual.sasaran_id ? { sasaran_id: actual.sasaran_id, stage: "sasaran" } : null,
        actual.program_id ? { program_id: actual.program_id, stage: "program" } : null,
        actual.kegiatan_id ? { kegiatan_id: actual.kegiatan_id, stage: "kegiatan" } : null,
      ].filter(Boolean),
    },
    limit: 200,
  });
  for (const r of indikatorRows) {
    const k = `${r.stage}:${r.id}`;
    if (!out.actual[k]) out.actual[k] = [];
    out.actual[k].push(r.nama_indikator);
  }

  return out;
}

function mkIssue({
  code,
  message,
  severity = "warning",
  is_blocking = false,
  hierarchy_level = "program",
  field_name = null,
  expected_value = null,
  actual_value = null,
}) {
  return {
    mismatch_code: code,
    mismatch_label: code,
    mismatch_scope: "item",
    source_type: "RENSTRA",
    document_pair: "RENSTRA-RENJA",
    hierarchy_level,
    severity,
    is_blocking,
    message,
    recommendation: "Sesuaikan item RENJA agar chain kebijakan konsisten.",
    field_name,
    expected_value: expected_value == null ? null : String(expected_value),
    actual_value: actual_value == null ? null : String(actual_value),
  };
}

function evaluatePolicyAlignment(chain = {}) {
  const actual = chain.actual || {};
  const expected = chain.expected || {};
  const issues = [];

  if (!actual.program_id && !expected.program_id) {
    issues.push(
      mkIssue({
        code: "POLICY_CHAIN_EXISTS",
        severity: "error",
        is_blocking: true,
        hierarchy_level: "program",
        message: "Chain kebijakan tidak dapat ditelusuri dari item RENJA.",
      }),
    );
    return issues;
  }

  if (actual.program_id && (!actual.sasaran_id || !actual.tujuan_id || !actual.misi_id)) {
    issues.push(
      mkIssue({
        code: "POLICY_CHAIN_BROKEN",
        severity: "error",
        is_blocking: true,
        hierarchy_level: "sasaran",
        message: "Chain aktual program -> sasaran -> tujuan -> misi tidak lengkap.",
      }),
    );
  }
  if (actual.program_id && !actual.arah_kebijakan_id) {
    issues.push(
      mkIssue({
        code: "PROGRAM_WITHOUT_ARAH_KEBIJAKAN",
        severity: "error",
        is_blocking: true,
        hierarchy_level: "arah_kebijakan",
        field_name: "arah_kebijakan_id",
        expected_value: expected.arah_kebijakan_id || null,
        actual_value: null,
        message: "Program pada chain aktual belum memiliki arah kebijakan.",
      }),
    );
  }
  if (actual.arah_kebijakan_id && !actual.strategi_id) {
    issues.push(
      mkIssue({
        code: "ARAH_KEBIJAKAN_WITHOUT_STRATEGI",
        severity: "error",
        is_blocking: true,
        hierarchy_level: "strategi",
        field_name: "strategi_id",
        expected_value: expected.strategi_id || null,
        actual_value: null,
        message: "Arah kebijakan chain aktual tidak memiliki strategi yang dapat ditelusuri.",
      }),
    );
  }
  if (actual.strategi_id && !actual.sasaran_id) {
    issues.push(
      mkIssue({
        code: "STRATEGI_WITHOUT_SASARAN",
        severity: "error",
        is_blocking: true,
        hierarchy_level: "sasaran",
        field_name: "sasaran_id",
        expected_value: expected.sasaran_id || null,
        actual_value: null,
        message: "Strategi chain aktual tidak memiliki sasaran yang valid.",
      }),
    );
  }
  if (actual.sasaran_id && !actual.tujuan_id) {
    issues.push(
      mkIssue({
        code: "SASARAN_WITHOUT_TUJUAN",
        severity: "error",
        is_blocking: true,
        hierarchy_level: "tujuan",
        field_name: "tujuan_id",
        expected_value: expected.tujuan_id || null,
        actual_value: null,
        message: "Sasaran chain aktual tidak memiliki tujuan yang valid.",
      }),
    );
  }
  if (actual.tujuan_id && !actual.misi_id) {
    issues.push(
      mkIssue({
        code: "TUJUAN_WITHOUT_MISI",
        severity: "error",
        is_blocking: true,
        hierarchy_level: "misi",
        field_name: "misi_id",
        expected_value: expected.misi_id || null,
        actual_value: null,
        message: "Tujuan chain aktual tidak memiliki misi yang valid.",
      }),
    );
  }

  if (expected.program_id && (!expected.sasaran_id || !expected.tujuan_id || !expected.misi_id)) {
    issues.push(
      mkIssue({
        code: "POLICY_CHAIN_INCOMPLETE",
        hierarchy_level: "sasaran",
        message: "Chain expected dari RENSTRA belum lengkap sampai level misi.",
      }),
    );
  }

  if (expected.sasaran_id && actual.sasaran_id && Number(expected.sasaran_id) !== Number(actual.sasaran_id)) {
    issues.push(
      mkIssue({
        code: "SASARAN_NOT_ALIGNED",
        hierarchy_level: "sasaran",
        field_name: "sasaran_id",
        expected_value: expected.sasaran_id,
        actual_value: actual.sasaran_id,
        message: "Sasaran chain RENJA tidak selaras dengan chain sumber.",
      }),
    );
  }
  if (expected.sasaran_id && !actual.sasaran_id) {
    issues.push(
      mkIssue({
        code: "SASARAN_NOT_ALIGNED",
        hierarchy_level: "sasaran",
        field_name: "sasaran_id",
        expected_value: expected.sasaran_id,
        actual_value: null,
        message: "Sasaran expected ada, tetapi chain aktual belum memiliki sasaran.",
      }),
    );
  }

  if (expected.tujuan_id && actual.tujuan_id && Number(expected.tujuan_id) !== Number(actual.tujuan_id)) {
    issues.push(
      mkIssue({
        code: "TUJUAN_NOT_ALIGNED",
        hierarchy_level: "tujuan",
        field_name: "tujuan_id",
        expected_value: expected.tujuan_id,
        actual_value: actual.tujuan_id,
        message: "Tujuan chain RENJA tidak selaras dengan chain sumber.",
      }),
    );
  }
  if (expected.tujuan_id && !actual.tujuan_id) {
    issues.push(
      mkIssue({
        code: "TUJUAN_NOT_ALIGNED",
        hierarchy_level: "tujuan",
        field_name: "tujuan_id",
        expected_value: expected.tujuan_id,
        actual_value: null,
        message: "Tujuan expected ada, tetapi chain aktual belum memiliki tujuan.",
      }),
    );
  }

  if (expected.misi_id && actual.misi_id && Number(expected.misi_id) !== Number(actual.misi_id)) {
    issues.push(
      mkIssue({
        code: "MISI_NOT_ALIGNED",
        hierarchy_level: "misi",
        field_name: "misi_id",
        expected_value: expected.misi_id,
        actual_value: actual.misi_id,
        message: "Misi chain RENJA tidak selaras dengan chain sumber.",
      }),
    );
  }
  if (expected.misi_id && !actual.misi_id) {
    issues.push(
      mkIssue({
        code: "MISI_NOT_ALIGNED",
        hierarchy_level: "misi",
        field_name: "misi_id",
        expected_value: expected.misi_id,
        actual_value: null,
        message: "Misi expected ada, tetapi chain aktual belum memiliki misi.",
      }),
    );
  }

  if (expected.strategi_id && (!actual.strategi_id || Number(expected.strategi_id) !== Number(actual.strategi_id))) {
    issues.push(
      mkIssue({
        code: "STRATEGY_NOT_ALIGNED",
        hierarchy_level: "strategi",
        field_name: "strategi_id",
        expected_value: expected.strategi_id,
        actual_value: actual.strategi_id,
        message: "Strategi chain RENJA tidak selaras dengan chain sumber.",
      }),
    );
  }

  if (
    expected.arah_kebijakan_id &&
    (!actual.arah_kebijakan_id || Number(expected.arah_kebijakan_id) !== Number(actual.arah_kebijakan_id))
  ) {
    issues.push(
      mkIssue({
        code: "ARAH_KEBIJAKAN_NOT_ALIGNED",
        hierarchy_level: "arah_kebijakan",
        field_name: "arah_kebijakan_id",
        expected_value: expected.arah_kebijakan_id,
        actual_value: actual.arah_kebijakan_id,
        message: "Arah kebijakan chain RENJA tidak selaras dengan chain sumber.",
      }),
    );
  }

  return issues;
}

module.exports = {
  RENJA_POLICY_ALIGNMENT_RULES: enrichRuleRegistry(RENJA_POLICY_ALIGNMENT_RULES),
  POLICY_CHAIN_SQL,
  getPolicyChainByRenjaItem,
  getPolicyChainByRenjaItemSequelize,
  getExpectedPolicyChainFromRenstraProgram,
  getIndicatorsAcrossHierarchy,
  evaluatePolicyAlignment,
};
