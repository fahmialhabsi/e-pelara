"use strict";

/**
 * Satu Renstra OPD aktif per kombinasi (nama_opd + rpjmd_id) dan per opd_id:
 * jika lebih dari satu baris is_aktif = true, hanya pertahankan id terkecil.
 */
module.exports = {
  async up(queryInterface) {
    const qi = queryInterface.sequelize;

    await qi.query(
      `
      UPDATE renstra_opd r
      INNER JOIN (
        SELECT TRIM(COALESCE(nama_opd, '')) AS nlabel, rpjmd_id, MIN(id) AS keeper_id
        FROM renstra_opd
        WHERE is_aktif = 1
        GROUP BY TRIM(COALESCE(nama_opd, '')), rpjmd_id
        HAVING COUNT(*) > 1
      ) t
        ON TRIM(COALESCE(r.nama_opd, '')) = t.nlabel
       AND (r.rpjmd_id <=> t.rpjmd_id)
      SET r.is_aktif = 0
      WHERE r.is_aktif = 1 AND r.id <> t.keeper_id
      `,
      { raw: true }
    );

    await qi.query(
      `
      UPDATE renstra_opd r
      INNER JOIN (
        SELECT opd_id, MIN(id) AS keeper_id
        FROM renstra_opd
        WHERE is_aktif = 1 AND opd_id IS NOT NULL
        GROUP BY opd_id
        HAVING COUNT(*) > 1
      ) t ON r.opd_id = t.opd_id
      SET r.is_aktif = 0
      WHERE r.is_aktif = 1 AND r.id <> t.keeper_id
      `,
      { raw: true }
    );
  },

  async down() {
    // Tidak mengembalikan flag is_aktif lama.
  },
};
