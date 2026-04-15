const { PrioritasDaerah } = require("../models");
const { getPeriodeIdFromTahun } = require("./periodeHelper");
const redisClient = require("./redisClient");
const { safeGet, safeSetEx } = require("./safeRedis");

const BATCH_SIZE = 1000;

async function autoClonePrioritasDaerahIfNeeded({ tahun, jenis_dokumen }) {
  if (!tahun || !jenis_dokumen) return;

  const periode_id = await getPeriodeIdFromTahun(tahun);
  if (!periode_id) {
    console.warn("Periode tidak ditemukan untuk tahun:", tahun);
    return;
  }

  const cacheKey = `prioritas_daerah:cloned:${periode_id}:${jenis_dokumen}:${tahun}`;
  const isCloned = await safeGet(redisClient, cacheKey);
  if (isCloned) {
    console.log("Clone Prioritas Daerah dilewati (cached)");
    return;
  }

  const existing = await PrioritasDaerah.count({
    where: { tahun, jenis_dokumen, periode_id },
  });

  if (existing > 0) {
    console.log("Prioritas Daerah sudah ada, skip cloning.");
    await safeSetEx(redisClient, cacheKey, 86400, "1");
    return;
  }

  let offset = 0;
  let totalCloned = 0;

  while (true) {
    const batch = await PrioritasDaerah.findAll({
      where: {
        tahun,
        periode_id,
        jenis_dokumen: "rpjmd",
      },
      limit: BATCH_SIZE,
      offset,
      raw: true,
    });

    if (!batch.length) break;

    const clones = batch.map((item) => ({
      ...item,
      id: undefined,
      jenis_dokumen,
      created_at: new Date(),
      updated_at: new Date(),
    }));

    for (let i = 0; i < clones.length; i += 500) {
      const chunk = clones.slice(i, i + 500);
      await PrioritasDaerah.bulkCreate(chunk, { ignoreDuplicates: true });
    }

    totalCloned += clones.length;
    offset += BATCH_SIZE;
  }

  await safeSetEx(redisClient, cacheKey, 86400, "1");
  console.log(`Prioritas Daerah berhasil diclone: ${totalCloned}`);
}

module.exports = { autoClonePrioritasDaerahIfNeeded };
