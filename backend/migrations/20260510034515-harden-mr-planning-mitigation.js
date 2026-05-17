"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = "mr_planning_mitigation";

    const getColumns = async () => queryInterface.describeTable(tableName);

    const hasColumn = async (columnName) => {
      const columns = await getColumns();
      return Boolean(columns[columnName]);
    };

    const addColumnIfMissing = async (columnName, options) => {
      if (!(await hasColumn(columnName))) {
        await queryInterface.addColumn(tableName, columnName, options);
      }
    };

    const getIndexes = async () => queryInterface.showIndex(tableName);

    const hasIndex = async (indexName) => {
      const indexes = await getIndexes();
      return indexes.some((idx) => idx.name === indexName);
    };

    const addIndexIfMissing = async (fields, options) => {
      if (!(await hasIndex(options.name))) {
        await queryInterface.addIndex(tableName, fields, options);
      }
    };

    const hasConstraint = async (constraintName) => {
      const [rows] = await queryInterface.sequelize.query(
        `
        SELECT CONSTRAINT_NAME
        FROM information_schema.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = :tableName
          AND CONSTRAINT_NAME = :constraintName
        LIMIT 1
        `,
        {
          replacements: {
            tableName,
            constraintName,
          },
        }
      );

      return rows.length > 0;
    };

    const addFkIfMissing = async ({
      constraintName,
      fields,
      referencedTable,
      referencedField = "id",
      onUpdate = "CASCADE",
      onDelete = "SET NULL",
    }) => {
      if (!(await hasConstraint(constraintName))) {
        await queryInterface.addConstraint(tableName, {
          fields,
          type: "foreign key",
          name: constraintName,
          references: {
            table: referencedTable,
            field: referencedField,
          },
          onUpdate,
          onDelete,
        });
      }
    };

    // =========================
    // CORE LINKAGE
    // =========================
    await addColumnIfMissing("context_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "mr_planning_risk_id",
    });

    await addColumnIfMissing("risk_analysis_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "context_id",
    });

    await addColumnIfMissing("root_cause_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "risk_analysis_id",
    });

    // =========================
    // RISK RESPONSE
    // =========================
    await addColumnIfMissing("respon_risiko_ref_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "jenis_mitigasi",
    });

    await addColumnIfMissing("respon_risiko", {
      type: Sequelize.STRING(150),
      allowNull: true,
      after: "respon_risiko_ref_id",
    });

    // =========================
    // SPIP / RTP REFERENCE
    // =========================
    await addColumnIfMissing("unsur_spip_ref_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "respon_risiko",
    });

    await addColumnIfMissing("unsur_spip", {
      type: Sequelize.STRING(150),
      allowNull: true,
      after: "unsur_spip_ref_id",
    });

    await addColumnIfMissing("sub_unsur_spip_ref_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "unsur_spip",
    });

    await addColumnIfMissing("sub_unsur_spip", {
      type: Sequelize.STRING(150),
      allowNull: true,
      after: "sub_unsur_spip_ref_id",
    });

    await addColumnIfMissing("output_rtp_ref_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "sub_unsur_spip",
    });

    await addColumnIfMissing("output_rtp", {
      type: Sequelize.STRING(150),
      allowNull: true,
      after: "output_rtp_ref_id",
    });

    // =========================
    // CONTROL ACTIVITY DETAIL
    // =========================
    await addColumnIfMissing("kegiatan_pengendalian", {
      type: Sequelize.TEXT,
      allowNull: true,
      after: "output_rtp",
    });

    await addColumnIfMissing("indikator_keluaran", {
      type: Sequelize.TEXT,
      allowNull: true,
      after: "target_output",
    });

    await addColumnIfMissing("target_keluaran", {
      type: Sequelize.STRING(255),
      allowNull: true,
      after: "indikator_keluaran",
    });

    await addColumnIfMissing("satuan_keluaran", {
      type: Sequelize.STRING(100),
      allowNull: true,
      after: "target_keluaran",
    });

    await addColumnIfMissing("target_waktu_mulai", {
      type: Sequelize.DATE,
      allowNull: true,
      after: "tanggal_selesai",
    });

    await addColumnIfMissing("target_waktu_selesai", {
      type: Sequelize.DATE,
      allowNull: true,
      after: "target_waktu_mulai",
    });

    // =========================
    // RISK AFTER MITIGATION
    // =========================
    await addColumnIfMissing("risk_after_mitigation_likelihood_ref_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "target_waktu_selesai",
    });

    await addColumnIfMissing("risk_after_mitigation_impact_ref_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "risk_after_mitigation_likelihood_ref_id",
    });

    await addColumnIfMissing("risk_after_mitigation_likelihood", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      after: "risk_after_mitigation_impact_ref_id",
    });

    await addColumnIfMissing("risk_after_mitigation_impact", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      after: "risk_after_mitigation_likelihood",
    });

    await addColumnIfMissing("risk_after_mitigation_score", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      after: "risk_after_mitigation_impact",
    });

    await addColumnIfMissing("risk_after_mitigation_level_ref_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "risk_after_mitigation_score",
    });

    await addColumnIfMissing("risk_after_mitigation_level", {
      type: Sequelize.STRING(100),
      allowNull: true,
      after: "risk_after_mitigation_level_ref_id",
    });

    await addColumnIfMissing("risk_after_mitigation_color", {
      type: Sequelize.STRING(50),
      allowNull: true,
      after: "risk_after_mitigation_level",
    });

    await addColumnIfMissing("is_above_appetite_after_mitigation", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      after: "risk_after_mitigation_color",
    });

    // =========================
    // CROSS SYSTEM LINKAGE
    // =========================
    await addColumnIfMissing("requires_spip_rtp", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      after: "is_above_appetite_after_mitigation",
    });

    await addColumnIfMissing("spip_link_status", {
      type: Sequelize.STRING(100),
      allowNull: true,
      after: "requires_spip_rtp",
    });

    await addColumnIfMissing("cross_system_link_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "linked_spip_evidence_id",
    });

    // =========================
    // WORKFLOW ACTOR / TIMESTAMP
    // =========================
    await addColumnIfMissing("alasan_revisi", {
      type: Sequelize.TEXT,
      allowNull: true,
      after: "status_revisi",
    });

    await addColumnIfMissing("last_revised_at", {
      type: Sequelize.DATE,
      allowNull: true,
      after: "alasan_revisi",
    });

    await addColumnIfMissing("last_revised_by", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "last_revised_at",
    });

    await addColumnIfMissing("dibuat_oleh", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "last_revised_by",
    });

    await addColumnIfMissing("diverifikasi_oleh", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "dibuat_oleh",
    });

    await addColumnIfMissing("disetujui_oleh", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "diverifikasi_oleh",
    });

    await addColumnIfMissing("ditolak_oleh", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "disetujui_oleh",
    });

    await addColumnIfMissing("dibuat_pada", {
      type: Sequelize.DATE,
      allowNull: true,
      after: "ditolak_oleh",
    });

    await addColumnIfMissing("diverifikasi_pada", {
      type: Sequelize.DATE,
      allowNull: true,
      after: "dibuat_pada",
    });

    await addColumnIfMissing("disetujui_pada", {
      type: Sequelize.DATE,
      allowNull: true,
      after: "diverifikasi_pada",
    });

    await addColumnIfMissing("ditolak_pada", {
      type: Sequelize.DATE,
      allowNull: true,
      after: "disetujui_pada",
    });

    await addColumnIfMissing("created_by", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "ditolak_pada",
    });

    await addColumnIfMissing("updated_by", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "created_by",
    });

    // =========================
    // FOREIGN KEYS WITH SHORT NAMES
    // =========================
    await addFkIfMissing({
      constraintName: "fk_mit_ctx",
      fields: ["context_id"],
      referencedTable: "mr_planning_context",
    });

    await addFkIfMissing({
      constraintName: "fk_mit_analysis",
      fields: ["risk_analysis_id"],
      referencedTable: "mr_planning_risk_analysis",
    });

    await addFkIfMissing({
      constraintName: "fk_mit_root",
      fields: ["root_cause_id"],
      referencedTable: "mr_planning_root_cause",
    });

    await addFkIfMissing({
      constraintName: "fk_mit_resp",
      fields: ["respon_risiko_ref_id"],
      referencedTable: "mr_reference_items",
    });

    await addFkIfMissing({
      constraintName: "fk_mit_unsur",
      fields: ["unsur_spip_ref_id"],
      referencedTable: "mr_reference_items",
    });

    await addFkIfMissing({
      constraintName: "fk_mit_subunsur",
      fields: ["sub_unsur_spip_ref_id"],
      referencedTable: "mr_reference_items",
    });

    await addFkIfMissing({
      constraintName: "fk_mit_output",
      fields: ["output_rtp_ref_id"],
      referencedTable: "mr_reference_items",
    });

    await addFkIfMissing({
      constraintName: "fk_mit_after_like",
      fields: ["risk_after_mitigation_likelihood_ref_id"],
      referencedTable: "mr_reference_items",
    });

    await addFkIfMissing({
      constraintName: "fk_mit_after_impact",
      fields: ["risk_after_mitigation_impact_ref_id"],
      referencedTable: "mr_reference_items",
    });

    await addFkIfMissing({
      constraintName: "fk_mit_after_level",
      fields: ["risk_after_mitigation_level_ref_id"],
      referencedTable: "mr_reference_items",
    });

    await addFkIfMissing({
      constraintName: "fk_mit_cross",
      fields: ["cross_system_link_id"],
      referencedTable: "mr_cross_system_link",
    });

    // =========================
    // INDEX WITH SHORT NAMES
    // =========================
    await addIndexIfMissing(["context_id"], {
      name: "idx_mit_context",
    });

    await addIndexIfMissing(["risk_analysis_id"], {
      name: "idx_mit_analysis",
    });

    await addIndexIfMissing(["root_cause_id"], {
      name: "idx_mit_root",
    });

    await addIndexIfMissing(["respon_risiko_ref_id"], {
      name: "idx_mit_respon",
    });

    await addIndexIfMissing(["unsur_spip_ref_id"], {
      name: "idx_mit_unsur",
    });

    await addIndexIfMissing(["sub_unsur_spip_ref_id"], {
      name: "idx_mit_subunsur",
    });

    await addIndexIfMissing(["output_rtp_ref_id"], {
      name: "idx_mit_output",
    });

    await addIndexIfMissing(["risk_after_mitigation_likelihood_ref_id"], {
      name: "idx_mit_after_like",
    });

    await addIndexIfMissing(["risk_after_mitigation_impact_ref_id"], {
      name: "idx_mit_after_impact",
    });

    await addIndexIfMissing(["risk_after_mitigation_level_ref_id"], {
      name: "idx_mit_after_level",
    });

    await addIndexIfMissing(["is_above_appetite_after_mitigation"], {
      name: "idx_mit_after_appetite",
    });

    await addIndexIfMissing(["requires_spip_rtp"], {
      name: "idx_mit_requires_spip",
    });

    await addIndexIfMissing(["spip_link_status"], {
      name: "idx_mit_spip_status",
    });

    await addIndexIfMissing(["cross_system_link_id"], {
      name: "idx_mit_cross",
    });

    await addIndexIfMissing(["status_revisi"], {
      name: "idx_mit_status",
    });

    await addIndexIfMissing(["owner_user_id"], {
      name: "idx_mit_owner_user",
    });

    await addIndexIfMissing(["owner_division_id"], {
      name: "idx_mit_owner_division",
    });

    await addIndexIfMissing(
      ["context_id", "mr_planning_risk_id", "root_cause_id", "status_revisi"],
      {
        name: "idx_mit_ctx_risk_root_status",
      }
    );
  },

  async down(queryInterface) {
    const tableName = "mr_planning_mitigation";

    const hasConstraint = async (constraintName) => {
      const [rows] = await queryInterface.sequelize.query(
        `
        SELECT CONSTRAINT_NAME
        FROM information_schema.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = :tableName
          AND CONSTRAINT_NAME = :constraintName
        LIMIT 1
        `,
        {
          replacements: {
            tableName,
            constraintName,
          },
        }
      );

      return rows.length > 0;
    };

    const removeConstraintIfExists = async (constraintName) => {
      if (await hasConstraint(constraintName)) {
        await queryInterface.removeConstraint(tableName, constraintName);
      }
    };

    const indexes = await queryInterface.showIndex(tableName);

    const hasIndex = (indexName) => indexes.some((idx) => idx.name === indexName);

    const removeIndexIfExists = async (indexName) => {
      if (hasIndex(indexName)) {
        await queryInterface.removeIndex(tableName, indexName);
      }
    };

    const columns = await queryInterface.describeTable(tableName);

    const removeColumnIfExists = async (columnName) => {
      if (columns[columnName]) {
        await queryInterface.removeColumn(tableName, columnName);
      }
    };

    const constraints = [
      "fk_mit_cross",
      "fk_mit_after_level",
      "fk_mit_after_impact",
      "fk_mit_after_like",
      "fk_mit_output",
      "fk_mit_subunsur",
      "fk_mit_unsur",
      "fk_mit_resp",
      "fk_mit_root",
      "fk_mit_analysis",
      "fk_mit_ctx",
    ];

    for (const constraintName of constraints) {
      await removeConstraintIfExists(constraintName);
    }

    const indexNames = [
      "idx_mit_ctx_risk_root_status",
      "idx_mit_owner_division",
      "idx_mit_owner_user",
      "idx_mit_status",
      "idx_mit_cross",
      "idx_mit_spip_status",
      "idx_mit_requires_spip",
      "idx_mit_after_appetite",
      "idx_mit_after_level",
      "idx_mit_after_impact",
      "idx_mit_after_like",
      "idx_mit_output",
      "idx_mit_subunsur",
      "idx_mit_unsur",
      "idx_mit_respon",
      "idx_mit_root",
      "idx_mit_analysis",
      "idx_mit_context",
    ];

    for (const indexName of indexNames) {
      await removeIndexIfExists(indexName);
    }

    const columnNames = [
      "updated_by",
      "created_by",
      "ditolak_pada",
      "disetujui_pada",
      "diverifikasi_pada",
      "dibuat_pada",
      "ditolak_oleh",
      "disetujui_oleh",
      "diverifikasi_oleh",
      "dibuat_oleh",
      "last_revised_by",
      "last_revised_at",
      "alasan_revisi",
      "cross_system_link_id",
      "spip_link_status",
      "requires_spip_rtp",
      "is_above_appetite_after_mitigation",
      "risk_after_mitigation_color",
      "risk_after_mitigation_level",
      "risk_after_mitigation_level_ref_id",
      "risk_after_mitigation_score",
      "risk_after_mitigation_impact",
      "risk_after_mitigation_likelihood",
      "risk_after_mitigation_impact_ref_id",
      "risk_after_mitigation_likelihood_ref_id",
      "target_waktu_selesai",
      "target_waktu_mulai",
      "satuan_keluaran",
      "target_keluaran",
      "indikator_keluaran",
      "kegiatan_pengendalian",
      "output_rtp",
      "output_rtp_ref_id",
      "sub_unsur_spip",
      "sub_unsur_spip_ref_id",
      "unsur_spip",
      "unsur_spip_ref_id",
      "respon_risiko",
      "respon_risiko_ref_id",
      "root_cause_id",
      "risk_analysis_id",
      "context_id",
    ];

    for (const columnName of columnNames) {
      await removeColumnIfExists(columnName);
    }
  },
};