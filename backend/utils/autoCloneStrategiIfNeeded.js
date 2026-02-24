// backend/utils/autoCloneStrategiIfNeeded.js
const redisClient = require("./redisClient");
const { safeGet, safeSet } = require("./safeRedis");
const { Strategi, Sasaran } = require("../models");
const { Op } = require("sequelize");
const { getPeriodeFromTahun } = require("./periodeHelper");

/**
 * Clone strategi dari dokumen sumber ke dokumen target jika belum ada.
 * @param {Object} params
 * @param {string} params.jenis_dokumen - Dokumen target (contoh: 'rkpd')
 * @param {string|number} params.tahun - Tahun target
 * @param {number} [params.sasaran_id] - Opsional, jika hanya ingin clone satu sasaran
 * @param {string} [params.jenis_dokumen_sumber] - Dokumen sumber (default: 'rpjmd')
 */
async function autoCloneStrategiIfNeeded({
  jenis_dokumen,
  tahun,
  sasaran_id,
  jenis_dokumen_sumber = "rpjmd",
}) {
  if (!jenis_dokumen || !tahun) {
    console.log(
      "⚠️ [Clone Strategi] jenis_dokumen atau tahun tidak diisi — proses dibatalkan."
    );
    return;
  }

  const periode = await getPeriodeFromTahun(tahun);
  if (!periode) {
    console.log(
      `⚠️ [Clone Strategi] Periode untuk tahun ${tahun} tidak ditemukan — proses dibatalkan.`
    );
    return;
  }
  const periode_id = periode.id;

  const redisKey = `cloned:strategi:${periode_id}:${jenis_dokumen}:${tahun}${
    sasaran_id ? `:${sasaran_id}` : ""
  }`;
  const lockKey = `${redisKey}:lock`;

  // Cek cache
  if (await safeGet(redisClient, redisKey)) {
    console.log("🧠 [CACHE] Clone Strategi sudah dijalankan sebelumnya.");
    return;
  }

  // Cek lock
  if (await safeGet(redisClient, lockKey)) {
    console.log(
      "🔒 [LOCK] Proses clone Strategi sedang berjalan — skip eksekusi."
    );
    return;
  }

  // Pasang lock selama 30 detik
  await safeSet(redisClient, lockKey, "true", { EX: 30 });

  try {
    console.log(
      `\x1b[36m[autoCloneStrategiIfNeeded] Mulai proses clone strategi → ${jenis_dokumen}\x1b[0m`
    );

    // Ambil daftar sasaran target
    const sasaranWhere = {
      jenis_dokumen,
      tahun,
      periode_id,
      ...(sasaran_id ? { id: sasaran_id } : {}),
    };
    const daftarSasaran = await Sasaran.findAll({ where: sasaranWhere });

    if (!daftarSasaran.length) {
      console.log(
        "⚠️ Tidak ada sasaran ditemukan — tidak ada strategi yang akan diclone."
      );
      return;
    }

    let strategiCloned = 0;
    for (const sasaran of daftarSasaran) {
      const strategiExist = await Strategi.count({
        where: {
          sasaran_id: sasaran.id,
          jenis_dokumen,
          tahun,
          periode_id,
        },
      });

      if (strategiExist === 0) {
        // Cari strategi dari dokumen sumber untuk sasaran yang punya tujuan & periode sama
        const sasaranSumber = await Sasaran.findOne({
          where: {
            tujuan_id: sasaran.tujuan_id,
            jenis_dokumen: jenis_dokumen_sumber,
            periode_id,
          },
        });

        if (!sasaranSumber) {
          console.log(
            `⚠️ Tidak ditemukan sasaran sumber untuk sasaran_id=${sasaran.id} — skip.`
          );
          continue;
        }

        const strategiSumber = await Strategi.findAll({
          where: {
            sasaran_id: sasaranSumber.id,
            jenis_dokumen: jenis_dokumen_sumber,
            periode_id,
          },
        });

        if (!strategiSumber.length) {
          console.log(
            `⚠️ Tidak ada strategi sumber untuk sasaran_id=${sasaran.id} — skip.`
          );
          continue;
        }

        for (const s of strategiSumber) {
          await Strategi.create({
            sasaran_id: sasaran.id,
            kode_strategi: s.kode_strategi,
            deskripsi: s.deskripsi,
            jenis_dokumen,
            tahun,
            periode_id,
          });
          strategiCloned++;
        }
      }
    }

    console.log(`📊 [CLONE] Strategi berhasil ditambahkan: +${strategiCloned}`);
    await safeSet(redisClient, redisKey, "true", { EX: 3600 });
  } catch (err) {
    console.error("❌ [Clone Strategi] Terjadi kesalahan:", err);
  } finally {
    redisClient.del(lockKey);
  }
}

module.exports = { autoCloneStrategiIfNeeded };
