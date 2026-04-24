"use strict";

/**
 * Resolusi manual SPLIT: 1 old master_sub → banyak new master_sub, dengan scope transaksi.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const qi = queryInterface;
    const tables = await qi.showAllTables();
    const set = new Set(tables.map((t) => String(t).toLowerCase()));
    if (set.has("mapping_sub_kegiatan_resolution")) {
      console.log("[migration] ⏭️  mapping_sub_kegiatan_resolution sudah ada");
      return;
    }
    if (!set.has("mapping_sub_kegiatan")) {
      console.log(
        "[migration] ⏭️  mapping_sub_kegiatan belum ada, skip resolution table",
      );
      return;
    }

    await qi.createTable("mapping_sub_kegiatan_resolution", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      mapping_sub_kegiatan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "mapping_sub_kegiatan", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      old_master_sub_kegiatan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "master_sub_kegiatan", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      selected_new_master_sub_kegiatan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "master_sub_kegiatan", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      /** Referensi logis ke OPD; tanpa FK DB agar kompatibel lintas lingkungan */
      opd_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      tahun: { type: Sequelize.INTEGER, allowNull: true },
      jenis_dokumen: { type: Sequelize.STRING(64), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      resolved_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      resolved_at: { type: Sequelize.DATE, allowNull: true },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    await qi.addIndex(
      "mapping_sub_kegiatan_resolution",
      [
        "mapping_sub_kegiatan_id",
        "opd_id",
        "tahun",
        "jenis_dokumen",
        "is_active",
      ],
      {
        name: "idx_mapping_sub_res_scope",
      },
    );

    console.log("[migration] ✅ mapping_sub_kegiatan_resolution");
  },

  async down(queryInterface) {
    await queryInterface
      .dropTable("mapping_sub_kegiatan_resolution")
      .catch(() => {});
  },
};
