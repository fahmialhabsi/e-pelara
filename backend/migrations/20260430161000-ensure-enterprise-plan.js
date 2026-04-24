"use strict";

async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables();
  const normalized = new Set(tables.map((t) => String(t).toLowerCase()));
  return normalized.has(String(tableName).toLowerCase());
}

const ENTERPRISE_FEATURES = {
  heatmap: true,
  early_warning: true,
  export: true,
  monitoring_opd: true,
  dedicated_support: true,
  custom_sla: true,
};

module.exports = {
  async up(queryInterface) {
    if (!(await tableExists(queryInterface, "plans"))) return;

    const sequelize = queryInterface.sequelize;
    const [rows] = await sequelize.query(
      "SELECT id FROM plans WHERE code = 'enterprise' LIMIT 1",
    );
    if (!rows || rows.length === 0) {
      await queryInterface.bulkInsert("plans", [
        {
          code: "enterprise",
          nama: "Enterprise",
          deskripsi: "Paket organisasi besar, dukungan prioritas, SLA kustom.",
          features: JSON.stringify(ENTERPRISE_FEATURES),
          created_at: new Date(),
        },
      ]);
    } else {
      await sequelize.query(
        `UPDATE plans SET features = :feat, deskripsi = COALESCE(NULLIF(TRIM(deskripsi), ''), :desc) WHERE code = 'enterprise'`,
        {
          replacements: {
            feat: JSON.stringify(ENTERPRISE_FEATURES),
            desc:
              "Paket organisasi besar, dukungan prioritas, SLA kustom.",
          },
        },
      );
    }
  },

  async down() {
    /* Menghapus plan enterprise dapat gagal jika masih dipakai subscription */
  },
};
