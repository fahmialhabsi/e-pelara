"use strict";

/**
 * Modul TLHP — bukti dukung Tindak Lanjut (bukti setoran, surat
 * pertanggungjawaban, berita acara, dst). Mirror dari
 * mr_planning_mitigation_documents.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("mr_planning_tindak_lanjut_documents", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      mr_planning_tindak_lanjut_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "mr_planning_tindak_lanjut",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },

      mr_planning_temuan_rekomendasi_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      mr_planning_temuan_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      context_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      document_type: {
        type: Sequelize.ENUM(
          "BUKTI_SETORAN",
          "SURAT_PERTANGGUNGJAWABAN",
          "BERITA_ACARA_TINDAK_LANJUT",
          "SK_PENERAPAN",
          "DOKUMEN_PENDUKUNG_LAINNYA"
        ),
        allowNull: false,
      },

      document_title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },

      document_number: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },

      document_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },

      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      file_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },

      original_file_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },

      file_path: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },

      file_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },

      mime_type: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },

      file_size: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      storage_provider: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: "local",
      },

      checksum: {
        type: Sequelize.STRING(128),
        allowNull: true,
      },

      status_dokumen: {
        type: Sequelize.ENUM("draft", "aktif", "dibatalkan"),
        allowNull: false,
        defaultValue: "aktif",
      },

      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      uploaded_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      uploaded_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      cancelled_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      cancelled_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      cancel_reason: {
        type: Sequelize.TEXT,
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
        defaultValue: Sequelize.fn("NOW"),
      },

      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    await queryInterface.addIndex("mr_planning_tindak_lanjut_documents", ["mr_planning_tindak_lanjut_id"], {
      name: "idx_mrpltld_tindak_lanjut_id",
    });
    await queryInterface.addIndex("mr_planning_tindak_lanjut_documents", ["mr_planning_temuan_rekomendasi_id"], {
      name: "idx_mrpltld_rekomendasi_id",
    });
    await queryInterface.addIndex("mr_planning_tindak_lanjut_documents", ["mr_planning_temuan_id"], {
      name: "idx_mrpltld_temuan_id",
    });
    await queryInterface.addIndex("mr_planning_tindak_lanjut_documents", ["context_id"], {
      name: "idx_mrpltld_context_id",
    });
    await queryInterface.addIndex("mr_planning_tindak_lanjut_documents", ["document_type"], {
      name: "idx_mrpltld_document_type",
    });
    await queryInterface.addIndex("mr_planning_tindak_lanjut_documents", ["status_dokumen"], {
      name: "idx_mrpltld_status_dokumen",
    });
    await queryInterface.addIndex("mr_planning_tindak_lanjut_documents", ["is_active"], {
      name: "idx_mrpltld_is_active",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("mr_planning_tindak_lanjut_documents");
  },
};
