"use strict";

/** Kolom alasan + versi + rpjmd_id pada tabel legacy renja & rkpd */

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

    await addDocCols("renja");
    await addDocCols("rkpd");

    for (const [table, col] of [
      ["renja", "anggaran"],
      ["rkpd", "pagu_anggaran"],
      ["rkpd", "anggaran"],
    ]) {
      try {
        await queryInterface.changeColumn(table, col, {
          type: Sequelize.DECIMAL(20, 2),
          allowNull: true,
        });
      } catch (e) {
        console.warn(`[migration] ${table}.${col} alter skip:`, e.message);
      }
    }
  },

  async down(queryInterface) {
    for (const table of ["renja", "rkpd"]) {
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
