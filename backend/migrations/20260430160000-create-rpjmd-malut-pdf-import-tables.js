"use strict";

/** Tabel impor dokumen Rankhir RPJMD Malut 2025–2029 (sumber PDF). Terpisah dari entitas RPJMD operasional. */

module.exports = {
  async up(queryInterface, Sequelize) {
    const periodeCol = () => ({
      periode_rpjmd_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "periode_rpjmds", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
    });

    await queryInterface.createTable("urusan_kinerja_2021_2024", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      ...periodeCol(),
      bidang_urusan: { type: Sequelize.STRING(8), allowNull: true },
      no_urut: { type: Sequelize.INTEGER, allowNull: false },
      indikator: { type: Sequelize.TEXT, allowNull: false },
      tahun_2021: { type: Sequelize.STRING(64), allowNull: true },
      tahun_2022: { type: Sequelize.STRING(64), allowNull: true },
      tahun_2023: { type: Sequelize.STRING(64), allowNull: true },
      tahun_2024: { type: Sequelize.STRING(64), allowNull: true },
      satuan: { type: Sequelize.STRING(255), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });
    await queryInterface.addIndex("urusan_kinerja_2021_2024", ["periode_rpjmd_id", "bidang_urusan", "no_urut"], {
      unique: true,
      name: "uq_urusan_kinerja_periode_bidang_no",
    });

    await queryInterface.createTable("apbd_proyeksi_2026_2030", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      ...periodeCol(),
      kode_baris: { type: Sequelize.STRING(32), allowNull: true },
      uraian: { type: Sequelize.TEXT, allowNull: false },
      target_2025: { type: Sequelize.STRING(64), allowNull: true },
      proyeksi_2026: { type: Sequelize.STRING(64), allowNull: true },
      proyeksi_2027: { type: Sequelize.STRING(64), allowNull: true },
      proyeksi_2028: { type: Sequelize.STRING(64), allowNull: true },
      proyeksi_2029: { type: Sequelize.STRING(64), allowNull: true },
      proyeksi_2030: { type: Sequelize.STRING(64), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });
    await queryInterface.addIndex("apbd_proyeksi_2026_2030", ["periode_rpjmd_id", "kode_baris"], {
      unique: true,
      name: "uq_apbd_proyeksi_periode_kode",
    });

    await queryInterface.createTable("rpjmd_target_tujuan_sasaran_2025_2029", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      ...periodeCol(),
      urutan: { type: Sequelize.INTEGER, allowNull: false },
      tujuan: { type: Sequelize.TEXT, allowNull: true },
      sasaran: { type: Sequelize.TEXT, allowNull: true },
      indikator: { type: Sequelize.TEXT, allowNull: false },
      baseline_2024: { type: Sequelize.STRING(128), allowNull: true },
      target_2025: { type: Sequelize.STRING(128), allowNull: true },
      target_2026: { type: Sequelize.STRING(128), allowNull: true },
      target_2027: { type: Sequelize.STRING(128), allowNull: true },
      target_2028: { type: Sequelize.STRING(128), allowNull: true },
      target_2029: { type: Sequelize.STRING(128), allowNull: true },
      target_2030: { type: Sequelize.STRING(128), allowNull: true },
      ket: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });
    await queryInterface.addIndex("rpjmd_target_tujuan_sasaran_2025_2029", ["periode_rpjmd_id", "urutan"], {
      unique: true,
      name: "uq_rpjmd_target_periode_urutan",
    });

    await queryInterface.createTable("arah_kebijakan_rpjmd", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      ...periodeCol(),
      no_misi: { type: Sequelize.INTEGER, allowNull: false },
      misi_ringkas: { type: Sequelize.STRING(512), allowNull: true },
      arah_kebijakan: { type: "MEDIUMTEXT", allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });
    await queryInterface.addIndex("arah_kebijakan_rpjmd", ["periode_rpjmd_id", "no_misi"], {
      unique: true,
      name: "uq_arah_kebijakan_rpjmd_periode_misi",
    });

    await queryInterface.createTable("iku_rpjmd", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      ...periodeCol(),
      no_urut: { type: Sequelize.INTEGER, allowNull: false },
      indikator: { type: Sequelize.TEXT, allowNull: false },
      baseline_2024: { type: Sequelize.STRING(128), allowNull: true },
      target_2025: { type: Sequelize.STRING(128), allowNull: true },
      target_2026: { type: Sequelize.STRING(128), allowNull: true },
      target_2027: { type: Sequelize.STRING(128), allowNull: true },
      target_2028: { type: Sequelize.STRING(128), allowNull: true },
      target_2029: { type: Sequelize.STRING(128), allowNull: true },
      target_2030: { type: Sequelize.STRING(128), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });
    await queryInterface.addIndex("iku_rpjmd", ["periode_rpjmd_id", "no_urut"], {
      unique: true,
      name: "uq_iku_rpjmd_periode_no",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("iku_rpjmd");
    await queryInterface.dropTable("arah_kebijakan_rpjmd");
    await queryInterface.dropTable("rpjmd_target_tujuan_sasaran_2025_2029");
    await queryInterface.dropTable("apbd_proyeksi_2026_2030");
    await queryInterface.dropTable("urusan_kinerja_2021_2024");
  },
};
