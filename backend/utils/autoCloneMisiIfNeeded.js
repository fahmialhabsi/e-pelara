const { Misi } = require("../models");
const { getPeriodeFromTahun, clearPeriodeCache } = require("./periodeHelper");
const redisClient = require("./redisClient");
const { safeGet, safeSetEx } = require("./safeRedis");

const BATCH_SIZE = 100;

async function autoCloneMisiIfNeeded({ jenis_dokumen, tahun }) {
  const normalizedDokumen = String(jenis_dokumen || "").toLowerCase();
  const normalizedTahun = String(tahun || "").trim();

  if (!normalizedDokumen || !normalizedTahun || normalizedDokumen === "rpjmd") {
    return;
  }

  const periode = await getPeriodeFromTahun(normalizedTahun);
  const periode_id = periode?.id;
  if (!periode_id) {
    console.warn("Tidak ditemukan periode untuk clone Misi tahun:", tahun);
    return;
  }

  const cacheKey = `misi:cloned:${periode_id}:${normalizedDokumen}:${normalizedTahun}`;
  const isCloned = await safeGet(redisClient, cacheKey);
  if (isCloned) {
    return;
  }

  const sourceRows = await Misi.findAll({
    where: {
      jenis_dokumen: "rpjmd",
      tahun: normalizedTahun,
    },
    order: [["no_misi", "ASC"]],
  });

  if (!sourceRows.length) {
    await safeSetEx(redisClient, cacheKey, 86400, "1");
    clearPeriodeCache(normalizedTahun);
    return;
  }

  const existingRows = await Misi.findAll({
    where: {
      jenis_dokumen: normalizedDokumen,
      tahun: normalizedTahun,
      periode_id,
    },
    attributes: ["visi_id", "no_misi"],
    raw: true,
  });

  const existingKeys = new Set(
    existingRows.map((item) => `${item.visi_id}:${item.no_misi}`)
  );

  const rowsToClone = sourceRows.filter(
    (item) => !existingKeys.has(`${item.visi_id}:${item.no_misi}`)
  );

  for (let i = 0; i < rowsToClone.length; i += BATCH_SIZE) {
    const batch = rowsToClone.slice(i, i + BATCH_SIZE).map((item) => ({
      visi_id: item.visi_id,
      isi_misi: item.isi_misi,
      no_misi: item.no_misi,
      deskripsi: item.deskripsi,
      rpjmd_id: item.rpjmd_id ?? item.id,
      periode_id,
      jenis_dokumen: normalizedDokumen,
      tahun: normalizedTahun,
      created_at: new Date(),
      updated_at: new Date(),
    }));

    await Misi.bulkCreate(batch, {
      ignoreDuplicates: true,
    });
  }

  await safeSetEx(redisClient, cacheKey, 86400, "1");
  clearPeriodeCache(normalizedTahun);
}

module.exports = { autoCloneMisiIfNeeded };
