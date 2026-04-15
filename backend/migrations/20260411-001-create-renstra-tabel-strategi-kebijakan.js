"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    if (tables.includes("renstra_tabel_strategi_kebijakan")) {
      console.log("Tabel renstra_tabel_strategi_kebijakan sudah ada, skip.");
      return;
    }

    await queryInterface.createTable("renstra_tabel_strategi_kebijakan", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      renstra_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: "FK ke renstra_opd.id",
      },
      strategi_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: "FK ke renstra_strategi.id",
      },
      kebijakan_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: "FK ke renstra_kebijakan.id",
      },
      kode_strategi: { type: Sequelize.STRING(50), allowNull: true },
      deskripsi_strategi: { type: Sequelize.TEXT, allowNull: true },
      kode_kebijakan: { type: Sequelize.STRING(50), allowNull: true },
      deskripsi_kebijakan: { type: Sequelize.TEXT, allowNull: true },
      indikator: { type: Sequelize.STRING(255), allowNull: true },
      baseline: { type: Sequelize.FLOAT, allowNull: true },
      satuan_target: { type: Sequelize.STRING(100), allowNull: true },
      lokasi: { type: Sequelize.STRING(255), allowNull: true },
      opd_penanggung_jawab: { type: Sequelize.STRING(255), allowNull: true },
      target_tahun_1: { type: Sequelize.FLOAT, allowNull: true, defaultValue: 0 },
      target_tahun_2: { type: Sequelize.FLOAT, allowNull: true, defaultValue: 0 },
      target_tahun_3: { type: Sequelize.FLOAT, allowNull: true, defaultValue: 0 },
      target_tahun_4: { type: Sequelize.FLOAT, allowNull: true, defaultValue: 0 },
      target_tahun_5: { type: Sequelize.FLOAT, allowNull: true, defaultValue: 0 },
      target_tahun_6: { type: Sequelize.FLOAT, allowNull: true, defaultValue: 0 },
      pagu_tahun_1: { type: Sequelize.DECIMAL(20, 2), allowNull: true, defaultValue: 0 },
      pagu_tahun_2: { type: Sequelize.DECIMAL(20, 2), allowNull: true, defaultValue: 0 },
      pagu_tahun_3: { type: Sequelize.DECIMAL(20, 2), allowNull: true, defaultValue: 0 },
      pagu_tahun_4: { type: Sequelize.DECIMAL(20, 2), allowNull: true, defaultValue: 0 },
      pagu_tahun_5: { type: Sequelize.DECIMAL(20, 2), allowNull: true, defaultValue: 0 },
      pagu_tahun_6: { type: Sequelize.DECIMAL(20, 2), allowNull: true, defaultValue: 0 },
      target_akhir_renstra: { type: Sequelize.DECIMAL(10, 2), allowNull: true, defaultValue: 0 },
      pagu_akhir_renstra: { type: Sequelize.DECIMAL(20, 2), allowNull: true, defaultValue: 0 },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    await queryInterface.addIndex("renstra_tabel_strategi_kebijakan", ["renstra_id"], {
      name: "idx_rtsk_renstra_id",
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("renstra_tabel_strategi_kebijakan");
  },
};
