"use strict";

/**
 * Script: addImportIds.js
 * Menambahkan kolom ID relasional ke sheet indikator di file Excel template
 * agar import dapat menghubungkan setiap baris ke parent yang benar.
 *
 * Kolom yang ditambahkan:
 *   - indikatorprograms      → indikator_arah_kebijakan_id (IAK id 1–16, berurutan)
 *   - indikatorkegiatans     → indikator_program_id (placeholder, diisi setelah import program)
 *   - indikatorsubkegiatans  → indikator_kegiatan_id (placeholder, diisi setelah import kegiatan)
 *
 * Jalankan: node scripts/addImportIds.js
 */

const XLSX = require("../backend/node_modules/xlsx");
const path = require("path");

const INPUT_FILE = path.join(__dirname, "../dokumenEPelara/template_indikator_rpjmd_2025_2029.xlsx");
const OUTPUT_FILE = path.join(__dirname, "../dokumenEPelara/template_indikator_rpjmd_2025_2029_v2.xlsx");

// ── ID mapping IAK (indikatorarahkebijakans) di DB — urutan sesuai baris sheet
// Verifikasi dulu dengan: SELECT id, kode_indikator FROM indikatorarahkebijakans ORDER BY id;
const IAK_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

function addColumnToSheet(wb, sheetName, colName, values) {
  const ws = wb.Sheets[sheetName];
  if (!ws) {
    console.warn(`Sheet "${sheetName}" tidak ditemukan, dilewati.`);
    return;
  }

  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  if (data.length === 0) return;

  // Cek apakah kolom sudah ada
  const headerRow = data[0];
  if (headerRow.includes(colName)) {
    console.log(`  Kolom "${colName}" sudah ada di sheet "${sheetName}", dilewati.`);
    return;
  }

  // Tambahkan header kolom
  headerRow.push(colName);

  // Tambahkan nilai per baris data (mulai baris index 1)
  for (let i = 1; i < data.length; i++) {
    const val = values[i - 1];
    data[i].push(val !== undefined ? val : "");
  }

  // Tulis kembali ke worksheet
  const newWs = XLSX.utils.aoa_to_sheet(data);
  wb.Sheets[sheetName] = newWs;
  console.log(`  ✓ Kolom "${colName}" ditambahkan ke sheet "${sheetName}" (${data.length - 1} baris)`);
}

function main() {
  console.log("Membaca file:", INPUT_FILE);
  const wb = XLSX.readFile(INPUT_FILE);

  console.log("\n[1] indikatorprograms → indikator_arah_kebijakan_id");
  addColumnToSheet(wb, "indikatorprograms", "indikator_arah_kebijakan_id", IAK_IDS);

  // indikatorkegiatans dan indikatorsubkegiatans memerlukan ID baru setelah import,
  // sehingga nilai diisi "" (kosong) — import helper akan auto-generate kode dari kegiatan.
  // Uncomment baris di bawah jika sudah ada ID program/kegiatan yang diketahui.
  //
  // console.log("\n[2] indikatorkegiatans → indikator_program_id");
  // const IP_IDS = [/* isi setelah import program */];
  // addColumnToSheet(wb, "indikatorkegiatans", "indikator_program_id", IP_IDS);
  //
  // console.log("\n[3] indikatorsubkegiatans → indikator_kegiatan_id");
  // const IK_IDS = [/* isi setelah import kegiatan */];
  // addColumnToSheet(wb, "indikatorsubkegiatans", "indikator_kegiatan_id", IK_IDS);

  console.log("\nMenyimpan file output:", OUTPUT_FILE);
  XLSX.writeFile(wb, OUTPUT_FILE);
  console.log("Selesai.");
}

main();
