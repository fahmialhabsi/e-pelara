const { SubKegiatan, Kegiatan, Program } = require("../models");
const { getPeriodeFromTahun } = require("./periodeHelper");
const redisClient = require("../utils/redisClient");
const { safeGet, safeSetEx } = require("../utils/safeRedis");

const BATCH_SIZE = 200;
const PAGE_SIZE = 500;

async function autoCloneSubKegiatanIfNeeded({ jenis_dokumen, tahun }) {
  if (!jenis_dokumen || !tahun) return;
  const periode_id = await getPeriodeFromTahun(tahun);
  if (!periode_id) return;

  const cacheKey = `subkegiatan:cloned:${periode_id}:${jenis_dokumen}:${tahun}`;
  if (await safeGet(redisClient, cacheKey)) {
    console.log("🧊 Clone SubKegiatan dilewati (cached)");
    return;
  }

  const existing = await SubKegiatan.count({
    where: { jenis_dokumen, tahun, periode_id },
  });
  if (existing > 0) {
    console.log("✅ SubKegiatan sudah ada, skip clone.");
    await safeSetEx(redisClient, cacheKey, 86400, "1");
    return;
  }

  const kegiatanTarget = await Kegiatan.findAll({
    where: { jenis_dokumen, tahun, periode_id },
    attributes: ["id", "kode_kegiatan"],
    raw: true,
  });
  const mapByKode = new Map(kegiatanTarget.map((k) => [k.kode_kegiatan, k.id]));
  if (!mapByKode.size) {
    console.warn("⚠️ Tidak ada Kegiatan target untuk cloning.");
    await safeSetEx(redisClient, cacheKey, 86400, "1");
    return;
  }

  let offset = 0;
  const toCreate = [];
  while (true) {
    const batch = await SubKegiatan.findAll({
      where: { jenis_dokumen: "rpjmd", tahun, periode_id },
      limit: PAGE_SIZE,
      offset,
      raw: true,
    });
    if (!batch.length) break;

    for (const s of batch) {
      const key = s.kode_sub_kegiatan.slice(0, 9);
      const kegiatan_id = mapByKode.get(key);
      if (!kegiatan_id) continue;

      toCreate.push({
        kegiatan_id,
        periode_id,
        kode_sub_kegiatan: s.kode_sub_kegiatan,
        nama_sub_kegiatan: s.nama_sub_kegiatan,
        pagu_anggaran: s.pagu_anggaran,
        nama_opd: s.nama_opd,
        nama_bidang_opd: s.nama_bidang_opd,
        sub_bidang_opd: s.sub_bidang_opd,
        jenis_dokumen,
        tahun,
        created_at: new Date(),
        updated_at: new Date(),
      });
      if (toCreate.length >= BATCH_SIZE) {
        await flushBatch(toCreate);
        toCreate.length = 0;
      }
    }

    offset += batch.length;
  }
  if (toCreate.length) await flushBatch(toCreate);
  await safeSetEx(redisClient, cacheKey, 86400, "1");
  console.log("✅ Cloning SubKegiatan selesai");
}

async function flushBatch(arr) {
  try {
    await SubKegiatan.bulkCreate(arr, { ignoreDuplicates: true });
    console.log(`✅ Batch insert SubKegiatan: ${arr.length}`);
  } catch (err) {
    console.error("❌ Error batch insert SubKegiatan:", err);
  }
}

module.exports = { autoCloneSubKegiatanIfNeeded };
