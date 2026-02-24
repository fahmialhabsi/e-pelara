// backend/utils/autoCloneTujuanIfNeeded.js

const { Tujuan } = require("../models");
const { getPeriodeFromTahun, clearPeriodeCache } = require("./periodeHelper");
const redisClient = require("./redisClient");
const { safeGet, safeSetEx } = require("./safeRedis");

const BATCH_SIZE = 100;

async function autoCloneTujuanIfNeeded({ jenis_dokumen, tahun }) {
  if (!jenis_dokumen || !tahun) {
    console.warn("⚠️ Parameter jenis_dokumen dan tahun wajib diisi.");
    return;
  }

  const periode = await getPeriodeFromTahun(tahun);
  const periode_id = periode?.id;
  if (!periode_id) {
    console.warn("⚠️ Tidak ditemukan periode untuk tahun:", tahun);
    return;
  }

  const cacheKey = `tujuan:cloned:${periode_id}:${jenis_dokumen}:${tahun}`;
  const isCloned = await safeGet(redisClient, cacheKey);
  if (isCloned) {
    console.log(`🧊 Clone Tujuan dilewati untuk ${cacheKey} (sudah pernah).`);
    return;
  }

  const sudahAda = await Tujuan.count({
    where: { jenis_dokumen, tahun, periode_id },
  });

  if (sudahAda > 0) {
    console.log(
      `✅ Data Tujuan untuk ${jenis_dokumen.toUpperCase()} tahun ${tahun} sudah ada. Skip cloning.`
    );
    await safeSetEx(redisClient, cacheKey, 86400, "1");
    clearPeriodeCache(tahun);
    return;
  }

  const dataAsal = await getTujuanRpjmd({ tahun, periode_id });
  if (!dataAsal.length) {
    console.log("⚠️ Tidak ada data Tujuan dari RPJMD untuk di-clone.");
    await safeSetEx(redisClient, cacheKey, 86400, "1");
    clearPeriodeCache(tahun);
    return;
  }

  const cloned = await cloneTujuan(dataAsal, jenis_dokumen);
  console.log(`✅ Tujuan berhasil di-clone sebanyak: ${cloned.length}`);

  const total = await Tujuan.count({
    where: { periode_id, jenis_dokumen, tahun },
  });
  console.log(
    `📦 Total Tujuan ${jenis_dokumen.toUpperCase()} setelah clone: ${total}`
  );

  await safeSetEx(redisClient, cacheKey, 86400, "1");
  clearPeriodeCache(tahun);
}

async function getTujuanRpjmd({ tahun, periode_id }) {
  return Tujuan.findAll({
    where: {
      jenis_dokumen: "rpjmd",
      tahun,
      periode_id,
    },
  });
}

async function cloneTujuan(dataAsal, jenis_dokumenTarget) {
  try {
    const dataClone = dataAsal.map((t) => ({
      misi_id: t.misi_id,
      isi_tujuan: t.isi_tujuan,
      tahun: t.tahun,
      periode_id: t.periode_id,
      rpjmd_id: t.rpjmd_id,
      no_tujuan: t.no_tujuan,
      jenis_dokumen: jenis_dokumenTarget,
      created_at: new Date(),
      updated_at: new Date(),
    }));

    const result = [];
    for (let i = 0; i < dataClone.length; i += BATCH_SIZE) {
      const batch = dataClone.slice(i, i + BATCH_SIZE);
      const inserted = await Tujuan.bulkCreate(batch, {
        ignoreDuplicates: true,
      });
      result.push(...inserted);
    }

    return result;
  } catch (err) {
    console.error("❌ Gagal melakukan clone Tujuan:", err);
    return [];
  }
}

module.exports = { autoCloneTujuanIfNeeded };
