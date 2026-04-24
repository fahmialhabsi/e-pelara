"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("kewajiban_jangka_pendek", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      tahun_anggaran: { type: Sequelize.INTEGER, allowNull: false },
      jenis: {
        type: Sequelize.ENUM(
          "UTANG_BELANJA_PEGAWAI",
          "UTANG_BELANJA_BARANG",
          "UTANG_PFK",
          "PENDAPATAN_DITERIMA_DIMUKA",
          "LAINNYA",
        ),
        allowNull: false,
      },
      uraian: { type: Sequelize.TEXT, allowNull: false },
      nilai: { type: Sequelize.DECIMAL(18, 2), allowNull: false },
      jatuh_tempo: { type: Sequelize.DATEONLY, allowNull: true },
      status: {
        type: Sequelize.ENUM("OUTSTANDING", "LUNAS"),
        defaultValue: "OUTSTANDING",
      },
      keterangan: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable("piutang", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      tahun_anggaran: { type: Sequelize.INTEGER, allowNull: false },
      jenis: {
        type: Sequelize.ENUM("PIUTANG_RETRIBUSI", "PIUTANG_LAIN"),
        allowNull: false,
      },
      nama_debitur: { type: Sequelize.STRING(255), allowNull: true },
      uraian: { type: Sequelize.TEXT, allowNull: true },
      nilai: { type: Sequelize.DECIMAL(18, 2), allowNull: false },
      tanggal_jatuh_tempo: { type: Sequelize.DATEONLY, allowNull: true },
      status: {
        type: Sequelize.ENUM("BELUM_LUNAS", "LUNAS", "MACET"),
        defaultValue: "BELUM_LUNAS",
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable("persediaan", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      tahun_anggaran: { type: Sequelize.INTEGER, allowNull: false },
      nama_barang: { type: Sequelize.STRING(255), allowNull: false },
      satuan: { type: Sequelize.STRING(30), allowNull: true },
      jumlah: { type: Sequelize.DECIMAL(18, 4), defaultValue: 0 },
      harga_satuan: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 },
      nilai: {
        type: Sequelize.DECIMAL(18, 2),
        defaultValue: 0,
        comment: "jumlah × harga_satuan — diisi service",
      },
      tanggal_opname: { type: Sequelize.DATEONLY, allowNull: true },
      keterangan: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex("kewajiban_jangka_pendek", ["tahun_anggaran", "status"]);
    await queryInterface.addIndex("piutang", ["tahun_anggaran", "status"]);
    await queryInterface.addIndex("persediaan", ["tahun_anggaran"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("persediaan");
    await queryInterface.dropTable("piutang");
    await queryInterface.dropTable("kewajiban_jangka_pendek");
  },
};
