"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("mr_risk_matrix", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      matrix_code: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },

      likelihood_ref_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "mr_reference_items",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },

      impact_ref_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "mr_reference_items",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },

      likelihood_value: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },

      likelihood_label: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },

      impact_value: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },

      impact_label: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },

      score: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },

      level_risiko_ref_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "mr_reference_items",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },

      level_risiko: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },

      warna_risiko: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },

      appetite_threshold: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },

      is_above_appetite: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      effective_start_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },

      effective_end_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },

      tahun_berlaku: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      metadata_json: {
        type: Sequelize.JSON,
        allowNull: true,
      },

      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      updated_by: {
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

    await queryInterface.addIndex("mr_risk_matrix", ["matrix_code"], {
      name: "idx_mr_risk_matrix_matrix_code",
    });

    await queryInterface.addIndex("mr_risk_matrix", ["likelihood_ref_id"], {
      name: "idx_mr_risk_matrix_likelihood_ref_id",
    });

    await queryInterface.addIndex("mr_risk_matrix", ["impact_ref_id"], {
      name: "idx_mr_risk_matrix_impact_ref_id",
    });

    await queryInterface.addIndex("mr_risk_matrix", ["level_risiko_ref_id"], {
      name: "idx_mr_risk_matrix_level_risiko_ref_id",
    });

    await queryInterface.addIndex(
      "mr_risk_matrix",
      ["matrix_code", "likelihood_ref_id", "impact_ref_id"],
      {
        unique: true,
        name: "idx_mr_risk_matrix_code_likelihood_impact_unique",
      }
    );

    await queryInterface.addIndex("mr_risk_matrix", ["score"], {
      name: "idx_mr_risk_matrix_score",
    });

    await queryInterface.addIndex("mr_risk_matrix", ["is_active"], {
      name: "idx_mr_risk_matrix_is_active",
    });

    await queryInterface.addIndex("mr_risk_matrix", ["tahun_berlaku"], {
      name: "idx_mr_risk_matrix_tahun_berlaku",
    });

    await queryInterface.addIndex(
      "mr_risk_matrix",
      ["effective_start_date", "effective_end_date"],
      {
        name: "idx_mr_risk_matrix_effective_period",
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable("mr_risk_matrix");
  },
};