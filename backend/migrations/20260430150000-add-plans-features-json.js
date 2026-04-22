"use strict";

async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables();
  const normalized = new Set(tables.map((t) => String(t).toLowerCase()));
  return normalized.has(String(tableName).toLowerCase());
}

const FREE_FEATURES = {
  heatmap: false,
  early_warning: false,
  export: false,
  monitoring_opd: false,
};

const PRO_FEATURES = {
  heatmap: true,
  early_warning: true,
  export: true,
  monitoring_opd: true,
};

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface, "plans"))) {
      return;
    }

    let hasFeatures = false;
    try {
      const td = await queryInterface.describeTable("plans");
      hasFeatures = !!(td && td.features);
    } catch (_) {
      hasFeatures = false;
    }

    if (!hasFeatures) {
      await queryInterface.addColumn("plans", "features", {
        type: Sequelize.JSON,
        allowNull: true,
      });
    }

    const sequelize = queryInterface.sequelize;

    await sequelize.query(
      `UPDATE plans SET features = :feat WHERE code = 'free'`,
      { replacements: { feat: JSON.stringify(FREE_FEATURES) } },
    );

    const [proRows] = await sequelize.query(
      "SELECT id FROM plans WHERE code = 'pro' LIMIT 1",
    );
    if (!proRows || proRows.length === 0) {
      await queryInterface.bulkInsert("plans", [
        {
          code: "pro",
          nama: "PRO",
          deskripsi: "Paket lengkap (monitoring & ekspor)",
          features: JSON.stringify(PRO_FEATURES),
          created_at: new Date(),
        },
      ]);
    } else {
      await sequelize.query(
        `UPDATE plans SET features = :feat WHERE code = 'pro'`,
        { replacements: { feat: JSON.stringify(PRO_FEATURES) } },
      );
    }
  },

  async down(queryInterface) {
    let hasFeatures = false;
    try {
      const td = await queryInterface.describeTable("plans");
      hasFeatures = !!(td && td.features);
    } catch (_) {
      hasFeatures = false;
    }
    if (hasFeatures) {
      await queryInterface.removeColumn("plans", "features");
    }
  },
};
