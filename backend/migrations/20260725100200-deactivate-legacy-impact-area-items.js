"use strict";

/**
 * Group reference IMPACT_AREA TERNYATA sudah ada sejak seeder awal
 * (20260510114255-seed-mr-reference-items.js) dengan 10 item taksonomi umum
 * (PERFORMANCE_TARGET, FINANCE_BUDGET, dst) — baru ketahuan SETELAH seeder
 * 20260725100100 menambah 5 item baru sesuai Pedoman No 2 Form Coaching
 * Clinic Inspektorat (BEBAN_KEUANGAN/REPUTASI/K3/KINERJA/TEMUAN_PEMERIKSAAN),
 * membuat group ini campur 15 item dari 2 taksonomi berbeda.
 *
 * Dicek: 10 item lama TIDAK PERNAH direferensikan kode aplikasi manapun
 * (backend/frontend) — cuma ada di seeder sendiri, jadi aman dinonaktifkan
 * (bukan dihapus, supaya reversible & tidak melanggar FK kalau ada baris lama
 * yang somehow sudah pakai id-nya). Dropdown "Area Dampak"
 * (StepRiskAnalysis.jsx) HARUS hanya menampilkan 5 item Pedoman No 2 —
 * itu yang jadi basis kriteria ambang di Lampiran 7.1B laporan MR.
 */

const LEGACY_KODE_ITEMS = [
  "PERFORMANCE_TARGET",
  "FINANCE_BUDGET",
  "COMPLIANCE_REGULATION",
  "OPERATIONAL_SERVICE",
  "REPUTATION_PUBLIC_TRUST",
  "ASSET_INFRASTRUCTURE",
  "HUMAN_RESOURCE_ORGANIZATION",
  "DATA_INFORMATION_SYSTEM",
  "SPIP_INTERNAL_CONTROL",
  "ACCOUNTABILITY_REPORTING",
];

module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const [groupRows] = await queryInterface.sequelize.query(
        `SELECT id FROM mr_reference_groups WHERE kode_group = 'IMPACT_AREA' LIMIT 1`,
        { transaction }
      );
      const group = Array.isArray(groupRows) ? groupRows[0] : null;

      if (group?.id) {
        await queryInterface.bulkUpdate(
          "mr_reference_items",
          { is_active: false },
          { group_id: group.id, kode_item: LEGACY_KODE_ITEMS },
          { transaction }
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const [groupRows] = await queryInterface.sequelize.query(
        `SELECT id FROM mr_reference_groups WHERE kode_group = 'IMPACT_AREA' LIMIT 1`,
        { transaction }
      );
      const group = Array.isArray(groupRows) ? groupRows[0] : null;

      if (group?.id) {
        await queryInterface.bulkUpdate(
          "mr_reference_items",
          { is_active: true },
          { group_id: group.id, kode_item: LEGACY_KODE_ITEMS },
          { transaction }
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
