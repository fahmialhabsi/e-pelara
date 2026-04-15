const { SubKegiatan, Kegiatan } = require("../models");
const { getPeriodeFromTahun } = require("./periodeHelper");
const redisClient = require("../utils/redisClient");
const { safeGet, safeSetEx } = require("../utils/safeRedis");
const {
  getEffectiveOperationalModeForSubKegiatan,
} = require("../services/appPolicyService");

const BATCH_SIZE = 200;
const PAGE_SIZE = 500;

/**
 * Master fields untuk clone dari baris sumber (rpjmd).
 * Mode MASTER: baris tanpa pasangan master lengkap di-skip (tidak di-clone).
 * @returns {object|null} null = skip baris
 */
function buildMasterCloneFields(sourceRow, effectiveMode) {
  const sid = sourceRow.master_sub_kegiatan_id;
  const vid = sourceRow.regulasi_versi_id;
  const hasMaster =
    sid != null &&
    vid != null &&
    Number.parseInt(String(sid), 10) >= 1 &&
    Number.parseInt(String(vid), 10) >= 1;

  if (String(effectiveMode).toUpperCase() === "MASTER") {
    if (!hasMaster) return null;
    return {
      master_sub_kegiatan_id: Number.parseInt(String(sid), 10),
      regulasi_versi_id: Number.parseInt(String(vid), 10),
      input_mode: "MASTER",
    };
  }

  if (hasMaster) {
    return {
      master_sub_kegiatan_id: Number.parseInt(String(sid), 10),
      regulasi_versi_id: Number.parseInt(String(vid), 10),
      input_mode: "MASTER",
    };
  }

  return { input_mode: "LEGACY" };
}

async function autoCloneSubKegiatanIfNeeded({ jenis_dokumen, tahun }) {
  if (!jenis_dokumen || !tahun) return;
  const periode = await getPeriodeFromTahun(tahun);
  const periode_id = periode?.id;
  if (!periode_id) return;

  let effectiveMode = "LEGACY";
  try {
    effectiveMode = await getEffectiveOperationalModeForSubKegiatan();
  } catch (e) {
    console.warn(
      "[autoCloneSubKegiatanIfNeeded] gagal baca policy, fallback LEGACY:",
      e?.message || e,
    );
  }

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
  let skippedNoMaster = 0;
  let sourceRows = 0;
  let totalQueued = 0;

  while (true) {
    const batch = await SubKegiatan.findAll({
      where: { jenis_dokumen: "rpjmd", tahun },
      limit: PAGE_SIZE,
      offset,
      raw: true,
    });
    if (!batch.length) break;

    for (const s of batch) {
      sourceRows += 1;
      const key = s.kode_sub_kegiatan.slice(0, 9);
      const kegiatan_id = mapByKode.get(key);
      if (!kegiatan_id) continue;

      const masterPart = buildMasterCloneFields(s, effectiveMode);
      if (masterPart === null) {
        skippedNoMaster += 1;
        continue;
      }

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
        ...masterPart,
        created_at: new Date(),
        updated_at: new Date(),
      });
      if (toCreate.length >= BATCH_SIZE) {
        const n = toCreate.length;
        await flushBatch(toCreate);
        totalQueued += n;
        toCreate.length = 0;
      }
    }

    offset += batch.length;
  }
  if (toCreate.length) {
    const n = toCreate.length;
    await flushBatch(toCreate);
    totalQueued += n;
  }
  await safeSetEx(redisClient, cacheKey, 86400, "1");
  console.log("[CLONE_LOCK]", {
    effectiveMode,
    jenis_dokumen,
    tahun,
    rowsInsertedApprox: totalQueued,
    skippedNoMaster,
    sourceRowsScanned: sourceRows,
  });
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
