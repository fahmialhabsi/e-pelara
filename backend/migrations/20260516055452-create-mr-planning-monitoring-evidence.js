"use strict";

/**
 * Migration: create mr_planning_monitoring_evidence
 * ---------------------------------------------------------------------------
 * PHASE REPORT 2026 — STEP R17B-4C-4I
 * Monitoring/Realisasi — Bukti Realisasi Aktual Rencana Tindak Pengendalian
 *
 * Guard:
 * - Bukti realisasi aktual berbeda dari Dokumen RTP.
 * - Dokumen RTP tetap berada di mr_planning_mitigation_documents.
 * - Bukti realisasi aktual berada di mr_planning_monitoring_evidence.
 * - Bukti wajib melekat ke monitoring/realisasi.
 * - Tidak ada hard delete.
 * - Pembatalan bukti memakai status_bukti + is_active + cancelled_*.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "mr_planning_monitoring_evidence",
        {
          id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
          },

          // =====================================================
          // RELASI UTAMA
          // =====================================================
          mr_planning_monitoring_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: "mr_planning_monitoring",
              key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
          },

          mr_planning_mitigation_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
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
            references: {
              model: "mr_planning_risk",
              key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
          },

          context_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: "mr_planning_context",
              key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
          },

          // =====================================================
          // IDENTITAS BUKTI REALISASI
          // =====================================================
          evidence_type: {
            type: Sequelize.ENUM(
              "FOTO_KEGIATAN",
              "BERITA_ACARA",
              "NOTULEN",
              "LAPORAN_PROGRESS",
              "BUKTI_PERTANGGUNGJAWABAN",
              "BUKTI_PEMBAYARAN",
              "DOKUMENTASI_PELAKSANAAN",
              "BUKTI_TINDAK_LANJUT",
              "DOKUMEN_OUTPUT_AKTUAL",
              "BUKTI_VERIFIKASI"
            ),
            allowNull: false,
          },

          evidence_title: {
            type: Sequelize.STRING(255),
            allowNull: false,
          },

          evidence_number: {
            type: Sequelize.STRING(150),
            allowNull: true,
          },

          evidence_date: {
            type: Sequelize.DATEONLY,
            allowNull: true,
          },

          realization_period: {
            type: Sequelize.STRING(100),
            allowNull: true,
          },

          progress_percentage: {
            type: Sequelize.DECIMAL(5, 2),
            allowNull: true,
            defaultValue: 0,
          },

          description: {
            type: Sequelize.TEXT,
            allowNull: true,
          },

          // =====================================================
          // FILE METADATA
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
            allowNull: true,
          },

          file_size: {
            type: Sequelize.BIGINT,
            allowNull: true,
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
          // STATUS / SOFT CANCEL
          // =====================================================
          status_bukti: {
            type: Sequelize.ENUM("aktif", "dibatalkan"),
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
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },

          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal(
              "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
            ),
          },
        },
        { transaction }
      );

      await queryInterface.addIndex(
        "mr_planning_monitoring_evidence",
        ["mr_planning_monitoring_id"],
        {
          name: "idx_mr_monitoring_evidence_monitoring_id",
          transaction,
        }
      );

      await queryInterface.addIndex(
        "mr_planning_monitoring_evidence",
        ["mr_planning_mitigation_id"],
        {
          name: "idx_mr_monitoring_evidence_mitigation_id",
          transaction,
        }
      );

      await queryInterface.addIndex(
        "mr_planning_monitoring_evidence",
        ["mr_planning_risk_id"],
        {
          name: "idx_mr_monitoring_evidence_risk_id",
          transaction,
        }
      );

      await queryInterface.addIndex(
        "mr_planning_monitoring_evidence",
        ["context_id"],
        {
          name: "idx_mr_monitoring_evidence_context_id",
          transaction,
        }
      );

      await queryInterface.addIndex(
        "mr_planning_monitoring_evidence",
        ["evidence_type"],
        {
          name: "idx_mr_monitoring_evidence_type",
          transaction,
        }
      );

      await queryInterface.addIndex(
        "mr_planning_monitoring_evidence",
        ["status_bukti"],
        {
          name: "idx_mr_monitoring_evidence_status_bukti",
          transaction,
        }
      );

      await queryInterface.addIndex(
        "mr_planning_monitoring_evidence",
        ["is_active"],
        {
          name: "idx_mr_monitoring_evidence_is_active",
          transaction,
        }
      );

      await queryInterface.addIndex(
        "mr_planning_monitoring_evidence",
        ["uploaded_at"],
        {
          name: "idx_mr_monitoring_evidence_uploaded_at",
          transaction,
        }
      );
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable("mr_planning_monitoring_evidence", {
        transaction,
      });

      if (queryInterface.sequelize.getDialect() === "postgres") {
        await queryInterface.sequelize.query(
          'DROP TYPE IF EXISTS "enum_mr_planning_monitoring_evidence_evidence_type";',
          { transaction }
        );

        await queryInterface.sequelize.query(
          'DROP TYPE IF EXISTS "enum_mr_planning_monitoring_evidence_status_bukti";',
          { transaction }
        );
      }
    });
  },
};