const redisClient = require("./redisClient");
const { safeGet, safeSet } = require("./safeRedis");

const { autoCloneMisiIfNeeded } = require("./autoCloneMisiIfNeeded");
const { autoCloneTujuanIfNeeded } = require("./autoCloneTujuanIfNeeded");
const { autoCloneSasaranIfNeeded } = require("./autoCloneSasaranIfNeeded");
const { autoCloneStrategiIfNeeded } = require("./autoCloneStrategiIfNeeded");
const {
  autoCloneArahKebijakanIfNeeded,
} = require("./autoCloneArahKebijakanIfNeeded");
const { autoCloneProgramsIfNeeded } = require("./autoCloneProgramsIfNeeded");
const { autoCloneKegiatanIfNeeded } = require("./autoCloneKegiatanIfNeeded");
const {
  autoCloneSubKegiatanIfNeeded,
} = require("./autoCloneSubKegiatanIfNeeded");
const { autoCloneIndikatorIfNeeded } = require("./autoCloneIndikatorIfNeeded");
const {
  autoClonePrioritasDaerahIfNeeded,
} = require("./autoClonePrioritasDaerahIfNeeded");
const {
  autoClonePrioritasKepalaDaerahIfNeeded,
} = require("./autoClonePrioritasKepalaDaerahIfNeeded");
const {
  autoClonePrioritasNasionalIfNeeded,
} = require("./autoClonePrioritasNasionalIfNeeded");

async function ensureClonedOnce(jenis_dokumen, tahun) {
  if (!jenis_dokumen || !tahun) return;

  const redisKey = `cloned:semua:${jenis_dokumen}:${tahun}`;
  const isCloned = await safeGet(redisClient, redisKey);

  if (isCloned) {
    console.log("Semua proses clone dilewati karena sudah dilakukan sebelumnya");
    return;
  }

  console.log("Menjalankan proses clone berurutan...");

  try {
    await autoCloneMisiIfNeeded({ jenis_dokumen, tahun });
    await autoCloneTujuanIfNeeded({ jenis_dokumen, tahun });
    await autoCloneSasaranIfNeeded({ jenis_dokumen, tahun });
    await autoCloneStrategiIfNeeded({ jenis_dokumen, tahun });
    await autoCloneArahKebijakanIfNeeded({ jenis_dokumen, tahun });
    await autoCloneProgramsIfNeeded({ jenis_dokumen, tahun });
    await autoCloneKegiatanIfNeeded({ jenis_dokumen, tahun });
    await autoCloneSubKegiatanIfNeeded({ jenis_dokumen, tahun });
    await autoCloneIndikatorIfNeeded({ jenis_dokumen, tahun });
    await autoClonePrioritasDaerahIfNeeded({ jenis_dokumen, tahun });
    await autoClonePrioritasKepalaDaerahIfNeeded({ jenis_dokumen, tahun });
    await autoClonePrioritasNasionalIfNeeded({ jenis_dokumen, tahun });

    await safeSet(redisClient, redisKey, "true", { EX: 3600 });
    console.log("Semua proses clone selesai (jika perlu)");
  } catch (err) {
    console.error("Terjadi kesalahan saat menjalankan autoClone:", err);
    throw err;
  }
}

module.exports = { ensureClonedOnce };
