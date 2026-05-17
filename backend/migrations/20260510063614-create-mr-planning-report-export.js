"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = "mr_planning_report_export";

    const tableExists = await queryInterface.sequelize
      .query(
        `
        SELECT TABLE_NAME
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = '${tableName}'
        `,
        { type: Sequelize.QueryTypes.SELECT }
      )
      .then((rows) => rows.length > 0);

    if (!tableExists) {
      await queryInterface.createTable(tableName, {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
        },

        // =====================================================
        // RELASI UTAMA MR
        // =====================================================
        context_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        snapshot_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        dashboard_summary_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },

        // =====================================================
        // IDENTITAS REPORT / EXPORT
        // =====================================================
        report_code: {
          type: Sequelize.STRING(150),
          allowNull: true,
        },
        report_title: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        report_type: {
          type: Sequelize.ENUM(
            "risk_register",
            "risk_profile",
            "risk_map",
            "mitigation",
            "monitoring",
            "deviation",
            "warning",
            "dashboard",
            "snapshot",
            "executive_summary",
            "spip_linkage",
            "adhoc"
          ),
          allowNull: false,
          defaultValue: "adhoc",
        },
        export_format: {
          type: Sequelize.ENUM("excel", "docx", "pdf", "json", "html"),
          allowNull: false,
          defaultValue: "excel",
        },

        // =====================================================
        // PERIODE
        // =====================================================
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
          allowNull: true,
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

        // =====================================================
        // SCOPE
        // =====================================================
        renstra_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        opd_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        owner_user_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        owner_division_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },

        // =====================================================
        // FILE OUTPUT
        // =====================================================
        file_name: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        file_path: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        file_url: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        file_mime_type: {
          type: Sequelize.STRING(150),
          allowNull: true,
        },
        file_size: {
          type: Sequelize.BIGINT,
          allowNull: true,
        },
        storage_provider: {
          type: Sequelize.STRING(100),
          allowNull: true,
        },
        storage_key: {
          type: Sequelize.TEXT,
          allowNull: true,
        },

        // =====================================================
        // STATUS GENERATE
        // =====================================================
        generate_status: {
          type: Sequelize.ENUM(
            "pending",
            "processing",
            "success",
            "failed",
            "cancelled",
            "expired"
          ),
          allowNull: false,
          defaultValue: "pending",
        },
        generated_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        generated_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        expired_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        error_message: {
          type: Sequelize.TEXT,
          allowNull: true,
        },

        // =====================================================
        // APPROVAL / LOCK
        // =====================================================
        approval_status: {
          type: Sequelize.ENUM(
            "draft",
            "submitted",
            "verified",
            "approved",
            "rejected",
            "archived"
          ),
          allowNull: false,
          defaultValue: "draft",
        },
        submitted_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        submitted_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        verified_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        verified_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        approved_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        approved_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        rejected_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        rejected_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        rejection_reason: {
          type: Sequelize.TEXT,
          allowNull: true,
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

        // =====================================================
        // INTEGRASI / METADATA
        // =====================================================
        source_system: {
          type: Sequelize.STRING(100),
          allowNull: false,
          defaultValue: "e_pelara",
        },
        target_system: {
          type: Sequelize.STRING(100),
          allowNull: true,
        },
        cross_system_link_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        metadata_json: {
          type: Sequelize.JSON,
          allowNull: true,
        },
        filter_json: {
          type: Sequelize.JSON,
          allowNull: true,
        },
        summary_json: {
          type: Sequelize.JSON,
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
      });
    }

    const indexes = await queryInterface.showIndex(tableName);
    const indexNames = indexes.map((idx) => idx.name);

    const addIndexIfNotExists = async (fields, indexName) => {
      if (!indexNames.includes(indexName)) {
        await queryInterface.addIndex(tableName, fields, {
          name: indexName,
        });
      }
    };

    const [fkRows] = await queryInterface.sequelize.query(`
      SELECT
        CONSTRAINT_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = '${tableName}'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `);

    const fkNames = fkRows.map((row) => row.CONSTRAINT_NAME);

    const addFkIfNotExists = async ({
      columnName,
      constraintName,
      referencedTable,
      referencedColumn = "id",
      onUpdate = "CASCADE",
      onDelete = "SET NULL",
    }) => {
      if (!fkNames.includes(constraintName)) {
        await queryInterface.addConstraint(tableName, {
          fields: [columnName],
          type: "foreign key",
          name: constraintName,
          references: {
            table: referencedTable,
            field: referencedColumn,
          },
          onUpdate,
          onDelete,
        });
      }
    };

    // =====================================================
    // INDEX PENDEK
    // =====================================================

    await addIndexIfNotExists(["context_id"], "idx_mr_rep_ctx");
    await addIndexIfNotExists(["snapshot_id"], "idx_mr_rep_snap");
    await addIndexIfNotExists(["dashboard_summary_id"], "idx_mr_rep_dash");
    await addIndexIfNotExists(["report_code"], "idx_mr_rep_code");
    await addIndexIfNotExists(["report_type"], "idx_mr_rep_type");
    await addIndexIfNotExists(["export_format"], "idx_mr_rep_format");
    await addIndexIfNotExists(["generate_status"], "idx_mr_rep_gen_status");
    await addIndexIfNotExists(["approval_status"], "idx_mr_rep_app_status");
    await addIndexIfNotExists(["tahun"], "idx_mr_rep_tahun");
    await addIndexIfNotExists(["periode_type", "periode_label"], "idx_mr_rep_period");
    await addIndexIfNotExists(["renstra_id"], "idx_mr_rep_renstra");
    await addIndexIfNotExists(["opd_id"], "idx_mr_rep_opd");
    await addIndexIfNotExists(["owner_user_id"], "idx_mr_rep_owner_user");
    await addIndexIfNotExists(["owner_division_id"], "idx_mr_rep_owner_div");
    await addIndexIfNotExists(["generated_by"], "idx_mr_rep_gen_by");
    await addIndexIfNotExists(["created_by"], "idx_mr_rep_created_by");
    await addIndexIfNotExists(["cross_system_link_id"], "idx_mr_rep_xlink");

    await addIndexIfNotExists(
      ["context_id", "report_type", "export_format"],
      "idx_mr_rep_ctx_type_fmt"
    );

    await addIndexIfNotExists(
      ["context_id", "periode_type", "periode_label"],
      "idx_mr_rep_ctx_period"
    );

    await addIndexIfNotExists(
      ["context_id", "generate_status", "approval_status"],
      "idx_mr_rep_ctx_status"
    );

    // =====================================================
    // FOREIGN KEY PENDEK
    // =====================================================

    await addFkIfNotExists({
      columnName: "context_id",
      constraintName: "fk_mr_rep_ctx",
      referencedTable: "mr_planning_context",
      referencedColumn: "id",
    });

    await addFkIfNotExists({
      columnName: "snapshot_id",
      constraintName: "fk_mr_rep_snap",
      referencedTable: "mr_planning_snapshot",
      referencedColumn: "id",
    });

    await addFkIfNotExists({
      columnName: "dashboard_summary_id",
      constraintName: "fk_mr_rep_dash",
      referencedTable: "mr_planning_dashboard_summary",
      referencedColumn: "id",
    });

    await addFkIfNotExists({
      columnName: "cross_system_link_id",
      constraintName: "fk_mr_rep_xlink",
      referencedTable: "mr_cross_system_link",
      referencedColumn: "id",
    });
  },

  async down(queryInterface, Sequelize) {
    const tableName = "mr_planning_report_export";

    const tableExists = await queryInterface.sequelize
      .query(
        `
        SELECT TABLE_NAME
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = '${tableName}'
        `,
        { type: Sequelize.QueryTypes.SELECT }
      )
      .then((rows) => rows.length > 0);

    if (tableExists) {
      await queryInterface.dropTable(tableName);
    }
  },
};