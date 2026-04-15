"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const existing = new Set(tables.map((t) => String(t).toLowerCase()));
    if (existing.has("lra_snapshot")) {
      console.log("[migration] ⏭️  lra_snapshot sudah ada");
      return;
    }

    await queryInterface.createTable("lra_snapshot", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      tahun_anggaran: { type: Sequelize.INTEGER, allowNull: false },
      kode_akun: { type: Sequelize.STRING(30), allowNull: false },
      nama_akun: { type: Sequelize.STRING(255), allowNull: true },
      urutan: { type: Sequelize.INTEGER, allowNull: true, comment: "Urutan tampil LRA" },
      anggaran_murni: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 },
      anggaran_perubahan: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 },
      realisasi: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 },
      sisa: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 },
      persen: { type: Sequelize.DECIMAL(10, 4), defaultValue: 0 },
      realisasi_tahun_lalu: {
        type: Sequelize.DECIMAL(18, 2),
        defaultValue: 0,
        comment: "Perbandingan tahun sebelumnya",
      },
      dikunci: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: "true = LRA final",
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

    await queryInterface.addConstraint("lra_snapshot", {
      fields: ["tahun_anggaran", "kode_akun"],
      type: "unique",
      name: "unique_lra_per_akun_tahun",
    });
    await queryInterface.addIndex("lra_snapshot", ["tahun_anggaran"], {
      name: "idx_lra_snapshot_tahun",
    });
    console.log("[migration] ✅ lra_snapshot dibuat");
  },

  async down(queryInterface) {
    await queryInterface.dropTable("lra_snapshot").catch(() => {});
  },
};
