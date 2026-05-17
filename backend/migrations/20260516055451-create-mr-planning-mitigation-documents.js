"use strict";

/** @type {import("sequelize-cli").Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("mr_planning_mitigation_documents", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },

      // =====================================================
      // RELASI UTAMA
      // =====================================================
      mr_planning_mitigation_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "mr_planning_mitigation",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },

      mr_planning_risk_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      context_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      // =====================================================
      // IDENTITAS DOKUMEN RENCANA TINDAK PENGENDALIAN
      // =====================================================
      document_type: {
        type: Sequelize.ENUM(
          "SK_TIM_TINDAK_LANJUT",
          "SURAT_TUGAS_TIM_TINDAK_LANJUT",
          "RENCANA_AKSI",
          "DOKUMEN_PENDUKUNG_RENCANA"
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

      // =====================================================
      // METADATA DOKUMEN
      // =====================================================
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

      // =====================================================
      // STATUS DOKUMEN
      // =====================================================
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

      // =====================================================
      // AKTOR DAN WAKTU
      // =====================================================
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

      // =====================================================
      // AUDIT
      // =====================================================
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

    await queryInterface.addIndex("mr_planning_mitigation_documents", [
      "mr_planning_mitigation_id",
    ]);

    await queryInterface.addIndex("mr_planning_mitigation_documents", [
      "mr_planning_risk_id",
    ]);

    await queryInterface.addIndex("mr_planning_mitigation_documents", [
      "context_id",
    ]);

    await queryInterface.addIndex("mr_planning_mitigation_documents", [
      "document_type",
    ]);

    await queryInterface.addIndex("mr_planning_mitigation_documents", [
      "status_dokumen",
    ]);

    await queryInterface.addIndex("mr_planning_mitigation_documents", [
      "is_active",
    ]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("mr_planning_mitigation_documents");
  },
};