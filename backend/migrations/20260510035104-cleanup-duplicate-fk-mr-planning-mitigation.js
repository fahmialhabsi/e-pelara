"use strict";

module.exports = {
  async up(queryInterface) {
    const tableName = "mr_planning_mitigation";

    const keepConstraints = new Set([
      "fk_mit_ctx",
      "fk_mit_analysis",
      "fk_mit_root",
      "fk_mit_resp",
      "fk_mit_unsur",
      "fk_mit_subunsur",
      "fk_mit_output",
      "fk_mit_after_like",
      "fk_mit_after_impact",
      "fk_mit_after_level",
      "fk_mit_cross",
    ]);

    const duplicateColumns = [
      "context_id",
      "risk_analysis_id",
      "root_cause_id",
      "respon_risiko_ref_id",
      "unsur_spip_ref_id",
      "sub_unsur_spip_ref_id",
      "output_rtp_ref_id",
    ];

    const [rows] = await queryInterface.sequelize.query(
      `
      SELECT
        CONSTRAINT_NAME,
        COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = :tableName
        AND REFERENCED_TABLE_NAME IS NOT NULL
        AND COLUMN_NAME IN (:duplicateColumns)
      `,
      {
        replacements: {
          tableName,
          duplicateColumns,
        },
      }
    );

    for (const row of rows) {
      const constraintName = row.CONSTRAINT_NAME;

      if (!keepConstraints.has(constraintName)) {
        await queryInterface.removeConstraint(tableName, constraintName);
      }
    }
  },

  async down() {
    // Tidak dibuat rollback otomatis.
    // Constraint yang dibersihkan adalah constraint duplicate dari migration gagal parsial.
    // FK pendek yang benar tetap dipertahankan.
  },
};