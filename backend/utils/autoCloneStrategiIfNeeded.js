// backend/utils/autoCloneStrategiIfNeeded.js
const redisClient = require("./redisClient");
const { safeGet, safeSet } = require("./safeRedis");
const { Strategi, Sasaran } = require("../models");
const { getPeriodeFromTahun } = require("./periodeHelper");

async function autoCloneStrategiIfNeeded({
  jenis_dokumen,
  tahun,
  sasaran_id,
  jenis_dokumen_sumber = "rpjmd",
}) {
  if (!jenis_dokumen || !tahun) {
    console.log(
      "[Clone Strategi] jenis_dokumen atau tahun tidak diisi, proses dibatalkan."
    );
    return;
  }

  const normalizedTahun = String(tahun);
  const periode = await getPeriodeFromTahun(normalizedTahun);
  if (!periode) {
    console.log(
      `[Clone Strategi] Periode untuk tahun ${normalizedTahun} tidak ditemukan, proses dibatalkan.`
    );
    return;
  }
  const periode_id = periode.id;

  const redisKey = `cloned:strategi:${periode_id}:${jenis_dokumen}:${normalizedTahun}${
    sasaran_id ? `:${sasaran_id}` : ""
  }`;
  const lockKey = `${redisKey}:lock`;

  if (await safeGet(redisClient, redisKey)) {
    console.log("[CACHE] Clone Strategi sudah dijalankan sebelumnya.");
    return;
  }

  if (await safeGet(redisClient, lockKey)) {
    console.log("[LOCK] Proses clone Strategi sedang berjalan, skip eksekusi.");
    return;
  }

  await safeSet(redisClient, lockKey, "true", { EX: 30 });

  try {
    const daftarSasaran = await Sasaran.findAll({
      where: {
        jenis_dokumen,
        tahun: normalizedTahun,
        periode_id,
        ...(sasaran_id ? { id: sasaran_id } : {}),
      },
      attributes: ["id", "nomor", "rpjmd_id"],
    });

    if (!daftarSasaran.length) {
      console.log("Tidak ada sasaran ditemukan, tidak ada strategi yang diclone.");
      return;
    }

    let strategiCloned = 0;

    for (const sasaran of daftarSasaran) {
      const strategiExist = await Strategi.count({
        where: {
          sasaran_id: sasaran.id,
          jenis_dokumen,
          tahun: normalizedTahun,
          periode_id,
        },
      });

      if (strategiExist > 0) {
        continue;
      }

      let sasaranSumberId = sasaran.rpjmd_id;

      if (!sasaranSumberId) {
        const sasaranSumber = await Sasaran.findOne({
          where: {
            nomor: sasaran.nomor,
            jenis_dokumen: jenis_dokumen_sumber,
            tahun: normalizedTahun,
          },
          attributes: ["id"],
          order: [["id", "ASC"]],
        });

        sasaranSumberId = sasaranSumber?.id;
      }

      if (!sasaranSumberId) {
        console.log(
          `Tidak ditemukan sasaran sumber untuk sasaran_id=${sasaran.id}, skip.`
        );
        continue;
      }

      const strategiSumber = await Strategi.findAll({
        where: {
          sasaran_id: sasaranSumberId,
          jenis_dokumen: jenis_dokumen_sumber,
          tahun: normalizedTahun,
        },
        order: [["kode_strategi", "ASC"]],
      });

      if (!strategiSumber.length) {
        console.log(
          `Tidak ada strategi sumber untuk sasaran_id=${sasaran.id}, skip.`
        );
        continue;
      }

      for (const item of strategiSumber) {
        await Strategi.create({
          sasaran_id: sasaran.id,
          kode_strategi: item.kode_strategi,
          deskripsi: item.deskripsi,
          jenis_dokumen,
          tahun: normalizedTahun,
          periode_id,
        });
        strategiCloned += 1;
      }
    }

    console.log(`[CLONE] Strategi berhasil ditambahkan: +${strategiCloned}`);
    await safeSet(redisClient, redisKey, "true", { EX: 3600 });
  } catch (err) {
    console.error("[Clone Strategi] Terjadi kesalahan:", err);
  } finally {
    redisClient.del(lockKey);
  }
}

module.exports = { autoCloneStrategiIfNeeded };
