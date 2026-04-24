// backend/utils/autoCloneArahKebijakanIfNeeded.js

const { ArahKebijakan, Strategi } = require("../models");
const { getPeriodeFromTahun } = require("./periodeHelper");
const redisClient = require("./redisClient");
const { safeGet, safeSetEx } = require("./safeRedis");

async function autoCloneArahKebijakanIfNeeded({ jenis_dokumen, tahun }) {
  if (!jenis_dokumen || !tahun) return;

  const normalizedTahun = String(tahun);
  const periode = await getPeriodeFromTahun(normalizedTahun);
  if (!periode) return;
  const periode_id = periode.id;

  const redisKey = `arahkan:cloned:${jenis_dokumen}:${normalizedTahun}`;
  if (await safeGet(redisClient, redisKey)) {
    console.log("Skip cloning Arah Kebijakan, data sudah pernah diclone.");
    return;
  }

  const targetStrategi = await Strategi.findAll({
    where: { jenis_dokumen, tahun: normalizedTahun, periode_id },
    attributes: ["id", "kode_strategi"],
    raw: true,
  });

  if (!targetStrategi.length) {
    await safeSetEx(redisClient, redisKey, 86400, "1");
    return;
  }

  const targetStrategiByKode = new Map(
    targetStrategi.map((item) => [item.kode_strategi, item.id])
  );

  const sourceStrategi = await Strategi.findAll({
    where: { jenis_dokumen: "rpjmd", tahun: normalizedTahun },
    attributes: ["id", "kode_strategi"],
    raw: true,
  });

  const sourceToTargetStrategi = new Map();
  for (const item of sourceStrategi) {
    const targetId = targetStrategiByKode.get(item.kode_strategi);
    if (targetId) {
      sourceToTargetStrategi.set(item.id, targetId);
    }
  }

  if (!sourceToTargetStrategi.size) {
    await safeSetEx(redisClient, redisKey, 86400, "1");
    return;
  }

  const existing = await ArahKebijakan.findAll({
    where: {
      strategi_id: Array.from(new Set(sourceToTargetStrategi.values())),
      jenis_dokumen,
      tahun: normalizedTahun,
      periode_id,
    },
    attributes: ["strategi_id", "kode_arah"],
    raw: true,
  });

  const existingKeys = new Set(
    existing.map((item) => `${item.strategi_id}:${item.kode_arah}`)
  );

  const sourceArah = await ArahKebijakan.findAll({
    where: {
      strategi_id: Array.from(sourceToTargetStrategi.keys()),
      jenis_dokumen: "rpjmd",
      tahun: normalizedTahun,
    },
    attributes: ["strategi_id", "kode_arah", "deskripsi"],
    order: [["kode_arah", "ASC"]],
    raw: true,
  });

  const toCreate = sourceArah
    .map((item) => {
      const targetStrategiId = sourceToTargetStrategi.get(item.strategi_id);
      if (!targetStrategiId) return null;

      const key = `${targetStrategiId}:${item.kode_arah}`;
      if (existingKeys.has(key)) return null;

      existingKeys.add(key);
      return {
        strategi_id: targetStrategiId,
        kode_arah: item.kode_arah,
        deskripsi: item.deskripsi,
        jenis_dokumen,
        tahun: normalizedTahun,
        periode_id,
        created_at: new Date(),
        updated_at: new Date(),
      };
    })
    .filter(Boolean);

  if (toCreate.length) {
    await ArahKebijakan.bulkCreate(toCreate, {
      ignoreDuplicates: true,
    });
  }

  console.log(`Total arah kebijakan berhasil diclone: ${toCreate.length}`);
  await safeSetEx(redisClient, redisKey, 86400, "1");
}

module.exports = { autoCloneArahKebijakanIfNeeded };
