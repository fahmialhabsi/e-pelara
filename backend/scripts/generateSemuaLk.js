"use strict";
// Script: generate semua komponen LK untuk tahun anggaran tertentu
// Jalankan: node scripts/generateSemuaLk.js [tahun]
// Contoh:   node scripts/generateSemuaLk.js 2024
//
// Gunakan objek `db` lengkap dari models/index (jangan destructuring model tunggal).

const db = require("../models");
const { sequelize } = db;

if (!sequelize || typeof db !== "object") {
  console.error("FATAL: models tidak termuat dengan benar (periksa backend/models/index.js).");
  process.exit(1);
}

const { generateLra } = require("../services/lraService");
const { generateNeraca } = require("../services/neracaService");
const { generateLo } = require("../services/loService");
const { generateLpe } = require("../services/lpeService");
const { generateLak } = require("../services/lakService");
const { generateSemuaKontenCalk } = require("../services/calkService");
const { prosesPenyusutanTahunan } = require("../services/penyusutanService");
const { validasiSebelumGenerate } = require("../services/lkPdfValidationService");
const { recalculateSaldoTahun } = require("../services/lkSaldoService");

const TAHUN = parseInt(process.argv[2], 10) || 2024;

function fmt(n) {
  return `Rp ${Math.abs(parseFloat(n) || 0).toLocaleString("id-ID")}`;
}

async function main() {
  console.log(`\n=== GENERATE LAPORAN KEUANGAN TAHUN ${TAHUN} ===\n`);

  const hasil = {};

  try {
    const r0 = await recalculateSaldoTahun(sequelize, db, TAHUN);
    hasil.recalculate_saldo = r0;
    console.log("✅ 1. Saldo akun di-recalculate — jurnal POSTED:", r0.rebuilt);
  } catch (e) {
    console.log("⚠️  1. Recalculate saldo:", e.message);
    hasil.recalculate_error = e.message;
  }

  try {
    const r = await prosesPenyusutanTahunan(sequelize, db, TAHUN);
    hasil.penyusutan = r;
    console.log(
      `✅ 2. Penyusutan: jurnal_dibuat=${r.jurnal_dibuat}, dilewati=${r.dilewati}`,
    );
  } catch (e) {
    console.log("⚠️  2. Penyusutan:", e.message);
    hasil.penyusutan_error = e.message;
  }

  try {
    const r = await generateNeraca(sequelize, db, TAHUN);
    hasil.neraca = r;
    console.log(
      `✅ 3. Neraca: Aset=${fmt(r.total_aset)}, Kwj=${fmt(r.total_kewajiban)}, Ekuitas=${fmt(r.ekuitas)}, Balance=${r.balance}`,
    );
  } catch (e) {
    console.log("⚠️  3. Neraca:", e.message);
    hasil.neraca_error = e.message;
  }

  try {
    const r = await generateLo(sequelize, db, TAHUN);
    hasil.lo = r;
    console.log(
      `✅ 4. LO: surplus_defisit=${fmt(r.surplus_defisit)} (detail di ringkasan generate)`,
    );
  } catch (e) {
    console.log("⚠️  4. LO:", e.message);
    hasil.lo_error = e.message;
  }

  try {
    const r = await generateLpe(sequelize, db, TAHUN, {});
    hasil.lpe = r;
    console.log(
      `✅ 5. LPE: EkuitasAkhir=${fmt(r.ekuitas_akhir)}, LPE vs Neraca=${r.balance_lpe_neraca}`,
    );
  } catch (e) {
    console.log("⚠️  5. LPE:", e.message);
    hasil.lpe_error = e.message;
  }

  try {
    const r = await generateLak(sequelize, db, TAHUN);
    hasil.lak = r;
    console.log(
      `✅ 6. LAK: saldo_akhir_lak=${fmt(r.saldo_akhir_lak)}, BKU=${fmt(r.saldo_bku_akhir)}, balance=${r.balance}`,
    );
  } catch (e) {
    console.log("⚠️  6. LAK:", e.message);
    hasil.lak_error = e.message;
  }

  try {
    const r = await generateLra(sequelize, db, TAHUN);
    hasil.lra = r;
    console.log(
      `✅ 7. LRA: ${r.total_akun} akun, selisih belanja vs BKU=${fmt(r.selisih_total_belanja_vs_bku || 0)}`,
    );
  } catch (e) {
    console.log("⚠️  7. LRA:", e.message);
    hasil.lra_error = e.message;
  }

  try {
    const r = await generateSemuaKontenCalk(sequelize, db, TAHUN);
    hasil.calk = r;
    console.log(`✅ 8. CALK: template=${r.total_template}, diisi=${r.diisi}, skip FINAL=${r.dilewati_final}`);
  } catch (e) {
    console.log("⚠️  8. CALK:", e.message);
    hasil.calk_error = e.message;
  }

  console.log("\n=== VALIDASI KESEIMBANGAN (PDF) ===");
  try {
    const v = await validasiSebelumGenerate(sequelize, db, TAHUN);
    hasil.validasi = v;
    if (v.valid) {
      console.log("✅ SEMUA VALIDASI LULUS — Siap generate PDF");
    } else {
      console.log("⚠️  VALIDASI GAGAL:");
      (v.errors || []).forEach((err) => console.log("   ❌", err));
    }
  } catch (e) {
    console.log("⚠️  Validasi:", e.message);
    hasil.validasi_error = e.message;
  }

  console.log("\n=== RINGKASAN (ringkas) ===");
  console.log(JSON.stringify(hasil, replacer, 2));
}

function replacer(key, value) {
  if (key === "validasi" && value && typeof value === "object") {
    return {
      valid: value.valid,
      errors: value.errors,
      checks_count: (value.checks || []).length,
    };
  }
  return value;
}

main()
  .catch((e) => {
    console.error("FATAL:", e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await sequelize.close();
    } catch {
      /* ignore */
    }
  });
