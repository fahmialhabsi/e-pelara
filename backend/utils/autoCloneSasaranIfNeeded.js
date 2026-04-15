// backend/utils/autoCloneSasaranIfNeeded.js

const { Sasaran, Tujuan, Strategi, ArahKebijakan } = require("../models");
const { Op } = require("sequelize");
const { getPeriodeFromTahun } = require("./periodeHelper");
const { autoCloneTujuanIfNeeded } = require("./autoCloneTujuanIfNeeded");

const redisClient = require("./redisClient");
const { safeGet, safeSet } = require("./safeRedis");

const BATCH_SIZE = 100;
const REDIS_TTL = 60 * 60 * 24; // 24 jam
const LOCK_TTL = 60; // lock 1 menit

async function cloneSasaranBatch(sasaranToClone) {
  let totalCloned = 0;
  const insertedSasaran = [];
  const totalBatches = Math.ceil(sasaranToClone.length / BATCH_SIZE);

  for (let i = 0; i < totalBatches; i++) {
    const batch = sasaranToClone.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
    try {
      const result = await Sasaran.bulkCreate(batch, {
        ignoreDuplicates: true,
        returning: true,
      });
      insertedSasaran.push(...result.map((r) => r.toJSON()));
      totalCloned += result.length;
    } catch (err) {
      console.error(`❌ Error batch ${i + 1}: ${err.message}`);
    }
  }

  return { totalCloned, insertedSasaran };
}

async function cloneStrategiAndArah(
  insertedSasaran,
  jenis_dokumen,
  tahun,
  periode_id
) {
  let strategiCount = 0;
  let arahCount = 0;

  if (!insertedSasaran.length) return { strategiCount, arahCount };

  const rpjmdIds = insertedSasaran.map((s) => s.rpjmd_id).filter(Boolean);
  if (!rpjmdIds.length) return { strategiCount, arahCount };

  const strategiAsal = await Strategi.findAll({
    where: { sasaran_id: rpjmdIds, jenis_dokumen: "rpjmd", tahun },
    raw: true,
    order: [["kode_strategi", "ASC"]],
  });
  if (!strategiAsal.length) return { strategiCount, arahCount };

  const sasaranIdMap = new Map(insertedSasaran.map((s) => [s.rpjmd_id, s.id]));

  const strategiPairs = strategiAsal
    .map((st) => {
      const targetSasaranId = sasaranIdMap.get(st.sasaran_id);
      if (!targetSasaranId) return null;
      return {
        sourceId: st.id,
        payload: {
          sasaran_id: targetSasaranId,
          kode_strategi: st.kode_strategi,
          deskripsi: st.deskripsi,
          periode_id,
          jenis_dokumen,
          tahun,
          created_at: new Date(),
          updated_at: new Date(),
        },
      };
    })
    .filter(Boolean);

  const strategiBaru = await Strategi.bulkCreate(
    strategiPairs.map((item) => item.payload),
    {
      returning: true,
    }
  );
  strategiCount = strategiBaru.length;

  const strategiIdMap = new Map();
  strategiBaru.forEach((stBaru, idx) => {
    strategiIdMap.set(strategiPairs[idx].sourceId, stBaru.id);
  });

  const arahAsal = await ArahKebijakan.findAll({
    where: {
      strategi_id: Array.from(strategiIdMap.keys()),
      jenis_dokumen: "rpjmd",
      tahun,
    },
    raw: true,
    order: [["kode_arah", "ASC"]],
  });

  if (arahAsal.length) {
    const arahToClone = arahAsal
      .map((a) => {
        const targetStrategiId = strategiIdMap.get(a.strategi_id);
        if (!targetStrategiId) return null;
        return {
          strategi_id: targetStrategiId,
          kode_arah: a.kode_arah,
          deskripsi: a.deskripsi,
          periode_id,
          jenis_dokumen,
          tahun,
          created_at: new Date(),
          updated_at: new Date(),
        };
      })
      .filter(Boolean);
    const arahBaru = await ArahKebijakan.bulkCreate(arahToClone);
    arahCount = arahBaru.length;
  }

  return { strategiCount, arahCount };
}

async function autoCloneSasaranIfNeeded({ jenis_dokumen, tahun }) {
  console.log("🚀 autoCloneSasaranIfNeeded dipanggil dengan:", {
    jenis_dokumen,
    tahun,
  });

  if (!jenis_dokumen || !tahun) {
    console.warn("[DEBUG] Parameter tidak lengkap, keluar dari fungsi.");
    return;
  }

  const periode = await getPeriodeFromTahun(tahun);
  const periode_id = periode?.id;
  console.debug(`[DEBUG] periode_id yang ditemukan: ${periode_id}`);
  if (!periode_id) {
    console.warn(`⚠️ Periode tidak ditemukan untuk tahun ${tahun}`);
    return;
  }

  const cacheKey = `cloned:sasaran:${periode_id}:${jenis_dokumen}:${tahun}`;
  const lockKey = `lock:clonesasaran:${periode_id}:${jenis_dokumen}:${tahun}`;

  const gotLock = await redisClient.set(lockKey, "locked", {
    NX: true,
    EX: LOCK_TTL,
  });
  if (!gotLock) {
    console.info(`🔒 [DEBUG] Lock aktif, proses lain sedang berjalan. Skip...`);
    return;
  }

  try {
    const isCloned = await safeGet(redisClient, cacheKey);
    if (isCloned) {
      console.warn(
        `[DEBUG] Cache \"${cacheKey}\" sudah ada, skip cloning sasaran.`
      );
      return;
    }

    let tujuanTarget = await Tujuan.findAll({
      where: { jenis_dokumen, tahun, periode_id },
      attributes: ["id", "no_tujuan"],
      raw: true,
    });

    if (!tujuanTarget.length) {
      await autoCloneTujuanIfNeeded({ jenis_dokumen, tahun });
      tujuanTarget = await Tujuan.findAll({
        where: { jenis_dokumen, tahun, periode_id },
        attributes: ["id", "no_tujuan"],
        raw: true,
      });
    }

    const tujuanRpjmd = await Tujuan.findAll({
      where: { jenis_dokumen: "rpjmd", tahun },
      attributes: ["id", "no_tujuan"],
      raw: true,
    });

    const tujuanMap = new Map(tujuanTarget.map((t) => [t.no_tujuan, t.id]));
    const sasaranToClone = [];

    for (const rpjmdTujuan of tujuanRpjmd) {
      const targetTujuanId = tujuanMap.get(rpjmdTujuan.no_tujuan);
      if (!targetTujuanId) continue;

      const sasarans = await Sasaran.findAll({
        where: {
          tujuan_id: rpjmdTujuan.id,
          jenis_dokumen: "rpjmd",
          tahun,
        },
        attributes: ["id", "nomor", "isi_sasaran"],
        raw: true,
      });

      const existingCount = await Sasaran.count({
        where: { tujuan_id: targetTujuanId, jenis_dokumen, tahun, periode_id },
      });

      if (existingCount >= sasarans.length) continue;

      for (const s of sasarans) {
        sasaranToClone.push({
          tujuan_id: targetTujuanId,
          nomor: s.nomor,
          isi_sasaran: s.isi_sasaran,
          rpjmd_id: s.id,
          jenis_dokumen,
          tahun,
          periode_id,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }

    const existing = await Sasaran.findAll({
      where: {
        tahun,
        jenis_dokumen,
        [Op.or]: sasaranToClone.map((s) => ({
          tujuan_id: s.tujuan_id,
          nomor: s.nomor,
        })),
      },
      attributes: ["tujuan_id", "nomor"],
      raw: true,
    });

    const existingKeys = new Set(
      existing.map((s) => `${s.tujuan_id}_${s.nomor}`)
    );
    const finalToClone = sasaranToClone.filter(
      (s) => !existingKeys.has(`${s.tujuan_id}_${s.nomor}`)
    );

    const { totalCloned, insertedSasaran } = await cloneSasaranBatch(
      finalToClone
    );
    await cloneStrategiAndArah(
      insertedSasaran,
      jenis_dokumen,
      tahun,
      periode_id
    );

    // 🔄 Tambahan: Sinkronisasi strategi untuk sasaran RKPD lama yang belum punya strategi
    const sasaransRKPD = await Sasaran.findAll({
      where: { jenis_dokumen, tahun, periode_id, rpjmd_id: { [Op.ne]: null } },
      attributes: ["id", "rpjmd_id"],
      raw: true,
    });

    const strategiRKPD = await Strategi.findAll({
      where: { jenis_dokumen, periode_id, tahun },
      attributes: ["sasaran_id"],
      raw: true,
    });
    const strategiRKPDIds = new Set(strategiRKPD.map((s) => s.sasaran_id));

    const sasaransPerluStrategi = sasaransRKPD.filter(
      (s) => !strategiRKPDIds.has(s.id)
    );

    if (sasaransPerluStrategi.length) {
      console.log(
        `🔄 Menambahkan strategi untuk ${sasaransPerluStrategi.length} sasaran RKPD lama...`
      );
      await cloneStrategiAndArah(
        sasaransPerluStrategi,
        jenis_dokumen,
        tahun,
        periode_id
      );
    }

    await safeSet(redisClient, cacheKey, "true", { EX: REDIS_TTL });
    console.info(`📊 [CLONE] Sasaran: +${totalCloned}`);
  } finally {
    await redisClient.del(lockKey);
  }
}

module.exports = { autoCloneSasaranIfNeeded };
