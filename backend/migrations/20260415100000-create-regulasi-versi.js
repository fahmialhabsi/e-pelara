"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const existing = new Set(tables.map((t) => String(t).toLowerCase()));
    if (existing.has("regulasi_versi")) {
      console.log("[migration] ⏭️  regulasi_versi sudah ada");
      return;
    }

    await queryInterface.createTable("regulasi_versi", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      nama_regulasi: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      nomor_regulasi: {
        type: Sequelize.STRING(128),
        allowNull: false,
      },
      tahun: {
        type: Sequelize.SMALLINT,
        allowNull: false,
      },
      deskripsi: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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

    await queryInterface.addIndex("regulasi_versi", ["tahun"], {
      name: "idx_regulasi_versi_tahun",
    });
    await queryInterface.addIndex("regulasi_versi", ["is_active"], {
      name: "idx_regulasi_versi_is_active",
    });
    await queryInterface.addIndex(
      "regulasi_versi",
      ["nomor_regulasi", "tahun"],
      {
        unique: true,
        name: "uq_regulasi_versi_nomor_tahun",
      },
    );

    console.log("[migration] ✅ regulasi_versi dibuat");
  },

  async down(queryInterface) {
    await queryInterface.dropTable("regulasi_versi").catch(() => {});
  },
};
