// backend/utils/autoCloneArahKebijakanIfNeeded.js

const { sequelize } = require("../models");
const { getPeriodeFromTahun } = require("./periodeHelper");
const redisClient = require("./redisClient");
const { safeGet, safeSetEx } = require("./safeRedis");

async function autoCloneArahKebijakanIfNeeded({ jenis_dokumen, tahun }) {
  if (!jenis_dokumen || !tahun) return;

  const periode = await getPeriodeFromTahun(tahun);
  if (!periode) return;
  const periode_id = periode.id;

  const redisKey = `arahkan:cloned:${jenis_dokumen}:${tahun}`;
  const alreadyCloned = await safeGet(redisClient, redisKey);

  if (alreadyCloned) {
    console.log("⏩ Skip cloning — data sudah pernah diclone sebelumnya.");
    return;
  }

  console.log("⚙️ [CLONE] Memulai clone ArahKebijakan (SQL optimized)");

  const insertQuery = `
  INSERT INTO arah_kebijakan (
    strategi_id,
    kode_arah,
    deskripsi,
    jenis_dokumen,
    tahun,
    periode_id,
    created_at,
    updated_at
  )
  SELECT
    st_target.id AS strategi_id,
    ak_rpjmd.kode_arah,
    ak_rpjmd.deskripsi,
    :jenis_dokumen,
    ak_rpjmd.tahun,
    ak_rpjmd.periode_id,
    NOW(),
    NOW()
  FROM arah_kebijakan ak_rpjmd
  INNER JOIN strategi st_rpjmd ON ak_rpjmd.strategi_id = st_rpjmd.id
  INNER JOIN strategi st_target
    ON st_target.kode_strategi = st_rpjmd.kode_strategi
    AND st_target.jenis_dokumen = :jenis_dokumen
    AND st_target.tahun = :tahun
    AND st_target.periode_id = :periode_id
  LEFT JOIN arah_kebijakan ak_target
    ON ak_target.strategi_id = st_target.id
    AND ak_target.kode_arah = ak_rpjmd.kode_arah
    AND ak_target.deskripsi = ak_rpjmd.deskripsi
    AND ak_target.jenis_dokumen = :jenis_dokumen
    AND ak_target.tahun = :tahun
    AND ak_target.periode_id = :periode_id
  WHERE
    ak_rpjmd.jenis_dokumen = 'rpjmd'
    AND ak_rpjmd.tahun = :tahun
    AND ak_rpjmd.periode_id = :periode_id
    AND ak_target.id IS NULL;
`;

  const [insertResult] = await sequelize.query(insertQuery, {
    replacements: { jenis_dokumen, tahun, periode_id },
  });

  // Ambil jumlah row yang diinsert pakai `affectedRows` dari `insertResult`
  const total = insertResult?.affectedRows || 0;
  if (total > 0) {
    console.log(`🎯 Total data berhasil diclone: ${total}`);
  } else {
    console.log("ℹ️ Tidak ada data baru yang perlu diclone.");
  }

  await safeSetEx(redisClient, redisKey, 86400, "1"); // TTL 1 hari
}

module.exports = { autoCloneArahKebijakanIfNeeded };
