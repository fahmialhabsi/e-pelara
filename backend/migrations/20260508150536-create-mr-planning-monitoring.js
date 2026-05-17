"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("mr_planning_monitoring", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      mr_planning_risk_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      mr_planning_mitigation_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      periode_type: {
        type: Sequelize.ENUM(
          "bulanan",
          "triwulan",
          "semester",
          "tahunan",
          "adhoc"
        ),
        allowNull: false,
      },

      periode_label: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },

      periode_awal: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },

      periode_akhir: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },

      monitoring_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },

      status_monitoring: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },

      hasil_monitoring: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      kendala: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      tindak_lanjut: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      rekomendasi: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      realisasi_mitigasi: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      progress_persen: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },

      terjadi_risiko: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      tanggal_kejadian: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },

      uraian_kejadian: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      dampak_kejadian: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      created_by: {
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

    await queryInterface.addIndex(
      "mr_planning_monitoring",
      ["mr_planning_risk_id"],
      {
        name: "idx_mr_monitoring_risk_id",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_monitoring",
      ["mr_planning_mitigation_id"],
      {
        name: "idx_mr_monitoring_mitigation_id",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_monitoring",
      ["periode_type", "periode_label"],
      {
        name: "idx_mr_monitoring_periode",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_monitoring",
      ["status_monitoring"],
      {
        name: "idx_mr_monitoring_status",
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable("mr_planning_monitoring");
  },
};