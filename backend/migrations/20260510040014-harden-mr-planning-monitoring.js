"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = "mr_planning_monitoring";

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
    // CONTEXT LINKAGE
    // =========================
    await addColumnIfMissing("context_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "mr_planning_mitigation_id",
    });

    // =========================
    // MONITORING KEGIATAN PENGENDALIAN
    // =========================
    await addColumnIfMissing("target_waktu", {
      type: Sequelize.DATE,
      allowNull: true,
      after: "monitoring_date",
    });

    await addColumnIfMissing("realisasi_waktu", {
      type: Sequelize.DATE,
      allowNull: true,
      after: "target_waktu",
    });

    await addColumnIfMissing("status_realisasi_ref_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "realisasi_waktu",
    });

    await addColumnIfMissing("status_realisasi", {
      type: Sequelize.STRING(100),
      allowNull: true,
      after: "status_realisasi_ref_id",
    });

    await addColumnIfMissing("output_realisasi", {
      type: Sequelize.TEXT,
      allowNull: true,
      after: "realisasi_mitigasi",
    });

    await addColumnIfMissing("persentase_realisasi", {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 0,
      after: "output_realisasi",
    });

    await addColumnIfMissing("hambatan", {
      type: Sequelize.TEXT,
      allowNull: true,
      after: "persentase_realisasi",
    });

    await addColumnIfMissing("catatan_monitoring", {
      type: Sequelize.TEXT,
      allowNull: true,
      after: "tindak_lanjut",
    });

    await addColumnIfMissing("monitoring_cycle", {
      type: Sequelize.STRING(100),
      allowNull: true,
      after: "catatan_monitoring",
    });

    await addColumnIfMissing("monitoring_by", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "monitoring_cycle",
    });

    await addColumnIfMissing("owner_user_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "monitoring_by",
    });

    await addColumnIfMissing("owner_division_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "owner_user_id",
    });

    // =========================
    // RISK EVENT DETAIL
    // =========================
    await addColumnIfMissing("tempat_kejadian", {
      type: Sequelize.STRING(255),
      allowNull: true,
      after: "tanggal_kejadian",
    });

    await addColumnIfMissing("uraian_peristiwa", {
      type: Sequelize.TEXT,
      allowNull: true,
      after: "uraian_kejadian",
    });

    await addColumnIfMissing("pemicu_kejadian", {
      type: Sequelize.TEXT,
      allowNull: true,
      after: "uraian_peristiwa",
    });

    await addColumnIfMissing("dampak_aktual", {
      type: Sequelize.TEXT,
      allowNull: true,
      after: "dampak_kejadian",
    });

    await addColumnIfMissing("skor_dampak_aktual", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      after: "dampak_aktual",
    });

    await addColumnIfMissing("kode_penyebab_kejadian", {
      type: Sequelize.STRING(100),
      allowNull: true,
      after: "skor_dampak_aktual",
    });

    await addColumnIfMissing("jenis_penyebab_ref_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "kode_penyebab_kejadian",
    });

    await addColumnIfMissing("tindak_lanjut_kejadian", {
      type: Sequelize.TEXT,
      allowNull: true,
      after: "jenis_penyebab_ref_id",
    });

    // =========================
    // MONITORING LEVEL RISIKO AKTUAL
    // =========================
    await addColumnIfMissing("actual_likelihood_ref_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "tindak_lanjut_kejadian",
    });

    await addColumnIfMissing("actual_impact_ref_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "actual_likelihood_ref_id",
    });

    await addColumnIfMissing("actual_likelihood", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      after: "actual_impact_ref_id",
    });

    await addColumnIfMissing("actual_impact", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      after: "actual_likelihood",
    });

    await addColumnIfMissing("actual_score", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      after: "actual_impact",
    });

    await addColumnIfMissing("actual_level_ref_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "actual_score",
    });

    await addColumnIfMissing("actual_level", {
      type: Sequelize.STRING(100),
      allowNull: true,
      after: "actual_level_ref_id",
    });

    await addColumnIfMissing("actual_color", {
      type: Sequelize.STRING(50),
      allowNull: true,
      after: "actual_level",
    });

    await addColumnIfMissing("level_change", {
      type: Sequelize.STRING(100),
      allowNull: true,
      after: "actual_color",
    });

    await addColumnIfMissing("risk_trend", {
      type: Sequelize.STRING(100),
      allowNull: true,
      after: "level_change",
    });

    await addColumnIfMissing("is_above_appetite_actual", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      after: "risk_trend",
    });

    // =========================
    // CONTROL EFFECTIVENESS
    // =========================
    await addColumnIfMissing("hasil_pengendalian", {
      type: Sequelize.TEXT,
      allowNull: true,
      after: "is_above_appetite_actual",
    });

    await addColumnIfMissing("efektivitas_pengendalian_ref_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "hasil_pengendalian",
    });

    await addColumnIfMissing("efektivitas_pengendalian", {
      type: Sequelize.STRING(150),
      allowNull: true,
      after: "efektivitas_pengendalian_ref_id",
    });

    await addColumnIfMissing("perubahan_level_risiko", {
      type: Sequelize.STRING(100),
      allowNull: true,
      after: "efektivitas_pengendalian",
    });

    await addColumnIfMissing("rekomendasi_evaluasi", {
      type: Sequelize.TEXT,
      allowNull: true,
      after: "perubahan_level_risiko",
    });

    await addColumnIfMissing("komentar_pemilik_risiko", {
      type: Sequelize.TEXT,
      allowNull: true,
      after: "rekomendasi_evaluasi",
    });

    await addColumnIfMissing("tanggal_evaluasi", {
      type: Sequelize.DATE,
      allowNull: true,
      after: "komentar_pemilik_risiko",
    });

    await addColumnIfMissing("evaluator_user_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "tanggal_evaluasi",
    });

    // =========================
    // AUDIT TEKNIS
    // =========================
    await addColumnIfMissing("updated_by", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "created_by",
    });

    // =========================
    // FOREIGN KEYS WITH SHORT NAMES
    // =========================
    await addFkIfMissing({
      constraintName: "fk_mon_ctx",
      fields: ["context_id"],
      referencedTable: "mr_planning_context",
    });

    await addFkIfMissing({
      constraintName: "fk_mon_status_real",
      fields: ["status_realisasi_ref_id"],
      referencedTable: "mr_reference_items",
    });

    await addFkIfMissing({
      constraintName: "fk_mon_jenis_penyebab",
      fields: ["jenis_penyebab_ref_id"],
      referencedTable: "mr_reference_items",
    });

    await addFkIfMissing({
      constraintName: "fk_mon_actual_like",
      fields: ["actual_likelihood_ref_id"],
      referencedTable: "mr_reference_items",
    });

    await addFkIfMissing({
      constraintName: "fk_mon_actual_impact",
      fields: ["actual_impact_ref_id"],
      referencedTable: "mr_reference_items",
    });

    await addFkIfMissing({
      constraintName: "fk_mon_actual_level",
      fields: ["actual_level_ref_id"],
      referencedTable: "mr_reference_items",
    });

    await addFkIfMissing({
      constraintName: "fk_mon_effectiveness",
      fields: ["efektivitas_pengendalian_ref_id"],
      referencedTable: "mr_reference_items",
    });

    // Catatan:
    // mr_planning_risk_id dan mr_planning_mitigation_id belum diberi FK di migration ini
    // karena tabel existing bisa saja memiliki data legacy/orphan.

    // =========================
    // INDEX WITH SHORT NAMES
    // =========================
    await addIndexIfMissing(["context_id"], {
      name: "idx_mon_context",
    });

    await addIndexIfMissing(["status_realisasi_ref_id"], {
      name: "idx_mon_status_real_ref",
    });

    await addIndexIfMissing(["monitoring_date"], {
      name: "idx_mon_date",
    });

    await addIndexIfMissing(["target_waktu"], {
      name: "idx_mon_target_time",
    });

    await addIndexIfMissing(["realisasi_waktu"], {
      name: "idx_mon_real_time",
    });

    await addIndexIfMissing(["monitoring_by"], {
      name: "idx_mon_by",
    });

    await addIndexIfMissing(["owner_user_id"], {
      name: "idx_mon_owner_user",
    });

    await addIndexIfMissing(["owner_division_id"], {
      name: "idx_mon_owner_division",
    });

    await addIndexIfMissing(["terjadi_risiko"], {
      name: "idx_mon_event_flag",
    });

    await addIndexIfMissing(["tanggal_kejadian"], {
      name: "idx_mon_event_date",
    });

    await addIndexIfMissing(["jenis_penyebab_ref_id"], {
      name: "idx_mon_jenis_penyebab",
    });

    await addIndexIfMissing(["actual_likelihood_ref_id"], {
      name: "idx_mon_actual_like",
    });

    await addIndexIfMissing(["actual_impact_ref_id"], {
      name: "idx_mon_actual_impact",
    });

    await addIndexIfMissing(["actual_level_ref_id"], {
      name: "idx_mon_actual_level",
    });

    await addIndexIfMissing(["is_above_appetite_actual"], {
      name: "idx_mon_actual_appetite",
    });

    await addIndexIfMissing(["efektivitas_pengendalian_ref_id"], {
      name: "idx_mon_effectiveness_ref",
    });

    await addIndexIfMissing(["tanggal_evaluasi"], {
      name: "idx_mon_eval_date",
    });

    await addIndexIfMissing(["evaluator_user_id"], {
      name: "idx_mon_evaluator",
    });

    await addIndexIfMissing(
      ["context_id", "mr_planning_risk_id", "mr_planning_mitigation_id", "periode_type", "periode_label"],
      {
        name: "idx_mon_ctx_risk_mit_period",
      }
    );

    await addIndexIfMissing(
      ["context_id", "terjadi_risiko", "tanggal_kejadian"],
      {
        name: "idx_mon_ctx_event_date",
      }
    );

    await addIndexIfMissing(
      ["context_id", "is_above_appetite_actual", "actual_level"],
      {
        name: "idx_mon_ctx_appetite_level",
      }
    );
  },

  async down(queryInterface) {
    const tableName = "mr_planning_monitoring";

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

    // =========================
    // REMOVE FK FIRST
    // =========================
    const constraints = [
      "fk_mon_effectiveness",
      "fk_mon_actual_level",
      "fk_mon_actual_impact",
      "fk_mon_actual_like",
      "fk_mon_jenis_penyebab",
      "fk_mon_status_real",
      "fk_mon_ctx",
    ];

    for (const constraintName of constraints) {
      await removeConstraintIfExists(constraintName);
    }

    // =========================
    // REMOVE INDEX
    // =========================
    const indexNames = [
      "idx_mon_ctx_appetite_level",
      "idx_mon_ctx_event_date",
      "idx_mon_ctx_risk_mit_period",
      "idx_mon_evaluator",
      "idx_mon_eval_date",
      "idx_mon_effectiveness_ref",
      "idx_mon_actual_appetite",
      "idx_mon_actual_level",
      "idx_mon_actual_impact",
      "idx_mon_actual_like",
      "idx_mon_jenis_penyebab",
      "idx_mon_event_date",
      "idx_mon_event_flag",
      "idx_mon_owner_division",
      "idx_mon_owner_user",
      "idx_mon_by",
      "idx_mon_real_time",
      "idx_mon_target_time",
      "idx_mon_date",
      "idx_mon_status_real_ref",
      "idx_mon_context",
    ];

    for (const indexName of indexNames) {
      await removeIndexIfExists(indexName);
    }

    // =========================
    // REMOVE COLUMNS
    // =========================
    const columnNames = [
      "updated_by",
      "evaluator_user_id",
      "tanggal_evaluasi",
      "komentar_pemilik_risiko",
      "rekomendasi_evaluasi",
      "perubahan_level_risiko",
      "efektivitas_pengendalian",
      "efektivitas_pengendalian_ref_id",
      "hasil_pengendalian",
      "is_above_appetite_actual",
      "risk_trend",
      "level_change",
      "actual_color",
      "actual_level",
      "actual_level_ref_id",
      "actual_score",
      "actual_impact",
      "actual_likelihood",
      "actual_impact_ref_id",
      "actual_likelihood_ref_id",
      "tindak_lanjut_kejadian",
      "jenis_penyebab_ref_id",
      "kode_penyebab_kejadian",
      "skor_dampak_aktual",
      "dampak_aktual",
      "pemicu_kejadian",
      "uraian_peristiwa",
      "tempat_kejadian",
      "owner_division_id",
      "owner_user_id",
      "monitoring_by",
      "monitoring_cycle",
      "catatan_monitoring",
      "hambatan",
      "persentase_realisasi",
      "output_realisasi",
      "status_realisasi",
      "status_realisasi_ref_id",
      "realisasi_waktu",
      "target_waktu",
      "context_id",
    ];

    for (const columnName of columnNames) {
      await removeColumnIfExists(columnName);
    }
  },
};