"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("mr_planning_deviation", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      mr_planning_risk_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
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

      renstra_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      tahun: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      target_awal: {
        type: Sequelize.DECIMAL(20, 2),
        allowNull: true,
        defaultValue: 0,
      },

      target_realisasi: {
        type: Sequelize.DECIMAL(20, 2),
        allowNull: true,
        defaultValue: 0,
      },

      deviasi_target: {
        type: Sequelize.DECIMAL(20, 2),
        allowNull: true,
        defaultValue: 0,
      },

      persen_deviasi_target: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      },

      pagu_awal: {
        type: Sequelize.DECIMAL(20, 2),
        allowNull: true,
        defaultValue: 0,
      },

      pagu_realisasi: {
        type: Sequelize.DECIMAL(20, 2),
        allowNull: true,
        defaultValue: 0,
      },

      deviasi_pagu: {
        type: Sequelize.DECIMAL(20, 2),
        allowNull: true,
        defaultValue: 0,
      },

      persen_deviasi_pagu: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      },

      level_deviasi: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },

      warning_status: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },

      rekomendasi: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      source_table: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },

      source_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      calculated_at: {
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
      "mr_planning_deviation",
      ["mr_planning_risk_id"],
      {
        name: "idx_mr_deviation_risk_id",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_deviation",
      ["indikator_id"],
      {
        name: "idx_mr_deviation_indikator_id",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_deviation",
      ["stage", "ref_id"],
      {
        name: "idx_mr_deviation_stage_ref",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_deviation",
      ["renstra_id", "tahun"],
      {
        name: "idx_mr_deviation_renstra_tahun",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_deviation",
      ["warning_status"],
      {
        name: "idx_mr_deviation_warning_status",
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable("mr_planning_deviation");
  },
};