"use strict";

/**
 * Modul TLHP (Tindak Lanjut Hasil Pemeriksaan Inspektorat/BPK/BPKP)
 *
 * Tujuan:
 * Menambah nilai ENUM domain pada mr_reference_groups agar reference group
 * baru untuk TLHP (entitas pemeriksa, jenis pemeriksaan, kategori temuan,
 * status tindak lanjut) punya domain yang sesuai, bukan dipaksakan ke
 * domain existing (risk/context/analysis/mitigation/monitoring/reporting/
 * spip_linkage) yang tidak cocok secara semantik.
 *
 * Guard:
 * - Tidak menghapus domain lama.
 * - Rollback dilindungi agar tidak merusak data yang sudah memakai domain 'audit'.
 */

const OLD_DOMAINS = [
  "risk",
  "context",
  "analysis",
  "mitigation",
  "monitoring",
  "reporting",
  "spip_linkage",
];

const NEW_DOMAINS = [...OLD_DOMAINS, "audit"];

const buildEnumSql = (items) => items.map((item) => `'${item}'`).join(",");

const alterDomainEnum = async ({ queryInterface, domains, transaction }) => {
  await queryInterface.sequelize.query(
    `
      ALTER TABLE \`mr_reference_groups\`
      MODIFY COLUMN \`domain\` ENUM(${buildEnumSql(domains)}) NOT NULL DEFAULT 'risk'
    `,
    { transaction }
  );
};

module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await alterDomainEnum({ queryInterface, domains: NEW_DOMAINS, transaction });
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
        `SELECT COUNT(*) AS total FROM \`mr_reference_groups\` WHERE \`domain\` = 'audit'`,
        { transaction }
      );

      const used = Number(rows?.[0]?.total || 0);

      if (used > 0) {
        throw new Error(
          `Rollback diblokir: ${used} mr_reference_groups sudah memakai domain 'audit'. Bersihkan data tersebut dulu sebelum rollback.`
        );
      }

      await alterDomainEnum({ queryInterface, domains: OLD_DOMAINS, transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
