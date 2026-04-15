"use strict";

/**
 * Menambah regulasi_versi_id ke master_* (nullable + backfill versi default).
 * dataset_key tetap dipakai sebagai fallback / pemisah OPD.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const qi = queryInterface;
    const tables = await qi.showAllTables();
    const set = new Set(tables.map((t) => String(t).toLowerCase()));

    if (!set.has("regulasi_versi")) {
      console.log("[migration] ⏭️  regulasi_versi belum ada, skip add FK");
      return;
    }

    const [versiRows] = await qi.sequelize.query(
      "SELECT id FROM regulasi_versi ORDER BY id ASC LIMIT 1",
    );
    let defaultId = versiRows && versiRows[0] && versiRows[0].id;
    if (!defaultId) {
      await qi.bulkInsert("regulasi_versi", [
        {
          nama_regulasi: "Kepmendagri 900 — seed e-Pelara",
          nomor_regulasi: "SEED-EPelara-1",
          tahun: 2024,
          deskripsi: "Versi awal; samakan dengan data master impor Sheet2_Normalized.",
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);
      const [r2] = await qi.sequelize.query(
        "SELECT id FROM regulasi_versi WHERE nomor_regulasi = 'SEED-EPelara-1' LIMIT 1",
      );
      defaultId = r2 && r2[0] && r2[0].id;
    }

    const addCol = async (table) => {
      if (!set.has(table)) return;
      const desc = await qi.describeTable(table).catch(() => null);
      if (desc && desc.regulasi_versi_id) {
        console.log(`[migration] ⏭️  ${table}.regulasi_versi_id ada`);
        return;
      }
      await qi.addColumn(table, "regulasi_versi_id", {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "regulasi_versi", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      });
      await qi.addIndex(table, ["regulasi_versi_id"], {
        name: `idx_${table}_regulasi_versi_id`,
      });
      if (defaultId) {
        await qi.sequelize.query(
          `UPDATE \`${table}\` SET regulasi_versi_id = :vid WHERE regulasi_versi_id IS NULL`,
          { replacements: { vid: defaultId } },
        );
      }
    };

    await addCol("master_program");
    await addCol("master_kegiatan");
    await addCol("master_sub_kegiatan");
    await addCol("master_indikator");

    console.log("[migration] ✅ regulasi_versi_id pada master_*");
  },

  async down(queryInterface) {
    for (const table of [
      "master_indikator",
      "master_sub_kegiatan",
      "master_kegiatan",
      "master_program",
    ]) {
      const desc = await queryInterface.describeTable(table).catch(() => null);
      if (desc && desc.regulasi_versi_id) {
        await queryInterface.removeColumn(table, "regulasi_versi_id");
      }
    }
  },
};
