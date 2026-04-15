/**
 * scripts/importPermendagri90.js
 * Import Kode Neraca & Kode Rekening Belanja dari file Excel Permendagri 90.
 *
 * Struktur sheet yang terdeteksi:
 *   "Kode Neraca":          col[0]=kode, col[1]=nama, row[0]=header
 *   "Kode Rekening Belanja": col[6]=kode_full, col[7]=nama, row[0]=header
 *
 * Jalankan: node scripts/importPermendagri90.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const path = require("path");
const XLSX = require("xlsx");
const { Sequelize } = require("sequelize");
const config = require("../config/config.json").development;

const sequelize = new Sequelize(
  config.database, config.username, config.password,
  { host: config.host, port: config.port, dialect: config.dialect, logging: false }
);

const EXCEL_PATH =
  "D:\\01. A. Sekretariat Dinas Pangan\\Laporan Keuangan Dinas Pangan 2024\\KODE AKUN_KODE REKENING_BELANJA PERMENDAGRI 90.xlsx";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cleanStr(val) {
  if (val === null || val === undefined) return null;
  return String(val).trim().replace(/\r?\n/g, " ").replace(/\.+$/, "").trim() || null;
}

function detectLevel(kode) {
  if (!kode) return 1;
  return kode.split(".").filter(Boolean).length;
}

function detectParent(kode) {
  if (!kode) return null;
  const parts = kode.split(".");
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join(".");
}

function isValidKode(kode) {
  if (!kode) return false;
  // Harus berformat angka (boleh ada titik pemisah): 1 | 1.1 | 5.1.01.01.01.0001
  return /^\d+(\.\d+)*$/.test(String(kode).trim().replace(/\.+$/, ""));
}

function isHeaderOrJunk(kode, nama) {
  if (!kode || !nama) return true;
  // Nama yang hanya angka 1-3 digit = baris header/nomor urut
  if (/^\d{1,3}$/.test(String(nama).trim())) return true;
  // Kode yang merupakan label teks (bukan angka)
  if (!/^\d/.test(String(kode).trim())) return true;
  return false;
}

// ─── Import Kode Neraca ──────────────────────────────────────────────────────

async function importKodeNeraca(wb) {
  const sheetName = wb.SheetNames.find((n) =>
    n.toLowerCase().includes("neraca")
  );
  if (!sheetName) {
    console.warn("[neraca] Sheet tidak ditemukan");
    return 0;
  }

  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
    header: 1, defval: null,
  });
  console.log(`[neraca] Sheet: "${sheetName}" | ${rows.length} baris`);

  // Kosongkan dulu untuk re-import bersih
  await sequelize.query("TRUNCATE TABLE kode_neraca");
  console.log("[neraca] Tabel dikosongkan");

  const records = [];
  for (const row of rows) {
    const kode = cleanStr(row[0]);
    const nama = cleanStr(row[1]);

    if (isHeaderOrJunk(kode, nama)) continue;
    if (!isValidKode(kode)) continue;

    records.push({
      kode_neraca: kode,
      nama,
      parent_kode: detectParent(kode),
      level: detectLevel(kode),
      jenis: null,
    });
  }

  if (!records.length) {
    console.warn("[neraca] Tidak ada data valid");
    return 0;
  }

  // Insert batch 500
  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const placeholders = batch.map(() => "(?, ?, ?, ?, ?, NOW())").join(",");
    const values = batch.flatMap((r) => [r.kode_neraca, r.nama, r.parent_kode, r.level, r.jenis]);
    await sequelize.query(
      `INSERT INTO kode_neraca (kode_neraca, nama, parent_kode, level, jenis, created_at) VALUES ${placeholders}`,
      { replacements: values }
    );
    inserted += batch.length;
  }
  console.log(`[neraca] ✅ ${inserted} record diinsert ke kode_neraca`);
  return inserted;
}

// ─── Import Kode Rekening Belanja ─────────────────────────────────────────────

async function importKodeRekening(wb) {
  const sheetName = wb.SheetNames.find((n) =>
    n.toLowerCase().includes("belanja") || n.toLowerCase().includes("rekening belanja")
  );
  if (!sheetName) {
    console.warn("[rekening] Sheet tidak ditemukan");
    return 0;
  }

  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
    header: 1, defval: null,
  });
  console.log(`[rekening] Sheet: "${sheetName}" | ${rows.length} baris`);

  // Kosongkan untuk re-import bersih
  await sequelize.query("DELETE FROM kode_rekening WHERE 1=1");
  console.log("[rekening] Tabel dikosongkan");

  // ─── Kolom 6 = kode_full, kolom 7 = nama ────────────────────────
  const records = [];
  for (const row of rows) {
    const kode = cleanStr(row[6]);   // kolom 6: kode lengkap (5.1.01.01.01)
    const nama = cleanStr(row[7]);   // kolom 7: uraian

    // Validasi ketat
    if (!kode || !nama) continue;
    if (isHeaderOrJunk(kode, nama)) continue;
    if (!isValidKode(kode)) continue;
    // Minimum 2 segmen untuk kode rekening (5.xxx)
    if (!kode.includes(".")) continue;

    // Hierarki dari kode
    const parts = kode.split(".");
    records.push({
      kode_rekening: kode,
      nama: nama.trim(),
      parent_kode: detectParent(kode),
      level: detectLevel(kode),
      kelompok: parts[0] || null,
      jenis: parts.length >= 2 ? parts.slice(0, 2).join(".") : null,
      objek: parts.length >= 3 ? parts.slice(0, 3).join(".") : null,
      rincian: parts.length >= 4 ? parts.slice(0, 4).join(".") : null,
      kode_permendagri: kode,
    });
  }

  if (!records.length) {
    console.warn("[rekening] Tidak ada data valid");
    return 0;
  }

  // Insert batch 500
  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const placeholders = batch.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())").join(",");
    const values = batch.flatMap((r) => [
      r.kode_rekening, r.nama, r.parent_kode, r.level,
      r.kelompok, r.jenis, r.objek, r.rincian, r.kode_permendagri,
    ]);
    await sequelize.query(
      `INSERT INTO kode_rekening (kode_rekening, nama, parent_kode, level, kelompok, jenis, objek, rincian, kode_permendagri, created_at) VALUES ${placeholders}`,
      { replacements: values }
    );
    inserted += batch.length;
  }
  console.log(`[rekening] ✅ ${inserted} record diinsert ke kode_rekening`);
  return inserted;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n════════════════════════════════════════════════════");
  console.log("  Import Permendagri 90 — Kode Neraca + Kode Rekening");
  console.log("════════════════════════════════════════════════════\n");

  await sequelize.authenticate();
  console.log("[DB] ✅ Koneksi OK\n");

  console.log("[Excel] Membaca:", EXCEL_PATH);
  const wb = XLSX.readFile(EXCEL_PATH);
  console.log("[Excel] Sheet:", wb.SheetNames.join(", "), "\n");

  const neracaCount   = await importKodeNeraca(wb);
  const rekeningCount = await importKodeRekening(wb);

  // ── Verifikasi ────────────────────────────────────────────────────
  const [[{ cnt: totalNeraca }]]   = await sequelize.query("SELECT COUNT(*) cnt FROM kode_neraca");
  const [[{ cnt: totalRekening }]] = await sequelize.query("SELECT COUNT(*) cnt FROM kode_rekening");
  const [[{ cnt: dupNeraca }]]     = await sequelize.query(
    "SELECT COUNT(*) cnt FROM (SELECT kode_neraca, COUNT(*) c FROM kode_neraca GROUP BY kode_neraca HAVING c>1) x"
  );
  const [[{ cnt: dupRekening }]]   = await sequelize.query(
    "SELECT COUNT(*) cnt FROM (SELECT kode_rekening, COUNT(*) c FROM kode_rekening GROUP BY kode_rekening HAVING c>1) x"
  );

  // ── Sample data ───────────────────────────────────────────────────
  const [sampleNeraca]   = await sequelize.query(
    "SELECT kode_neraca, nama, level FROM kode_neraca WHERE level <= 3 LIMIT 5"
  );
  const [sampleRekening] = await sequelize.query(
    "SELECT kode_rekening, nama, level FROM kode_rekening WHERE kode_rekening LIKE '5.1%' LIMIT 5"
  );

  console.log("\n════════════════════════════════════════════════════");
  console.log("  HASIL IMPORT FINAL");
  console.log("════════════════════════════════════════════════════");
  console.log(`  kode_neraca   : ${totalNeraca} record | duplikat: ${dupNeraca}`);
  console.log(`  kode_rekening : ${totalRekening} record | duplikat: ${dupRekening}`);
  console.log("\n  Sample kode_neraca:");
  sampleNeraca.forEach((r) => console.log(`    [Lv${r.level}] ${r.kode_neraca} → ${r.nama}`));
  console.log("\n  Sample kode_rekening:");
  sampleRekening.forEach((r) => console.log(`    [Lv${r.level}] ${r.kode_rekening} → ${r.nama}`));
  console.log("\n════════════════════════════════════════════════════\n");

  await sequelize.close();
}

main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
