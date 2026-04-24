"use strict";

/** Audit MV: kolom alasan + versi + rpjmd_id pada rka/dpa + tabel planning_audit_events */

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
    await queryInterface.createTable("planning_audit_events", {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      module_name: { type: Sequelize.STRING(80), allowNull: false },
      table_name: { type: Sequelize.STRING(80), allowNull: false },
      record_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      action_type: { type: Sequelize.STRING(32), allowNull: false },
      old_value: { type: Sequelize.JSON, allowNull: true },
      new_value: { type: Sequelize.JSON, allowNull: true },
      change_reason_text: { type: Sequelize.TEXT, allowNull: true },
      change_reason_file: { type: Sequelize.STRING(255), allowNull: true },
      changed_by: { type: Sequelize.INTEGER, allowNull: true },
      changed_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      version_before: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      version_after: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
    });
    await queryInterface.addIndex("planning_audit_events", ["table_name", "record_id", "changed_at"], {
      name: "idx_planning_audit_table_record_time",
    });

    const addDocCols = async (table) => {
      if (!(await columnExists(queryInterface, table, "change_reason_text"))) {
        await queryInterface.addColumn(table, "change_reason_text", {
          type: Sequelize.TEXT,
          allowNull: true,
        });
      }
      if (!(await columnExists(queryInterface, table, "change_reason_file"))) {
        await queryInterface.addColumn(table, "change_reason_file", {
          type: Sequelize.STRING(255),
          allowNull: true,
        });
      }
      if (!(await columnExists(queryInterface, table, "version"))) {
        await queryInterface.addColumn(table, "version", {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false,
          defaultValue: 1,
        });
      }
      if (!(await columnExists(queryInterface, table, "is_active_version"))) {
        await queryInterface.addColumn(table, "is_active_version", {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        });
      }
      if (!(await columnExists(queryInterface, table, "rpjmd_id"))) {
        await queryInterface.addColumn(table, "rpjmd_id", {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: true,
        });
      }
    };

    await addDocCols("rka");
    await addDocCols("dpa");

    // Standardisasi anggaran → DECIMAL(20,2) (MySQL)
    try {
      await queryInterface.changeColumn("rka", "anggaran", {
        type: Sequelize.DECIMAL(20, 2),
        allowNull: true,
      });
    } catch (e) {
      console.warn("[migration] rka.anggaran alter skip:", e.message);
    }
    try {
      await queryInterface.changeColumn("dpa", "anggaran", {
        type: Sequelize.DECIMAL(20, 2),
        allowNull: true,
      });
    } catch (e) {
      console.warn("[migration] dpa.anggaran alter skip:", e.message);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("planning_audit_events").catch(() => {});
    for (const table of ["rka", "dpa"]) {
      for (const col of [
        "change_reason_text",
        "change_reason_file",
        "version",
        "is_active_version",
        "rpjmd_id",
      ]) {
        if (await columnExists(queryInterface, table, col)) {
          await queryInterface.removeColumn(table, col).catch(() => {});
        }
      }
    }
  },
};
