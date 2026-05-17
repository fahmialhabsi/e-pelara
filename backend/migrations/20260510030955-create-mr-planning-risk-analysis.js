"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("mr_planning_risk_analysis", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      // =========================
      // RELASI UTAMA
      // =========================
      mr_planning_risk_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "mr_planning_risk",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },

      mr_planning_context_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "mr_planning_context",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },

      // =========================
      // PERIODISASI
      // =========================
      periode_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      tahun: {
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
        defaultValue: "tahunan",
      },

      periode_label: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },

      periode_awal: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },

      periode_akhir: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },

      // =========================
      // EXISTING CONTROL
      // =========================
      existing_control_status_ref_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "mr_reference_items",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },

      existing_control_status: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },

      existing_control_description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      control_adequacy_ref_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "mr_reference_items",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },

      control_adequacy_status: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },

      control_adequacy_note: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      // =========================
      // RISIKO INHEREN
      // =========================
      inherent_likelihood_ref_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "mr_reference_items",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },

      inherent_impact_ref_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "mr_reference_items",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },

      inherent_likelihood: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      },

      inherent_impact: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      },

      inherent_score: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      },

      inherent_level_ref_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "mr_reference_items",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },

      inherent_level: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },

      inherent_color: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },

      // =========================
      // RISIKO RESIDU
      // =========================
      residual_likelihood_ref_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "mr_reference_items",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },

      residual_impact_ref_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "mr_reference_items",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },

      residual_likelihood: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      },

      residual_impact: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      },

      residual_score: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      },

      residual_level_ref_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "mr_reference_items",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },

      residual_level: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },

      residual_color: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },

      // =========================
      // SELERA RISIKO
      // =========================
      selera_risiko_ref_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "mr_reference_items",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },

      selera_risiko: {
        type: Sequelize.STRING(100),
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

      // =========================
      // CATATAN ANALISIS
      // =========================
      analysis_note: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      rekomendasi: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      matrix_code: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },

      metadata_json: {
        type: Sequelize.JSON,
        allowNull: true,
      },

      // =========================
      // OWNERSHIP
      // =========================
      owner_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      owner_division_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      // =========================
      // WORKFLOW
      // =========================
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

      versi: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },

      alasan_revisi: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      last_revised_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      last_revised_by: {
        type: Sequelize.INTEGER,
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

      // =========================
      // FLAGS
      // =========================
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      is_latest: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      // =========================
      // AUDIT TEKNIS
      // =========================
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

    // =========================
    // INDEX
    // =========================
    await queryInterface.addIndex(
      "mr_planning_risk_analysis",
      ["mr_planning_risk_id"],
      {
        name: "idx_mr_planning_risk_analysis_risk_id",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_risk_analysis",
      ["mr_planning_context_id"],
      {
        name: "idx_mr_planning_risk_analysis_context_id",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_risk_analysis",
      ["tahun"],
      {
        name: "idx_mr_planning_risk_analysis_tahun",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_risk_analysis",
      ["periode_type"],
      {
        name: "idx_mr_planning_risk_analysis_periode_type",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_risk_analysis",
      ["periode_label"],
      {
        name: "idx_mr_planning_risk_analysis_periode_label",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_risk_analysis",
      ["periode_awal", "periode_akhir"],
      {
        name: "idx_mr_planning_risk_analysis_periode_range",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_risk_analysis",
      ["existing_control_status_ref_id"],
      {
        name: "idx_mr_planning_risk_analysis_existing_control_ref",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_risk_analysis",
      ["control_adequacy_ref_id"],
      {
        name: "idx_mr_planning_risk_analysis_control_adequacy_ref",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_risk_analysis",
      ["inherent_likelihood_ref_id"],
      {
        name: "idx_mr_planning_risk_analysis_inherent_likelihood_ref",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_risk_analysis",
      ["inherent_impact_ref_id"],
      {
        name: "idx_mr_planning_risk_analysis_inherent_impact_ref",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_risk_analysis",
      ["inherent_level_ref_id"],
      {
        name: "idx_mr_planning_risk_analysis_inherent_level_ref",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_risk_analysis",
      ["residual_likelihood_ref_id"],
      {
        name: "idx_mr_planning_risk_analysis_residual_likelihood_ref",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_risk_analysis",
      ["residual_impact_ref_id"],
      {
        name: "idx_mr_planning_risk_analysis_residual_impact_ref",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_risk_analysis",
      ["residual_level_ref_id"],
      {
        name: "idx_mr_planning_risk_analysis_residual_level_ref",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_risk_analysis",
      ["selera_risiko_ref_id"],
      {
        name: "idx_mr_planning_risk_analysis_selera_ref",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_risk_analysis",
      ["is_above_appetite"],
      {
        name: "idx_mr_planning_risk_analysis_above_appetite",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_risk_analysis",
      ["status_revisi"],
      {
        name: "idx_mr_planning_risk_analysis_status_revisi",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_risk_analysis",
      ["owner_user_id"],
      {
        name: "idx_mr_planning_risk_analysis_owner_user_id",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_risk_analysis",
      ["owner_division_id"],
      {
        name: "idx_mr_planning_risk_analysis_owner_division_id",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_risk_analysis",
      ["is_active"],
      {
        name: "idx_mr_planning_risk_analysis_is_active",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_risk_analysis",
      ["is_latest"],
      {
        name: "idx_mr_planning_risk_analysis_is_latest",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_risk_analysis",
      [
        "mr_planning_risk_id",
        "mr_planning_context_id",
        "tahun",
        "periode_type",
        "periode_label",
      ],
      {
        name: "idx_mr_planning_risk_analysis_scope_period",
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable("mr_planning_risk_analysis");
  },
};