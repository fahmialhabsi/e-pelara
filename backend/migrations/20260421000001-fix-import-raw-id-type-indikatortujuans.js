"use strict";

/**
 * Fix: kolom import_raw_id di indikatortujuans mungkin INTEGER (dari sync() lama / schema lama).
 * Migration ini memastikan kolom bertipe VARCHAR(40) — idempotent.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const td = await queryInterface.describeTable("indikatortujuans").catch(() => null);
    if (!td) return;

    const qi = queryInterface.sequelize;

    if (!td.import_raw_id) {
      // Kolom belum ada sama sekali — tambahkan
      await queryInterface.addColumn("indikatortujuans", "import_raw_id", {
        type: Sequelize.STRING(40),
        allowNull: true,
        defaultValue: null,
      });
    } else {
      // Kolom sudah ada — cek tipenya
      const colType = String(td.import_raw_id.type || "").toUpperCase();
      const isStringType =
        colType.includes("VARCHAR") ||
        colType.includes("CHAR") ||
        colType.includes("TEXT");

      if (!isStringType) {
        // Tipe salah (mis. INT) — paksa ubah ke VARCHAR(40)
        // Kosongkan dulu nilai yang tidak valid agar ALTER tidak gagal constraint
        await qi.query(
          `UPDATE indikatortujuans SET import_raw_id = NULL WHERE import_raw_id IS NOT NULL AND import_raw_id NOT REGEXP '^[0-9a-fA-F]{1,40}$'`,
          { raw: true }
        ).catch(() => {});

        await qi.query(
          `ALTER TABLE indikatortujuans MODIFY COLUMN import_raw_id VARCHAR(40) NULL DEFAULT NULL`,
          { raw: true }
        );
      }
    }

    // Pastikan unique index ada
    try {
      await qi.query(
        `CREATE UNIQUE INDEX uniq_indikatortujuans_periode_import_raw
         ON indikatortujuans (periode_id, import_raw_id)`,
        { raw: true }
      );
    } catch (e) {
      if (!/Duplicate key name|already exists/i.test(String(e && e.message))) throw e;
    }
  },

  async down(queryInterface) {
    const td = await queryInterface.describeTable("indikatortujuans").catch(() => null);
    if (!td) return;
    const qi = queryInterface.sequelize;
    await qi
      .query(`ALTER TABLE indikatortujuans DROP INDEX uniq_indikatortujuans_periode_import_raw`)
      .catch(() => {});
    if (td.import_raw_id) {
      await queryInterface.removeColumn("indikatortujuans", "import_raw_id");
    }
  },
};
