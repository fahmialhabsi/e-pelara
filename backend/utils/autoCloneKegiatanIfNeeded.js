// backend/utils/autoCloneKegiatanIfNeeded.js

const { Kegiatan, Program } = require("../models");
const { getPeriodeFromTahun } = require("./periodeHelper");
const redisClient = require("../utils/redisClient");
const { safeGet, safeSetEx } = require("../utils/safeRedis");

const BATCH_SIZE = 200;
const PAGE_SIZE = 500;

async function autoCloneKegiatanIfNeeded({ jenis_dokumen, tahun }) {
  if (!jenis_dokumen || !tahun) return;
  const periode = await getPeriodeFromTahun(tahun);
  const periode_id = periode?.id;
  if (!periode_id) return;

  const cacheKey = `kegiatan:cloned:${periode_id}:${jenis_dokumen}:${tahun}`;
  if (await safeGet(redisClient, cacheKey)) {
    console.info(`🧊 Clone Kegiatan dilewati (cached): ${cacheKey}`);
    return;
  }

  const existing = await Kegiatan.count({
    where: { jenis_dokumen, tahun, periode_id },
  });
  if (existing > 0) {
    console.info("✅ Kegiatan sudah ada, skip clone");
    await safeSetEx(redisClient, cacheKey, 86400, "1");
    return;
  }

  // Ambil program target
  const targetPrograms = await Program.findAll({
    where: { jenis_dokumen, tahun, periode_id },
    attributes: ["id", "kode_program"],
    raw: true,
  });
  const progMap = new Map(targetPrograms.map((p) => [p.kode_program, p.id]));
  if (!progMap.size) {
    console.warn("⚠️ Tidak ada Program target untuk cloning Kegiatan");
    await safeSetEx(redisClient, cacheKey, 86400, "1");
    return;
  }

  const toCreate = [];
  let offset = 0;

  while (true) {
    const batch = await Program.findAll({
      where: { jenis_dokumen: "rpjmd", tahun, periode_id },
      attributes: [
        "kode_program",
        "opd_penanggung_jawab",
        "bidang_opd_penanggung_jawab",
      ],
      include: [
        {
          model: Kegiatan,
          as: "kegiatan",
          attributes: ["kode_kegiatan", "nama_kegiatan", "pagu_anggaran"],
          limit: PAGE_SIZE,
        },
      ],
      limit: PAGE_SIZE,
      offset,
      nest: true,
      raw: false,
    });
    if (!batch.length) break;

    for (const prog of batch) {
      const targetId = progMap.get(prog.kode_program);
      if (!targetId || !prog.kegiatan?.length) continue;

      for (const k of prog.kegiatan) {
        toCreate.push({
          program_id: targetId,
          kode_kegiatan: k.kode_kegiatan,
          nama_kegiatan: k.nama_kegiatan,
          pagu_anggaran: k.pagu_anggaran,
          jenis_dokumen,
          tahun,
          periode_id,
          opd_penanggung_jawab: prog.opd_penanggung_jawab,
          bidang_opd_penanggung_jawab: prog.bidang_opd_penanggung_jawab,
          created_at: new Date(),
          updated_at: new Date(),
        });
        if (toCreate.length >= BATCH_SIZE) {
          await flushInsert(toCreate);
          toCreate.length = 0;
        }
      }
    }

    offset += batch.length;
  }

  if (toCreate.length) await flushInsert(toCreate);

  await safeSetEx(redisClient, cacheKey, 86400, "1");
  console.info("✅ Cloning kegiatan selesai");
}

async function flushInsert(list) {
  try {
    await Kegiatan.bulkCreate(list, { ignoreDuplicates: true });
    console.info(`✅ Batch insert kegiatan: ${list.length}`);
  } catch (err) {
    console.error("❌ Error batch insert kegiatan:", err);
  }
}

module.exports = { autoCloneKegiatanIfNeeded };
