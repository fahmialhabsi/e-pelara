"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("mr_planning_risk", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      periode_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      tahun: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      jenis_dokumen: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },

      renstra_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      opd_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      indikator_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      stage: {
        type: Sequelize.ENUM(
          "tujuan",
          "sasaran",
          "strategi",
          "kebijakan",
          "program",
          "kegiatan",
          "sub_kegiatan",
          "lakip",
          "lk"
        ),
        allowNull: false,
      },

      ref_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      kode_risiko: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },

      nama_risiko: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },

      uraian_risiko: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      kategori_risiko: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },

      sumber_risiko: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      penyebab_risiko: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      dampak_risiko: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      kemungkinan: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      },

      dampak: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      },

      skor_risiko: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      },

      level_risiko: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },

      selera_risiko: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },

      status_risiko: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },

      owner_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      owner_division_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      versi: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },

      status_revisi: {
        type: Sequelize.ENUM(
          "draft",
          "verifikasi",
          "approved",
          "ditolak"
        ),
        allowNull: false,
        defaultValue: "draft",
      },

      last_revised_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      last_revised_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },

      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal(
          "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
        ),
      },
    });

    await queryInterface.addIndex("mr_planning_risk", ["indikator_id"]);
    await queryInterface.addIndex("mr_planning_risk", ["stage"]);
    await queryInterface.addIndex("mr_planning_risk", ["ref_id"]);
    await queryInterface.addIndex("mr_planning_risk", ["renstra_id"]);
    await queryInterface.addIndex("mr_planning_risk", ["status_revisi"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("mr_planning_risk");
  },
};