const { PrioritasNasional } = require("../models");
const { getPeriodeIdFromTahun } = require("./periodeHelper");
const redisClient = require("./redisClient");
const { safeGet, safeSetEx } = require("./safeRedis");

const BATCH_FETCH = 1000;
const BATCH_INSERT = 500;

async function autoClonePrioritasNasionalIfNeeded({ jenis_dokumen, tahun }) {
  if (!jenis_dokumen || !tahun) return;

  const periode_id = await getPeriodeIdFromTahun(tahun);
  if (!periode_id) return;

  const cacheKey = `prioritas_nasional:cloned:${periode_id}:${jenis_dokumen}:${tahun}`;
  if (await safeGet(redisClient, cacheKey)) {
    console.log("Clone Prioritas Nasional skipped (cached)");
    return;
  }

  const exists = await PrioritasNasional.count({
    where: { jenis_dokumen, tahun, periode_id },
  });
  if (exists > 0) {
    console.log("Prioritas Nasional exists, skipping.");
    await safeSetEx(redisClient, cacheKey, 86400, "1");
    return;
  }

  let offset = 0;
  let total = 0;

  while (true) {
    const batch = await PrioritasNasional.findAll({
      where: { jenis_dokumen: "rpjmd", tahun, periode_id },
      limit: BATCH_FETCH,
      offset,
      raw: true,
    });
    if (!batch.length) break;

    const clones = batch.map((item) => {
      const obj = { ...item };
      delete obj.id;
      obj.jenis_dokumen = jenis_dokumen;
      obj.created_at = new Date();
      obj.updated_at = new Date();
      return obj;
    });

    for (let i = 0; i < clones.length; i += BATCH_INSERT) {
      await PrioritasNasional.bulkCreate(clones.slice(i, i + BATCH_INSERT), {
        ignoreDuplicates: true,
      });
    }

    total += clones.length;
    offset += BATCH_FETCH;
  }

  await safeSetEx(redisClient, cacheKey, 86400, "1");
  console.log(`Cloned Prioritas Nasional: ${total} items`);
}

module.exports = { autoClonePrioritasNasionalIfNeeded };
