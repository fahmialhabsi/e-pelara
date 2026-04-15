/**
 * Script: create-missing-tables.js
 *
 * Jalankan SEKALI di server untuk membuat tabel yang belum ada:
 *   node backend/scripts/create-missing-tables.js
 *
 * Aman dijalankan berkali-kali — hanya membuat tabel yang belum ada.
 */
"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const S = DataTypes;

async function run() {
  try {
    await sequelize.authenticate();
    console.log("✅ Koneksi DB berhasil.");

    const qi = sequelize.getQueryInterface();
    const tables = await qi.showAllTables();
    console.log("Tabel yang sudah ada:", tables.filter((t) => t.startsWith("renstra_tabel")));

    // ─── Tabel 1: renstra_tabel_strategi_kebijakan ───
    if (!tables.includes("renstra_tabel_strategi_kebijakan")) {
      console.log("⏳ Membuat tabel renstra_tabel_strategi_kebijakan...");
      await qi.createTable("renstra_tabel_strategi_kebijakan", {
        id:               { type: S.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        renstra_id:       { type: S.INTEGER, allowNull: false },
        strategi_id:      { type: S.INTEGER, allowNull: true },
        kebijakan_id:     { type: S.INTEGER, allowNull: true },
        kode_strategi:    { type: S.STRING(50), allowNull: true },
        deskripsi_strategi: { type: S.TEXT, allowNull: true },
        kode_kebijakan:   { type: S.STRING(50), allowNull: true },
        deskripsi_kebijakan: { type: S.TEXT, allowNull: true },
        indikator:        { type: S.STRING(255), allowNull: true },
        baseline:         { type: S.FLOAT, allowNull: true, defaultValue: 0 },
        satuan_target:    { type: S.STRING(100), allowNull: true },
        lokasi:           { type: S.STRING(255), allowNull: true },
        opd_penanggung_jawab: { type: S.STRING(255), allowNull: true },
        target_tahun_1:   { type: S.FLOAT, allowNull: true, defaultValue: 0 },
        target_tahun_2:   { type: S.FLOAT, allowNull: true, defaultValue: 0 },
        target_tahun_3:   { type: S.FLOAT, allowNull: true, defaultValue: 0 },
        target_tahun_4:   { type: S.FLOAT, allowNull: true, defaultValue: 0 },
        target_tahun_5:   { type: S.FLOAT, allowNull: true, defaultValue: 0 },
        target_tahun_6:   { type: S.FLOAT, allowNull: true, defaultValue: 0 },
        pagu_tahun_1:     { type: S.DECIMAL(20,2), allowNull: true, defaultValue: 0 },
        pagu_tahun_2:     { type: S.DECIMAL(20,2), allowNull: true, defaultValue: 0 },
        pagu_tahun_3:     { type: S.DECIMAL(20,2), allowNull: true, defaultValue: 0 },
        pagu_tahun_4:     { type: S.DECIMAL(20,2), allowNull: true, defaultValue: 0 },
        pagu_tahun_5:     { type: S.DECIMAL(20,2), allowNull: true, defaultValue: 0 },
        pagu_tahun_6:     { type: S.DECIMAL(20,2), allowNull: true, defaultValue: 0 },
        target_akhir_renstra: { type: S.DECIMAL(10,2), allowNull: true, defaultValue: 0 },
        pagu_akhir_renstra:   { type: S.DECIMAL(20,2), allowNull: true, defaultValue: 0 },
        created_at: { type: S.DATE, allowNull: false, defaultValue: new Date() },
        updated_at: { type: S.DATE, allowNull: false, defaultValue: new Date() },
      });
      console.log("✅ Tabel renstra_tabel_strategi_kebijakan berhasil dibuat.");
    } else {
      console.log("⏩ renstra_tabel_strategi_kebijakan sudah ada, skip.");
    }

    // ─── Tabel 2: renstra_tabel_prioritas ───
    if (!tables.includes("renstra_tabel_prioritas")) {
      console.log("⏳ Membuat tabel renstra_tabel_prioritas...");
      await qi.createTable("renstra_tabel_prioritas", {
        id:               { type: S.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        renstra_id:       { type: S.INTEGER, allowNull: false },
        jenis_prioritas:  { type: S.ENUM("nasional","daerah","gubernur"), allowNull: false, defaultValue: "nasional" },
        nama_prioritas:   { type: S.STRING(255), allowNull: false },
        kode_prioritas:   { type: S.STRING(50), allowNull: true },
        indikator:        { type: S.STRING(255), allowNull: true },
        baseline:         { type: S.FLOAT, allowNull: true, defaultValue: 0 },
        satuan_target:    { type: S.STRING(100), allowNull: true },
        lokasi:           { type: S.STRING(255), allowNull: true },
        opd_penanggung_jawab: { type: S.STRING(255), allowNull: true },
        program_terkait:  { type: S.STRING(255), allowNull: true },
        kegiatan_terkait: { type: S.STRING(255), allowNull: true },
        target_tahun_1:   { type: S.FLOAT, allowNull: true, defaultValue: 0 },
        target_tahun_2:   { type: S.FLOAT, allowNull: true, defaultValue: 0 },
        target_tahun_3:   { type: S.FLOAT, allowNull: true, defaultValue: 0 },
        target_tahun_4:   { type: S.FLOAT, allowNull: true, defaultValue: 0 },
        target_tahun_5:   { type: S.FLOAT, allowNull: true, defaultValue: 0 },
        target_tahun_6:   { type: S.FLOAT, allowNull: true, defaultValue: 0 },
        pagu_tahun_1:     { type: S.DECIMAL(20,2), allowNull: true, defaultValue: 0 },
        pagu_tahun_2:     { type: S.DECIMAL(20,2), allowNull: true, defaultValue: 0 },
        pagu_tahun_3:     { type: S.DECIMAL(20,2), allowNull: true, defaultValue: 0 },
        pagu_tahun_4:     { type: S.DECIMAL(20,2), allowNull: true, defaultValue: 0 },
        pagu_tahun_5:     { type: S.DECIMAL(20,2), allowNull: true, defaultValue: 0 },
        pagu_tahun_6:     { type: S.DECIMAL(20,2), allowNull: true, defaultValue: 0 },
        target_akhir_renstra: { type: S.DECIMAL(10,2), allowNull: true, defaultValue: 0 },
        pagu_akhir_renstra:   { type: S.DECIMAL(20,2), allowNull: true, defaultValue: 0 },
        keterangan:       { type: S.TEXT, allowNull: true },
        created_at: { type: S.DATE, allowNull: false, defaultValue: new Date() },
        updated_at: { type: S.DATE, allowNull: false, defaultValue: new Date() },
      });
      console.log("✅ Tabel renstra_tabel_prioritas berhasil dibuat.");
    } else {
      console.log("⏩ renstra_tabel_prioritas sudah ada, skip.");
    }

    console.log("\n🎉 Selesai! Restart backend server setelah script ini.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Gagal:", err.message);
    process.exit(1);
  }
}

run();
