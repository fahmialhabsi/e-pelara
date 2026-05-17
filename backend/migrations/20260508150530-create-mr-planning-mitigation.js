"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("mr_planning_mitigation", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      mr_planning_risk_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      uraian_mitigasi: {
        type: Sequelize.TEXT,
        allowNull: false,
      },

      jenis_mitigasi: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },

      target_output: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      target_tanggal: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      tanggal_mulai: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      tanggal_selesai: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      penanggung_jawab: {
        type: Sequelize.STRING(255),
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

      status_mitigasi: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },

      progress_persen: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },

      kendala: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      tindak_lanjut: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      linked_spip_rtp_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      linked_spip_monitoring_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      linked_spip_evidence_id: {
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

    await queryInterface.addIndex(
      "mr_planning_mitigation",
      ["mr_planning_risk_id"]
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable("mr_planning_mitigation");
  },
};