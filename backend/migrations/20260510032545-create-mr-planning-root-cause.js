"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("mr_planning_root_cause", {
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

      mr_planning_risk_analysis_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "mr_planning_risk_analysis",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
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
      // ROOT CAUSE
      // =========================
      kode_penyebab: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },

      jenis_penyebab_ref_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "mr_reference_items",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },

      jenis_penyebab: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },

      kategori_penyebab_ref_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "mr_reference_items",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },

      kategori_penyebab: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },

      uraian_penyebab: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      // =========================
      // 5 WHY ANALYSIS
      // =========================
      why_1: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      why_2: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      why_3: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      why_4: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      why_5: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      akar_penyebab: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      rekomendasi_pengendalian: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      prioritas_penyebab: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      // =========================
      // LINKAGE MITIGATION
      // =========================
      is_mitigation_required: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      mitigation_status: {
        type: Sequelize.STRING(100),
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
      is_primary: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

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
      // METADATA
      // =========================
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

    // =========================
    // INDEX
    // =========================
    await queryInterface.addIndex(
      "mr_planning_root_cause",
      ["mr_planning_risk_id"],
      {
        name: "idx_mr_planning_root_cause_risk_id",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_root_cause",
      ["mr_planning_risk_analysis_id"],
      {
        name: "idx_mr_planning_root_cause_analysis_id",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_root_cause",
      ["mr_planning_context_id"],
      {
        name: "idx_mr_planning_root_cause_context_id",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_root_cause",
      ["tahun"],
      {
        name: "idx_mr_planning_root_cause_tahun",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_root_cause",
      ["periode_type"],
      {
        name: "idx_mr_planning_root_cause_periode_type",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_root_cause",
      ["periode_label"],
      {
        name: "idx_mr_planning_root_cause_periode_label",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_root_cause",
      ["periode_awal", "periode_akhir"],
      {
        name: "idx_mr_planning_root_cause_periode_range",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_root_cause",
      ["kode_penyebab"],
      {
        name: "idx_mr_planning_root_cause_kode_penyebab",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_root_cause",
      ["jenis_penyebab_ref_id"],
      {
        name: "idx_mr_planning_root_cause_jenis_ref_id",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_root_cause",
      ["kategori_penyebab_ref_id"],
      {
        name: "idx_mr_planning_root_cause_kategori_ref_id",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_root_cause",
      ["owner_user_id"],
      {
        name: "idx_mr_planning_root_cause_owner_user_id",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_root_cause",
      ["owner_division_id"],
      {
        name: "idx_mr_planning_root_cause_owner_division_id",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_root_cause",
      ["status_revisi"],
      {
        name: "idx_mr_planning_root_cause_status_revisi",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_root_cause",
      ["is_primary"],
      {
        name: "idx_mr_planning_root_cause_is_primary",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_root_cause",
      ["is_active"],
      {
        name: "idx_mr_planning_root_cause_is_active",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_root_cause",
      ["is_latest"],
      {
        name: "idx_mr_planning_root_cause_is_latest",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_root_cause",
      [
        "mr_planning_risk_id",
        "mr_planning_risk_analysis_id",
        "mr_planning_context_id",
        "tahun",
        "periode_type",
        "periode_label",
      ],
      {
        name: "idx_mr_planning_root_cause_scope_period",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_root_cause",
      ["mr_planning_risk_id", "is_primary", "is_active"],
      {
        name: "idx_mr_planning_root_cause_primary_active",
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable("mr_planning_root_cause");
  },
};