// backend/utils/autoCloneProgramsIfNeeded.js

const { Program, Strategi, Sasaran } = require("../models");
const { getPeriodeFromTahun } = require("./periodeHelper");
const redisClient = require("../utils/redisClient");
const { safeGet, safeSetEx } = require("../utils/safeRedis");

const BATCH_SIZE = 200;

async function autoCloneProgramsIfNeeded({ jenis_dokumen, tahun }) {
  if (!jenis_dokumen || !tahun) return;

  const normalizedTahun = String(tahun);
  const periode = await getPeriodeFromTahun(normalizedTahun);
  const periode_id = periode?.id;
  if (!periode_id) return;

  const cacheKey = `program:cloned:${periode_id}:${jenis_dokumen}:${normalizedTahun}`;
  if (await safeGet(redisClient, cacheKey)) {
    console.info(`[CACHE] Skip clone Program: ${cacheKey}`);
    return;
  }

  const targetStrategi = await Strategi.findAll({
    where: { jenis_dokumen, tahun: normalizedTahun, periode_id },
    attributes: ["id", "kode_strategi"],
    raw: true,
  });

  const targetStrategiByKode = new Map(
    targetStrategi.map((item) => [item.kode_strategi, item.id])
  );
  if (!targetStrategiByKode.size) {
    console.warn("No strategi RKPD for clone Program");
    return;
  }

  const targetSasaran = await Sasaran.findAll({
    where: { jenis_dokumen, tahun: normalizedTahun, periode_id },
    attributes: ["id", "rpjmd_id"],
    raw: true,
  });

  const targetSasaranBySourceId = new Map(
    targetSasaran
      .filter((item) => item.rpjmd_id)
      .map((item) => [item.rpjmd_id, item.id])
  );
  if (!targetSasaranBySourceId.size) {
    console.warn("No sasaran RKPD mapping for clone Program");
    return;
  }

  const mapStrategyByKodeProgram = new Map();
  const toCreate = [];
  let progOffset = 0;

  while (true) {
    const progBatch = await Program.findAll({
      where: { jenis_dokumen: "rpjmd", tahun: normalizedTahun },
      include: [
        {
          model: Strategi,
          as: "Strategi",
          attributes: ["id", "kode_strategi"],
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

    for (const item of progBatch) {
      const targetSasaranId = targetSasaranBySourceId.get(item.sasaran_id);
      if (!targetSasaranId) continue;

      const targetStrategiIds = item.Strategi.map((strategi) =>
        targetStrategiByKode.get(strategi.kode_strategi)
      ).filter(Boolean);

      toCreate.push({
        sasaran_id: targetSasaranId,
        kode_program: item.kode_program,
        nama_program: item.nama_program,
        pagu_anggaran: item.pagu_anggaran,
        rpjmd_id: item.rpjmd_id ?? item.id,
        prioritas: item.prioritas,
        opd_penanggung_jawab: item.opd_penanggung_jawab,
        bidang_opd_penanggung_jawab: item.bidang_opd_penanggung_jawab,
        tahun: Number(normalizedTahun) || normalizedTahun,
        periode_id,
        jenis_dokumen,
        created_at: new Date(),
        updated_at: new Date(),
      });
      mapStrategyByKodeProgram.set(item.kode_program, targetStrategiIds);
    }

    progOffset += progBatch.length;
  }

  if (!toCreate.length) {
    console.warn("No Program to create");
    await safeSetEx(redisClient, cacheKey, 86400, "1");
    return;
  }

  const kodeList = Array.from(new Set(toCreate.map((item) => item.kode_program)));
  const existing = await Program.findAll({
    where: { periode_id, jenis_dokumen, kode_program: kodeList },
    attributes: ["kode_program"],
    raw: true,
  });

  const existSet = new Set(existing.map((item) => item.kode_program));
  const filtered = toCreate.filter((item) => !existSet.has(item.kode_program));
  if (!filtered.length) {
    console.warn("Semua program sudah ada");
    await safeSetEx(redisClient, cacheKey, 86400, "1");
    return;
  }

  for (let i = 0; i < filtered.length; i += BATCH_SIZE) {
    const batch = filtered.slice(i, i + BATCH_SIZE);
    const created = await Program.bulkCreate(batch, {
      ignoreDuplicates: true,
      returning: true,
    });

    for (const item of created) {
      const strategiIds = mapStrategyByKodeProgram.get(item.kode_program) || [];
      if (strategiIds.length) {
        await item.setStrategi(strategiIds);
      }
    }

    console.info(`Cloned Program batch: ${created.length}`);
  }

  await safeSetEx(redisClient, cacheKey, 86400, "1");
  console.info(`All Program clone done for ${jenis_dokumen} ${normalizedTahun}`);
}

module.exports = { autoCloneProgramsIfNeeded };
