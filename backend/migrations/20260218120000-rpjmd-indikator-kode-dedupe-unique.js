"use strict";

/**
 * Hardening impor RPJMD: hapus duplikat kode_indikator (pertahankan id terbesar),
 * lalu UNIQUE(kode_indikator) per tabel indikator.
 *
 * Down: hanya DROP INDEX (data yang sudah dihapus saat up tidak bisa dipulihkan).
 */

const TABLES = [
  "indikatortujuans",
  "indikatorsasarans",
  "indikatorstrategis",
  "indikatorarahkebijakans",
  "indikatorprograms",
  "indikatorkegiatans",
  "indikatorsubkegiatans",
];

const INDEX_NAME = "uniq_kode_indikator_rpjmd_import";

module.exports = {
  async up(queryInterface) {
    const qi = queryInterface.sequelize;
    for (const table of TABLES) {
      await qi.query(
        `
        DELETE t FROM \`${table}\` t
        LEFT JOIN (
          SELECT kode_indikator, MAX(id) AS mid FROM \`${table}\` GROUP BY kode_indikator
        ) k ON t.kode_indikator = k.kode_indikator AND t.id = k.mid
        WHERE k.mid IS NULL
        `,
        { raw: true },
      );
      await qi.query(
        `
        ALTER TABLE \`${table}\`
        ADD UNIQUE KEY \`${INDEX_NAME}\` (\`kode_indikator\`)
        `,
        { raw: true },
      );
    }
  },

  async down(queryInterface) {
    const qi = queryInterface.sequelize;
    for (const table of TABLES) {
      await qi.query(
        `
        ALTER TABLE \`${table}\` DROP INDEX \`${INDEX_NAME}\`
        `,
        { raw: true },
      );
    }
  },
};
