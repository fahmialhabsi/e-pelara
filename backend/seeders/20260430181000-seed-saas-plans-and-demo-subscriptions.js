"use strict";

/**
 * Menormalisasi JSON fitur untuk FREE / PRO / ENTERPRISE dan
 * menetapkan subscription aktif tenant urutan id: free → pro → enterprise (demo QA).
 *
 * Jalankan: npx sequelize-cli db:seed --seed 20260430181000-seed-saas-plans-and-demo-subscriptions.js
 */

const FREE = {
  heatmap: false,
  early_warning: false,
  export: false,
  monitoring_opd: false,
};
const PRO = {
  heatmap: true,
  early_warning: true,
  export: true,
  monitoring_opd: true,
};
const ENT = {
  heatmap: true,
  early_warning: true,
  export: true,
  monitoring_opd: true,
  dedicated_support: true,
  custom_sla: true,
};

module.exports = {
  async up(queryInterface) {
    const s = queryInterface.sequelize;
    const [planTables] = await s.query("SHOW TABLES LIKE 'plans'");
    if (!planTables || planTables.length === 0) return;

    for (const [code, feat] of [
      ["free", FREE],
      ["pro", PRO],
      ["enterprise", ENT],
    ]) {
      await s.query(`UPDATE plans SET features = :j WHERE code = :c`, {
        replacements: { j: JSON.stringify(feat), c: code },
      });
    }

    const [subTables] = await s.query("SHOW TABLES LIKE 'subscriptions'");
    const [tenTables] = await s.query("SHOW TABLES LIKE 'tenants'");
    if (!subTables?.length || !tenTables?.length) return;

    const [tenants] = await s.query(
      "SELECT id FROM tenants ORDER BY id ASC LIMIT 3",
    );
    if (!tenants || tenants.length === 0) return;

    const planCodes = ["free", "pro", "enterprise"];
    for (let i = 0; i < tenants.length; i++) {
      const tid = tenants[i].id;
      const code = planCodes[i] || "free";

      const [pRows] = await s.query(
        "SELECT id FROM plans WHERE code = :c LIMIT 1",
        { replacements: { c: code } },
      );
      const pr = pRows && pRows[0];
      if (!pr) continue;

      const [activeRows] = await s.query(
        "SELECT id FROM subscriptions WHERE tenant_id = :t AND status = 'active' ORDER BY id DESC LIMIT 1",
        { replacements: { t: tid } },
      );

      if (activeRows && activeRows.length) {
        await s.query("UPDATE subscriptions SET plan_id = :pid WHERE id = :id", {
          replacements: { pid: pr.id, id: activeRows[0].id },
        });
      } else {
        await s.query(
          `INSERT INTO subscriptions (tenant_id, plan_id, status, started_at, created_at)
           VALUES (:t, :pid, 'active', NOW(), NOW())`,
          { replacements: { t: tid, pid: pr.id } },
        );
      }
    }
  },

  async down() {
    /* seed demo — tidak di-rollback */
  },
};
