const { PrioritasGubernur } = require("../models");
const { getPeriodeIdFromTahun } = require("./periodeHelper");
const redisClient = require("./redisClient");
const { safeGet, safeSetEx } = require("./safeRedis");

const BATCH_FETCH = 1000;
const BATCH_INSERT = 500;

async function autoClonePrioritasKepalaDaerahIfNeeded({
  jenis_dokumen,
  tahun,
}) {
  if (!jenis_dokumen || !tahun) return;

  const periode_id = await getPeriodeIdFromTahun(tahun);
  if (!periode_id) {
    console.warn("Periode tidak ditemukan untuk tahun:", tahun);
    return;
  }

  const cacheKey = `prioritas_kepala_daerah:cloned:${periode_id}:${jenis_dokumen}:${tahun}`;
  if (await safeGet(redisClient, cacheKey)) {
    console.log("Clone Prioritas Kepala Daerah dilewati (cached)");
    return;
  }

  const existing = await PrioritasGubernur.count({
    where: { jenis_dokumen, tahun, periode_id },
  });
  if (existing > 0) {
    console.log("Prioritas Kepala Daerah sudah ada, skip clone.");
    await safeSetEx(redisClient, cacheKey, 86400, "1");
    return;
  }

  let offset = 0;
  let totalCloned = 0;
  while (true) {
    const batch = await PrioritasGubernur.findAll({
      where: { tahun, periode_id, jenis_dokumen: "rpjmd" },
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
      const chunk = clones.slice(i, i + BATCH_INSERT);
      await PrioritasGubernur.bulkCreate(chunk, { ignoreDuplicates: true });
    }

    totalCloned += clones.length;
    offset += BATCH_FETCH;
  }

  await safeSetEx(redisClient, cacheKey, 86400, "1");
  console.log(`Prioritas Kepala Daerah cloned: ${totalCloned} items`);
}

module.exports = { autoClonePrioritasKepalaDaerahIfNeeded };
