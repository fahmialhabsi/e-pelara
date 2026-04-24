// backend/utils/autoCloneTujuanIfNeeded.js

const { Tujuan, Misi } = require("../models");
const { getPeriodeFromTahun, clearPeriodeCache } = require("./periodeHelper");
const redisClient = require("./redisClient");
const { safeGet, safeSetEx } = require("./safeRedis");
const { autoCloneMisiIfNeeded } = require("./autoCloneMisiIfNeeded");

const BATCH_SIZE = 100;

async function autoCloneTujuanIfNeeded({ jenis_dokumen, tahun }) {
  if (!jenis_dokumen || !tahun) {
    console.warn("Parameter jenis_dokumen dan tahun wajib diisi.");
    return;
  }

  const normalizedTahun = String(tahun);
  const periode = await getPeriodeFromTahun(normalizedTahun);
  const periode_id = periode?.id;
  if (!periode_id) {
    console.warn("Tidak ditemukan periode untuk tahun:", tahun);
    return;
  }

  const cacheKey = `tujuan:cloned:${periode_id}:${jenis_dokumen}:${normalizedTahun}`;
  if (await safeGet(redisClient, cacheKey)) {
    console.log(`Clone Tujuan dilewati untuk ${cacheKey} (sudah pernah).`);
    return;
  }

  await autoCloneMisiIfNeeded({ jenis_dokumen, tahun: normalizedTahun });

  const sourceMisi = await Misi.findAll({
    where: {
      jenis_dokumen: "rpjmd",
      tahun: normalizedTahun,
    },
    attributes: ["id", "visi_id", "no_misi"],
    raw: true,
  });

  const targetMisi = await Misi.findAll({
    where: {
      jenis_dokumen,
      tahun: normalizedTahun,
      periode_id,
    },
    attributes: ["id", "visi_id", "no_misi"],
    raw: true,
  });

  const sourceMisiById = new Map(sourceMisi.map((row) => [row.id, row]));
  const targetMisiByKey = new Map(
    targetMisi.map((row) => [`${row.visi_id}:${row.no_misi}`, row.id])
  );
  const existingTarget = await Tujuan.findAll({
    where: {
      jenis_dokumen,
      tahun: normalizedTahun,
      periode_id,
    },
    attributes: ["id", "no_tujuan", "misi_id", "isi_tujuan", "rpjmd_id"],
    raw: true,
  });
  const existingTargetByNo = new Map(
    existingTarget.map((row) => [row.no_tujuan, row])
  );

  const dataAsal = await getTujuanRpjmd({ tahun: normalizedTahun });
  if (!dataAsal.length) {
    console.log("Tidak ada data Tujuan dari RPJMD untuk di-clone.");
    await safeSetEx(redisClient, cacheKey, 86400, "1");
    clearPeriodeCache(normalizedTahun);
    return;
  }

  const cloned = await cloneTujuan(dataAsal, {
    jenis_dokumenTarget: jenis_dokumen,
    tahun: normalizedTahun,
    periode_id,
    sourceMisiById,
    targetMisiByKey,
    existingTargetByNo,
  });
  console.log(
    `Tujuan berhasil disinkronkan: insert ${cloned.insertedCount}, update ${cloned.updatedCount}`
  );

  const total = await Tujuan.count({
    where: { periode_id, jenis_dokumen, tahun: normalizedTahun },
  });
  console.log(
    `Total Tujuan ${jenis_dokumen.toUpperCase()} setelah clone: ${total}`
  );

  await safeSetEx(redisClient, cacheKey, 86400, "1");
  clearPeriodeCache(normalizedTahun);
}

async function getTujuanRpjmd({ tahun }) {
  return Tujuan.findAll({
    where: {
      jenis_dokumen: "rpjmd",
      tahun,
    },
    order: [["no_tujuan", "ASC"]],
  });
}

async function cloneTujuan(
  dataAsal,
  {
    jenis_dokumenTarget,
    tahun,
    periode_id,
    sourceMisiById,
    targetMisiByKey,
    existingTargetByNo,
  }
) {
  try {
    const dataClone = [];
    let updatedCount = 0;

    for (const item of dataAsal) {
      const sourceMisi = sourceMisiById.get(item.misi_id);
      if (!sourceMisi) {
        continue;
      }

      const targetMisiId = targetMisiByKey.get(
        `${sourceMisi.visi_id}:${sourceMisi.no_misi}`
      );
      if (!targetMisiId) {
        continue;
      }

      const targetPayload = {
        misi_id: targetMisiId,
        isi_tujuan: item.isi_tujuan,
        tahun,
        periode_id,
        rpjmd_id: item.rpjmd_id ?? item.id,
        no_tujuan: item.no_tujuan,
        jenis_dokumen: jenis_dokumenTarget,
      };

      const existingTarget = existingTargetByNo.get(item.no_tujuan);
      if (existingTarget) {
        const shouldUpdate =
          String(existingTarget.misi_id) !== String(targetPayload.misi_id) ||
          String(existingTarget.isi_tujuan) !== String(targetPayload.isi_tujuan) ||
          String(existingTarget.rpjmd_id) !== String(targetPayload.rpjmd_id);

        if (shouldUpdate) {
          await Tujuan.update(targetPayload, {
            where: { id: existingTarget.id },
          });
          updatedCount += 1;
        }
        continue;
      }

      dataClone.push({
        ...targetPayload,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    const result = [];
    for (let i = 0; i < dataClone.length; i += BATCH_SIZE) {
      const batch = dataClone.slice(i, i + BATCH_SIZE);
      const inserted = await Tujuan.bulkCreate(batch, {
        ignoreDuplicates: true,
      });
      result.push(...inserted);
    }

    return {
      insertedCount: result.length,
      updatedCount,
    };
  } catch (err) {
    console.error("Gagal melakukan clone Tujuan:", err);
    return {
      insertedCount: 0,
      updatedCount: 0,
    };
  }
}

module.exports = { autoCloneTujuanIfNeeded };
