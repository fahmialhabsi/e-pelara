"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("lo_snapshot", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      tahun_anggaran: { type: Sequelize.INTEGER, allowNull: false },
      kode_akun: { type: Sequelize.STRING(30), allowNull: false },
      nama_akun: { type: Sequelize.STRING(255), allowNull: true },
      kelompok: {
        type: Sequelize.ENUM("PENDAPATAN_LO", "BEBAN_LO"),
        allowNull: false,
      },
      nilai_tahun_ini: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 },
      nilai_tahun_lalu: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 },
      urutan: { type: Sequelize.INTEGER, allowNull: true },
      dikunci: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addConstraint("lo_snapshot", {
      fields: ["tahun_anggaran", "kode_akun"],
      type: "unique",
      name: "unique_lo_per_akun_tahun",
    });

    await queryInterface.createTable("lpe_snapshot", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      tahun_anggaran: { type: Sequelize.INTEGER, allowNull: false },
      komponen: {
        type: Sequelize.ENUM(
          "EKUITAS_AWAL",
          "SURPLUS_DEFISIT_LO",
          "KOREKSI_PERSEDIAAN",
          "KOREKSI_ASET_TETAP",
          "KOREKSI_LAINNYA",
          "KEWAJIBAN_KONSOLIDASIKAN",
          "EKUITAS_AKHIR",
        ),
        allowNull: false,
      },
      nilai_tahun_ini: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 },
      nilai_tahun_lalu: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 },
      urutan: { type: Sequelize.INTEGER, allowNull: true },
      keterangan: { type: Sequelize.TEXT, allowNull: true },
      dikunci: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addConstraint("lpe_snapshot", {
      fields: ["tahun_anggaran", "komponen"],
      type: "unique",
      name: "unique_lpe_per_komponen_tahun",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("lpe_snapshot");
    await queryInterface.dropTable("lo_snapshot");
  },
};
