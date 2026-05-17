"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("mr_planning_context_item", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      mr_planning_context_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "mr_planning_context",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },

      jenis_konteks_ref_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "mr_reference_items",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },

      jenis_konteks: {
        type: Sequelize.STRING(100),
        allowNull: true,
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
        allowNull: true,
      },

      opd_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
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

      indikator_id: {
        type: Sequelize.INTEGER,
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

      kode_konteks: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },

      nama_konteks: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },

      uraian_konteks: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      kode_indikator: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },

      nama_indikator: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      satuan: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },

      baseline: {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: true,
      },

      target_tahun_1: {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: true,
      },

      target_tahun_2: {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: true,
      },

      target_tahun_3: {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: true,
      },

      target_tahun_4: {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: true,
      },

      target_tahun_5: {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: true,
      },

      target_tahun_6: {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: true,
      },

      target_akhir: {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: true,
      },

      pagu_tahun_1: {
        type: Sequelize.DECIMAL(20, 2),
        allowNull: true,
      },

      pagu_tahun_2: {
        type: Sequelize.DECIMAL(20, 2),
        allowNull: true,
      },

      pagu_tahun_3: {
        type: Sequelize.DECIMAL(20, 2),
        allowNull: true,
      },

      pagu_tahun_4: {
        type: Sequelize.DECIMAL(20, 2),
        allowNull: true,
      },

      pagu_tahun_5: {
        type: Sequelize.DECIMAL(20, 2),
        allowNull: true,
      },

      pagu_tahun_6: {
        type: Sequelize.DECIMAL(20, 2),
        allowNull: true,
      },

      pagu_akhir: {
        type: Sequelize.DECIMAL(20, 2),
        allowNull: true,
      },

      penanggung_jawab: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },

      urutan: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

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

    await queryInterface.addIndex(
      "mr_planning_context_item",
      ["mr_planning_context_id"],
      {
        name: "idx_mr_planning_context_item_context_id",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_context_item",
      ["jenis_konteks_ref_id"],
      {
        name: "idx_mr_planning_context_item_jenis_konteks_ref_id",
      }
    );

    await queryInterface.addIndex("mr_planning_context_item", ["renstra_id"], {
      name: "idx_mr_planning_context_item_renstra_id",
    });

    await queryInterface.addIndex("mr_planning_context_item", ["opd_id"], {
      name: "idx_mr_planning_context_item_opd_id",
    });

    await queryInterface.addIndex("mr_planning_context_item", ["stage"], {
      name: "idx_mr_planning_context_item_stage",
    });

    await queryInterface.addIndex("mr_planning_context_item", ["ref_id"], {
      name: "idx_mr_planning_context_item_ref_id",
    });

    await queryInterface.addIndex("mr_planning_context_item", ["indikator_id"], {
      name: "idx_mr_planning_context_item_indikator_id",
    });

    await queryInterface.addIndex(
      "mr_planning_context_item",
      ["source_table", "source_id"],
      {
        name: "idx_mr_planning_context_item_source",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_context_item",
      ["mr_planning_context_id", "stage", "ref_id", "indikator_id"],
      {
        name: "idx_mr_planning_context_item_context_stage_ref_indikator",
      }
    );

    await queryInterface.addIndex(
      "mr_planning_context_item",
      ["mr_planning_context_id", "is_primary"],
      {
        name: "idx_mr_planning_context_item_context_primary",
      }
    );

    await queryInterface.addIndex("mr_planning_context_item", ["is_active"], {
      name: "idx_mr_planning_context_item_is_active",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("mr_planning_context_item");
  },
};