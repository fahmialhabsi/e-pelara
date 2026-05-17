"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("mr_planning_context", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
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

      periode_penerapan: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },

      // =========================
      // KONTEKS DOKUMEN / OPD
      // =========================
      jenis_dokumen: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },

      renstra_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      opd_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      nama_opd: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },

      // =========================
      // PEMILIK RISIKO
      // =========================
      pemilik_risiko_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      nama_pemilik_risiko: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },

      jabatan_pemilik_risiko: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },

      // =========================
      // KOORDINATOR RISIKO
      // =========================
      koordinator_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      nama_koordinator: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },

      jabatan_koordinator: {
        type: Sequelize.STRING(255),
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

      nama_unit_kerja: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },

      // =========================
      // RISK APPETITE / SELERA RISIKO
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

      risk_appetite_note: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      // =========================
      // STATUS DAN WORKFLOW
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

      is_locked: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      locked_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      locked_at: {
        type: Sequelize.DATE,
        allowNull: true,
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
    await queryInterface.addIndex("mr_planning_context", ["periode_id"], {
      name: "idx_mr_planning_context_periode_id",
    });

    await queryInterface.addIndex("mr_planning_context", ["tahun"], {
      name: "idx_mr_planning_context_tahun",
    });

    await queryInterface.addIndex("mr_planning_context", ["periode_type"], {
      name: "idx_mr_planning_context_periode_type",
    });

    await queryInterface.addIndex("mr_planning_context", ["periode_label"], {
      name: "idx_mr_planning_context_periode_label",
    });

    await queryInterface.addIndex(
      "mr_planning_context",
      ["periode_awal", "periode_akhir"],
      {
        name: "idx_mr_planning_context_periode_range",
      }
    );

    await queryInterface.addIndex("mr_planning_context", ["jenis_dokumen"], {
      name: "idx_mr_planning_context_jenis_dokumen",
    });

    await queryInterface.addIndex("mr_planning_context", ["renstra_id"], {
      name: "idx_mr_planning_context_renstra_id",
    });

    await queryInterface.addIndex("mr_planning_context", ["opd_id"], {
      name: "idx_mr_planning_context_opd_id",
    });

    await queryInterface.addIndex(
      "mr_planning_context",
      ["owner_user_id"],
      {
        name: "idx_mr_planning_context_owner_user_id",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_context",
      ["owner_division_id"],
      {
        name: "idx_mr_planning_context_owner_division_id",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_context",
      ["selera_risiko_ref_id"],
      {
        name: "idx_mr_planning_context_selera_risiko_ref_id",
      }
    );

    await queryInterface.addIndex("mr_planning_context", ["status_revisi"], {
      name: "idx_mr_planning_context_status_revisi",
    });

    await queryInterface.addIndex("mr_planning_context", ["is_active"], {
      name: "idx_mr_planning_context_is_active",
    });

    await queryInterface.addIndex("mr_planning_context", ["is_locked"], {
      name: "idx_mr_planning_context_is_locked",
    });

    await queryInterface.addIndex(
      "mr_planning_context",
      ["renstra_id", "tahun", "periode_type", "periode_label"],
      {
        name: "idx_mr_planning_context_scope_period",
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable("mr_planning_context");
  },
};