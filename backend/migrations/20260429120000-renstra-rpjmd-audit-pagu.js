"use strict";

/** Renstra: pagu multi-tahun + audit meta + baseline rpjmd_id. RPJMD: audit + versioning. */

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
    const addRenstraPagu = async () => {
      for (let i = 1; i <= 5; i += 1) {
        const col = `pagu_tahun_${i}`;
        if (!(await columnExists(queryInterface, "renstra", col))) {
          await queryInterface.addColumn("renstra", col, {
            type: Sequelize.DECIMAL(20, 2),
            allowNull: true,
          });
        }
      }
      if (!(await columnExists(queryInterface, "renstra", "total_pagu"))) {
        await queryInterface.addColumn("renstra", "total_pagu", {
          type: Sequelize.DECIMAL(20, 2),
          allowNull: true,
        });
      }
      for (const [col, def] of [
        ["change_reason_text", { type: Sequelize.TEXT, allowNull: true }],
        ["change_reason_file", { type: Sequelize.STRING(255), allowNull: true }],
        [
          "version",
          { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
        ],
        [
          "is_active_version",
          { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ],
        ["rpjmd_id", { type: Sequelize.INTEGER.UNSIGNED, allowNull: true }],
      ]) {
        if (!(await columnExists(queryInterface, "renstra", col))) {
          await queryInterface.addColumn("renstra", col, def);
        }
      }
    };

    const addRpjmdAudit = async () => {
      for (const [col, def] of [
        ["change_reason_text", { type: Sequelize.TEXT, allowNull: true }],
        ["change_reason_file", { type: Sequelize.STRING(255), allowNull: true }],
        [
          "version",
          { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
        ],
        [
          "is_active_version",
          { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ],
      ]) {
        if (!(await columnExists(queryInterface, "rpjmd", col))) {
          await queryInterface.addColumn("rpjmd", col, def);
        }
      }
    };

    await addRenstraPagu();
    await addRpjmdAudit();
  },

  async down(queryInterface) {
    for (const table of ["renstra"]) {
      for (const col of [
        "pagu_tahun_1",
        "pagu_tahun_2",
        "pagu_tahun_3",
        "pagu_tahun_4",
        "pagu_tahun_5",
        "total_pagu",
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
    for (const col of [
      "change_reason_text",
      "change_reason_file",
      "version",
      "is_active_version",
    ]) {
      if (await columnExists(queryInterface, "rpjmd", col)) {
        await queryInterface.removeColumn("rpjmd", col).catch(() => {});
      }
    }
  },
};
