"use strict";

/**
 * Modul TLHP — menambah nilai ENUM report_type "tlhp_monitoring" pada
 * mr_planning_report_export, supaya export Laporan Pemantauan TLHP dicatat
 * di ledger yang sama dengan Laporan MR lain (Excel/Word/PDF existing).
 */

const OLD_TYPES = [
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
  "adhoc",
];

const NEW_TYPES = [...OLD_TYPES, "tlhp_monitoring"];

const buildEnumSql = (items) => items.map((item) => `'${item}'`).join(",");

const alterReportTypeEnum = async ({ queryInterface, types, transaction }) => {
  await queryInterface.sequelize.query(
    `
      ALTER TABLE \`mr_planning_report_export\`
      MODIFY COLUMN \`report_type\` ENUM(${buildEnumSql(types)}) NOT NULL DEFAULT 'adhoc'
    `,
    { transaction }
  );
};

module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await alterReportTypeEnum({ queryInterface, types: NEW_TYPES, transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const [rows] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) AS total FROM \`mr_planning_report_export\` WHERE \`report_type\` = 'tlhp_monitoring'`,
        { transaction }
      );

      const used = Number(rows?.[0]?.total || 0);

      if (used > 0) {
        throw new Error(
          `Rollback diblokir: ${used} mr_planning_report_export sudah memakai report_type 'tlhp_monitoring'.`
        );
      }

      await alterReportTypeEnum({ queryInterface, types: OLD_TYPES, transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
