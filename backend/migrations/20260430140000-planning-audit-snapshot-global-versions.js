"use strict";

async function columnExists(queryInterface, table, column) {
  try {
    const desc = await queryInterface.describeTable(table);
    return Object.prototype.hasOwnProperty.call(desc, column);
  } catch {
    return false;
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await columnExists(queryInterface, "planning_audit_events", "snapshot"))) {
      await queryInterface.addColumn("planning_audit_events", "snapshot", {
        type: Sequelize.JSON,
        allowNull: true,
        comment:
          "Envelope standar: before, after, changed_fields[], summary — backward compatible",
      });
    }

    await queryInterface.createTable("planning_document_versions", {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      document_type: {
        type: Sequelize.STRING(48),
        allowNull: false,
        comment: "Mis. rpjmd, renstra, renja, rkpd, rka, dpa, renja_dokumen, rkpd_dokumen",
      },
      document_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
      },
      version_number: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
      },
      previous_version_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        comment: "Rujukan baris versi sebelumnya (tanpa FK agar migrasi MySQL aman)",
      },
      action: {
        type: Sequelize.STRING(40),
        allowNull: false,
      },
      actor_id: { type: Sequelize.INTEGER, allowNull: true },
      reason_text: { type: Sequelize.TEXT, allowNull: true },
      reason_file: { type: Sequelize.STRING(255), allowNull: true },
      snapshot: { type: Sequelize.JSON, allowNull: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addIndex(
      "planning_document_versions",
      ["document_type", "document_id", "version_number"],
      { name: "idx_planning_doc_ver_type_id_ver" },
    );
    await queryInterface.addIndex("planning_document_versions", ["document_type", "document_id", "created_at"], {
      name: "idx_planning_doc_ver_type_id_time",
    });

    const addPaguCols = async (table) => {
      for (let i = 1; i <= 5; i += 1) {
        const col = `pagu_year_${i}`;
        if (!(await columnExists(queryInterface, table, col))) {
          await queryInterface.addColumn(table, col, {
            type: Sequelize.DECIMAL(20, 2),
            allowNull: true,
          });
        }
      }
      if (!(await columnExists(queryInterface, table, "pagu_total"))) {
        await queryInterface.addColumn(table, "pagu_total", {
          type: Sequelize.DECIMAL(20, 2),
          allowNull: true,
        });
      }
    };

    for (const t of ["renja", "rkpd", "rka", "dpa"]) {
      try {
        await addPaguCols(t);
      } catch (e) {
        console.warn(`[migration] pagu cols skip ${t}:`, e.message);
      }
    }
  },

  async down(queryInterface) {
    for (const t of ["renja", "rkpd", "rka", "dpa"]) {
      for (const col of [
        "pagu_year_1",
        "pagu_year_2",
        "pagu_year_3",
        "pagu_year_4",
        "pagu_year_5",
        "pagu_total",
      ]) {
        if (await columnExists(queryInterface, t, col)) {
          await queryInterface.removeColumn(t, col).catch(() => {});
        }
      }
    }
    await queryInterface.dropTable("planning_document_versions").catch(() => {});
    if (await columnExists(queryInterface, "planning_audit_events", "snapshot")) {
      await queryInterface.removeColumn("planning_audit_events", "snapshot").catch(() => {});
    }
  },
};
