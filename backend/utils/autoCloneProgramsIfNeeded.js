// backend/utils/autoCloneProgramsIfNeeded.js

const { Program, Strategi, Sasaran } = require("../models");
const { getPeriodeFromTahun } = require("./periodeHelper");
const redisClient = require("../utils/redisClient");
const { safeGet, safeSetEx } = require("../utils/safeRedis");

const BATCH_SIZE = 200;

async function autoCloneProgramsIfNeeded({ jenis_dokumen, tahun }) {
  if (!jenis_dokumen || !tahun) return;
  const periode = await getPeriodeFromTahun(tahun);
  const periode_id = periode?.id;
  if (!periode_id) return;

  const cacheKey = `program:cloned:${periode_id}:${jenis_dokumen}:${tahun}`;
  if (await safeGet(redisClient, cacheKey)) {
    console.info(`🧠 [CACHE] Skip clone Program: ${cacheKey}`);
    return;
  }

  const strategiIds = new Set();
  let stratOffset = 0;
  while (true) {
    const batch = await Strategi.findAll({
      where: { jenis_dokumen, tahun, periode_id },
      attributes: ["id"],
      raw: true,
      limit: BATCH_SIZE,
      offset: stratOffset,
    });
    if (!batch.length) break;
    batch.forEach((s) => strategiIds.add(s.id));
    stratOffset += batch.length;
  }
  if (!strategiIds.size) {
    console.warn("⚠️ No strategi for clone Program");
    return;
  }

  const mapStrategyByKode = new Map();
  const toCreate = [];
  let progOffset = 0;

  while (true) {
    const progBatch = await Program.findAll({
      where: { jenis_dokumen: "rpjmd", tahun, periode_id },
      include: [
        {
          model: Strategi,
          as: "Strategi",
          attributes: ["id"],
          through: { attributes: [] },
        },
      ],
      attributes: [
        "id",
        "sasaran_id",
        "kode_program",
        "nama_program",
        "pagu_anggaran",
        "rpjmd_id",
        "prioritas",
        "opd_penanggung_jawab",
        "bidang_opd_penanggung_jawab",
      ],
      limit: BATCH_SIZE,
      offset: progOffset,
      nest: true,
      raw: false,
    });
    if (!progBatch.length) break;

    for (const p of progBatch) {
      const matches = p.Strategi.filter((s) => strategiIds.has(s.id)).map(
        (s) => s.id
      );
      if (!matches.length) continue;
      toCreate.push({
        sasaran_id: p.sasaran_id,
        kode_program: p.kode_program,
        nama_program: p.nama_program,
        pagu_anggaran: p.pagu_anggaran,
        rpjmd_id: p.rpjmd_id,
        prioritas: p.prioritas,
        opd_penanggung_jawab: p.opd_penanggung_jawab,
        bidang_opd_penanggung_jawab: p.bidang_opd_penanggung_jawab,
        tahun,
        periode_id,
        jenis_dokumen,
        created_at: new Date(),
        updated_at: new Date(),
      });
      mapStrategyByKode.set(p.kode_program, matches);
    }

    progOffset += progBatch.length;
  }
  if (!toCreate.length) {
    console.warn("⚠️ No Program to create");
    await safeSetEx(redisClient, cacheKey, 86400, "1");
    return;
  }

  // filter existing kode_program via limited fetch to prevent duplicates
  const kodeList = Array.from(new Set(toCreate.map((p) => p.kode_program)));
  const existing = await Program.findAll({
    where: { periode_id, jenis_dokumen, kode_program: kodeList },
    attributes: ["kode_program"],
    raw: true,
  });
  const existSet = new Set(existing.map((e) => e.kode_program));
  const filtered = toCreate.filter((p) => !existSet.has(p.kode_program));
  if (!filtered.length) {
    console.warn("⚠️ Semua program sudah ada");
    await safeSetEx(redisClient, cacheKey, 86400, "1");
    return;
  }

  // batch insert dan set relasi
  for (let i = 0; i < filtered.length; i += BATCH_SIZE) {
    const batch = filtered.slice(i, i + BATCH_SIZE);
    const created = await Program.bulkCreate(batch, {
      ignoreDuplicates: true,
      returning: true,
    });
    for (const cp of created) {
      const stratIds = mapStrategyByKode.get(cp.kode_program) || [];
      if (stratIds.length) await cp.setStrategi(stratIds);
    }
    console.info(`✅ Cloned Program batch: ${created.length}`);
  }

  await safeSetEx(redisClient, cacheKey, 86400, "1");
  console.info(`✅ All Program clone done for ${jenis_dokumen} ${tahun}`);
}

module.exports = { autoCloneProgramsIfNeeded };
