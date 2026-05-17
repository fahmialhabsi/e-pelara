"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("mr_planning_mitigation_history", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      mr_planning_mitigation_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      versi_sebelum: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      versi_sesudah: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      before_json: {
        type: Sequelize.JSON,
        allowNull: true,
      },

      after_json: {
        type: Sequelize.JSON,
        allowNull: true,
      },

      alasan_revisi: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      status_revisi: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },

      dibuat_oleh: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      diverifikasi_oleh: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      disetujui_oleh: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      ditolak_oleh: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      dibuat_pada: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      diverifikasi_pada: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      disetujui_pada: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      ditolak_pada: {
        type: Sequelize.DATE,
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

    await queryInterface.addIndex(
      "mr_planning_mitigation_history",
      ["mr_planning_mitigation_id"],
      {
        name: "idx_mr_mitigation_history_mitigation_id",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_mitigation_history",
      ["status_revisi"],
      {
        name: "idx_mr_mitigation_history_status_revisi",
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable("mr_planning_mitigation_history");
  },
};