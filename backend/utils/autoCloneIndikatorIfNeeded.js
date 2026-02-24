// utils/autoCloneIndikatorIfNeeded.js
const {
  IndikatorTujuan,
  IndikatorSasaran,
  IndikatorProgram,
  IndikatorKegiatan,
} = require("../models");
const { getPeriodeFromTahun } = require("./periodeHelper");
const redisClient = require("./redisClient");
const { safeGet, safeSetEx } = require("./safeRedis");

const MODELS = [
  { model: IndikatorTujuan, name: "Tujuan" },
  { model: IndikatorSasaran, name: "Sasaran" },
  { model: IndikatorProgram, name: "Program" },
  { model: IndikatorKegiatan, name: "Kegiatan" },
];

const BATCH_INSERT = 500;
const MAX_TOTAL_ROWS = 100_000;

async function autoCloneIndikatorIfNeeded({ jenis_dokumen, tahun }) {
  if (!jenis_dokumen || !tahun) return;
  const periode = await getPeriodeFromTahun(tahun);
  const periode_id = periode?.id;
  if (!periode_id) return;

  const cacheKey = `indikator:cloned:${periode_id}:${jenis_dokumen}:${tahun}`;
  if (await safeGet(redisClient, cacheKey)) return;

  for (const { model, name } of MODELS) {
    const countExists = await model.count({
      where: { jenis_dokumen, tahun, periode_id },
    });
    if (countExists > 0) continue;

    let total = 0;

    // streaming query: raw SQL streaming
    const query = model.queryInterface.queryGenerator
      .selectQuery(model.tableName, {
        where: { jenis_dokumen: "RPJMD", tahun, periode_id },
        raw: true,
      })
      .slice(0, -1); // remove trailing ;
    const stream = await model.sequelize.query(query, {
      type: model.sequelize.QueryTypes.SELECT,
      nest: true,
      stream: true,
    });

    const buffer = [];
    for await (const item of stream) {
      if (++total > MAX_TOTAL_ROWS) {
        console.warn(`⚠️ Cap reached for ${name}: ${MAX_TOTAL_ROWS} rows`);
        break;
      }

      const clone = {
        ...item,
        id: undefined,
        jenis_dokumen,
        periode_id,
        created_at: new Date(),
        updated_at: new Date(),
      };
      buffer.push(clone);

      if (buffer.length >= BATCH_INSERT) {
        await model.bulkCreate(buffer.splice(0, BATCH_INSERT), {
          ignoreDuplicates: true,
        });
      }
    }
    if (buffer.length)
      await model.bulkCreate(buffer, { ignoreDuplicates: true });
  }

  await safeSetEx(redisClient, cacheKey, 86400 * 24, "1"); // TTL 1 hari
}

module.exports = { autoCloneIndikatorIfNeeded };
