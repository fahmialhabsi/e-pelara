const {
  RenstraTabelSubkegiatan,
  RenstraTabelKegiatan,
  RenstraTabelProgram,
  RenstraTabelArahKebijakan,
  RenstraTabelStrategi,
  RenstraTabelSasaran,
  RenstraTabelTujuan,
  RenstraPaguCache,
} = require('../models');

const PAGU_FIELDS = [
  'pagu_tahun_1',
  'pagu_tahun_2',
  'pagu_tahun_3',
  'pagu_tahun_4',
  'pagu_tahun_5',
  'pagu_tahun_6',
];

const sumPagu = (rows = []) => {
  const result = {
    pagu_tahun_1: 0,
    pagu_tahun_2: 0,
    pagu_tahun_3: 0,
    pagu_tahun_4: 0,
    pagu_tahun_5: 0,
    pagu_tahun_6: 0,
  };

  for (const row of rows) {
    for (const field of PAGU_FIELDS) {
      result[field] += Number(row?.[field] || 0);
    }
  }

  result.pagu_akhir_renstra = PAGU_FIELDS.reduce(
    (sum, field) => sum + Number(result[field] || 0),
    0,
  );

  return result;
};

const upsertCache = async ({ renstra_id, stage, ref_id, pagu, transaction }) => {
  if (!renstra_id || !stage || !ref_id) return null;

  await RenstraPaguCache.upsert(
    {
      renstra_id,
      stage,
      ref_id,
      ...pagu,
      cached_at: new Date(),
    },
    { transaction },
  );

  return {
    renstra_id,
    stage,
    ref_id,
    ...pagu,
  };
};

// ======================================================
// KEGIATAN
// sumber: RenstraTabelSubkegiatan
// cache: stage = kegiatan, ref_id = RenstraTabelKegiatan.id
// ======================================================
const syncKegiatan = async ({ kegiatan_id, transaction }) => {
  const kegiatan = await RenstraTabelKegiatan.findOne({
    where: { kegiatan_id },
    transaction,
  });

  if (!kegiatan) return null;

  const subs = await RenstraTabelSubkegiatan.findAll({
    where: { kegiatan_id },
    transaction,
  });

  const pagu = sumPagu(subs);

  await upsertCache({
    renstra_id: kegiatan.renstra_id || kegiatan.renstra_opd_id,
    stage: 'kegiatan',
    ref_id: kegiatan.id,
    pagu,
    transaction,
  });

  return {
    renstra_id: kegiatan.renstra_id || kegiatan.renstra_opd_id,
    kegiatan_id: kegiatan.kegiatan_id,
    kegiatan_row_id: kegiatan.id,
    program_id: kegiatan.program_id,
  };
};

// ======================================================
// PROGRAM
// sumber: cache kegiatan
// cache: stage = program, ref_id = RenstraTabelProgram.id
// ======================================================
const syncProgram = async ({ renstra_id, program_id, transaction }) => {
  if (!renstra_id || !program_id) return null;

  const program = await RenstraTabelProgram.findOne({
    where: { program_id },
    transaction,
  });

  if (!program) return null;

  const kegiatanList = await RenstraTabelKegiatan.findAll({
    where: { program_id },
    transaction,
  });

  const kegiatanRowIds = kegiatanList.map((k) => k.id);

  const cacheRows = await RenstraPaguCache.findAll({
    where: {
      renstra_id,
      stage: 'kegiatan',
      ref_id: kegiatanRowIds,
    },
    transaction,
  });

  const pagu = sumPagu(cacheRows);

  await upsertCache({
    renstra_id,
    stage: 'program',
    ref_id: program.id,
    pagu,
    transaction,
  });

  return {
    renstra_id,
    program_id: program.program_id,
    program_row_id: program.id,
    kebijakan_id: program.kebijakan_id || null,
  };
};

// ======================================================
// KEBIJAKAN / ARAH KEBIJAKAN
// sumber: cache program
// cache: stage = kebijakan, ref_id = RenstraTabelArahKebijakan.id
// ======================================================
const syncKebijakan = async ({ renstra_id, kebijakan_id, transaction }) => {
  if (!renstra_id || !kebijakan_id) return null;

  const kebijakan = await RenstraTabelArahKebijakan.findOne({
    where: { kebijakan_id },
    transaction,
  });

  if (!kebijakan) return null;

  const programs = await RenstraTabelProgram.findAll({
    where: { kebijakan_id },
    transaction,
  });

  const programRowIds = programs.map((p) => p.id);

  const cacheRows = await RenstraPaguCache.findAll({
    where: {
      renstra_id,
      stage: 'program',
      ref_id: programRowIds,
    },
    transaction,
  });

  const pagu = sumPagu(cacheRows);

  await upsertCache({
    renstra_id,
    stage: 'kebijakan',
    ref_id: kebijakan.id,
    pagu,
    transaction,
  });

  return {
    renstra_id,
    kebijakan_id: kebijakan.kebijakan_id,
    kebijakan_row_id: kebijakan.id,
    strategi_id: kebijakan.strategi_id || null,
  };
};

// ======================================================
// STRATEGI
// sumber: cache kebijakan
// cache: stage = strategi, ref_id = RenstraTabelStrategi.id
// ======================================================
const syncStrategi = async ({ renstra_id, strategi_id, transaction }) => {
  if (!renstra_id || !strategi_id) return null;

  const strategi = await RenstraTabelStrategi.findOne({
    where: { strategi_id },
    transaction,
  });

  if (!strategi) return null;

  const kebijakanList = await RenstraTabelArahKebijakan.findAll({
    where: { strategi_id },
    transaction,
  });

  const kebijakanRowIds = kebijakanList.map((k) => k.id);

  const cacheRows = await RenstraPaguCache.findAll({
    where: {
      renstra_id,
      stage: 'kebijakan',
      ref_id: kebijakanRowIds,
    },
    transaction,
  });

  const pagu = sumPagu(cacheRows);

  await upsertCache({
    renstra_id,
    stage: 'strategi',
    ref_id: strategi.id,
    pagu,
    transaction,
  });

  return {
    renstra_id,
    strategi_id: strategi.strategi_id,
    strategi_row_id: strategi.id,
    sasaran_id: strategi.sasaran_id || null,
  };
};

// ======================================================
// SASARAN
// sumber: cache strategi
// cache: stage = sasaran, ref_id = RenstraTabelSasaran.id
// ======================================================
const syncSasaran = async ({ renstra_id, sasaran_id, transaction }) => {
  if (!renstra_id || !sasaran_id) return null;

  const sasaran = await RenstraTabelSasaran.findOne({
    where: { sasaran_id },
    transaction,
  });

  if (!sasaran) return null;

  const strategiList = await RenstraTabelStrategi.findAll({
    where: { sasaran_id },
    transaction,
  });

  const strategiRowIds = strategiList.map((s) => s.id);

  const cacheRows = await RenstraPaguCache.findAll({
    where: {
      renstra_id,
      stage: 'strategi',
      ref_id: strategiRowIds,
    },
    transaction,
  });

  const pagu = sumPagu(cacheRows);

  await upsertCache({
    renstra_id,
    stage: 'sasaran',
    ref_id: sasaran.id,
    pagu,
    transaction,
  });

  return {
    renstra_id,
    sasaran_id: sasaran.sasaran_id,
    sasaran_row_id: sasaran.id,
    tujuan_id: sasaran.tujuan_id || null,
  };
};

// ======================================================
// TUJUAN
// sumber: cache sasaran
// cache: stage = tujuan, ref_id = RenstraTabelTujuan.id
// ======================================================
const syncTujuan = async ({ renstra_id, tujuan_id, transaction }) => {
  if (!renstra_id || !tujuan_id) return null;

  const tujuan = await RenstraTabelTujuan.findOne({
    where: { tujuan_id },
    transaction,
  });

  if (!tujuan) return null;

  const sasaranList = await RenstraTabelSasaran.findAll({
    where: { tujuan_id },
    transaction,
  });

  const sasaranRowIds = sasaranList.map((s) => s.id);

  const cacheRows = await RenstraPaguCache.findAll({
    where: {
      renstra_id,
      stage: 'sasaran',
      ref_id: sasaranRowIds,
    },
    transaction,
  });

  const pagu = sumPagu(cacheRows);

  await upsertCache({
    renstra_id,
    stage: 'tujuan',
    ref_id: tujuan.id,
    pagu,
    transaction,
  });

  return {
    renstra_id,
    tujuan_id: tujuan.tujuan_id,
    tujuan_row_id: tujuan.id,
  };
};

// ======================================================
// ENTRY POINT
// dipanggil setelah SubKegiatan create/update/delete
// ======================================================
const syncFromSubKegiatan = async ({ subkegiatan, transaction }) => {
  const data = subkegiatan?.toJSON ? subkegiatan.toJSON() : subkegiatan;

  if (!data?.kegiatan_id) return null;

  const kegiatan = await syncKegiatan({
    kegiatan_id: data.kegiatan_id,
    transaction,
  });

  if (!kegiatan) return null;

  const program = await syncProgram({
    renstra_id: kegiatan.renstra_id,
    program_id: kegiatan.program_id,
    transaction,
  });

  if (!program) return kegiatan;

  const kebijakan = await syncKebijakan({
    renstra_id: program.renstra_id,
    kebijakan_id: program.kebijakan_id,
    transaction,
  });

  if (!kebijakan) return program;

  const strategi = await syncStrategi({
    renstra_id: kebijakan.renstra_id,
    strategi_id: kebijakan.strategi_id,
    transaction,
  });

  if (!strategi) return kebijakan;

  const sasaran = await syncSasaran({
    renstra_id: strategi.renstra_id,
    sasaran_id: strategi.sasaran_id,
    transaction,
  });

  if (!sasaran) return strategi;

  const tujuan = await syncTujuan({
    renstra_id: sasaran.renstra_id,
    tujuan_id: sasaran.tujuan_id,
    transaction,
  });

  return tujuan;
};

module.exports = {
  syncFromSubKegiatan,
  syncKegiatan,
  syncProgram,
  syncKebijakan,
  syncStrategi,
  syncSasaran,
  syncTujuan,
};
