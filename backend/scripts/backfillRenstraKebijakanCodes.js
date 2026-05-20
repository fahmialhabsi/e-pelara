/**
 * Backfill kode_kebjkn untuk data renstra_kebijakan yang masih kosong.
 *
 * Aturan:
 * - Hanya menyentuh baris dengan kode_kebjkn kosong/null.
 * - Nomor urut diambil dari suffix terbesar yang sudah ada pada kombinasi
 *   (renstra_id, rpjmd_arah_id) yang sama.
 * - Hasil disimpan sesuai urutan id ASC agar konsisten.
 *
 * Jalankan:
 *   node scripts/backfillRenstraKebijakanCodes.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const db = require("../models");
const { sequelize, RenstraKebijakan, ArahKebijakan } = db;

function getSuffixFromKode(kode) {
  const text = String(kode || "").trim();
  const match = text.match(/\.([0-9]{2})$/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function buildKode(baseKodeArah, seq) {
  const bagianAkhir = String(baseKodeArah || "")
    .split("-")
    .slice(1)
    .join("-");
  return `AKR-${bagianAkhir}.${String(seq).padStart(2, "0")}`;
}

async function main() {
  try {
    await sequelize.authenticate();
    console.log("DB connected");

    const rows = await RenstraKebijakan.findAll({
      where: sequelize.literal("(kode_kebjkn IS NULL OR kode_kebjkn = '')"),
      attributes: ["id", "renstra_id", "rpjmd_arah_id"],
      order: [["id", "ASC"]],
      raw: true,
    });

    if (rows.length === 0) {
      console.log("Tidak ada kode_kebjkn kosong untuk diperbaiki.");
      return;
    }

    const grouped = new Map();
    for (const row of rows) {
      const key = `${row.renstra_id}::${row.rpjmd_arah_id}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(row);
    }

    let updated = 0;

    for (const [key, groupRows] of grouped.entries()) {
      const [renstraId, arahId] = key.split("::");
      const arah = await ArahKebijakan.findByPk(arahId, {
        attributes: ["kode_arah"],
        raw: true,
      });

      if (!arah?.kode_arah) {
        console.warn(`Skip group ${key}: kode_arah tidak ditemukan.`);
        continue;
      }

      const existingRows = await RenstraKebijakan.findAll({
        where: {
          renstra_id: renstraId,
          rpjmd_arah_id: arahId,
        },
        attributes: ["id", "kode_kebjkn"],
        order: [["id", "ASC"]],
        raw: true,
      });

      let nextSeq = Math.max(
        0,
        ...existingRows.map((row) => getSuffixFromKode(row.kode_kebjkn)).filter((n) => Number.isInteger(n) && n > 0),
      ) + 1;

      for (const row of groupRows) {
        const generatedKode = buildKode(arah.kode_arah, nextSeq);
        await RenstraKebijakan.update(
          { kode_kebjkn: generatedKode },
          { where: { id: row.id } },
        );
        console.log(`Updated id=${row.id} => ${generatedKode}`);
        nextSeq += 1;
        updated += 1;
      }
    }

    console.log(`Selesai. Total baris diperbaiki: ${updated}`);
  } catch (err) {
    console.error("Gagal backfill kode kebijakan:", err.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
