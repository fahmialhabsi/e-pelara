"use strict";

/** Kartu Inventaris Barang (KIB) + mutasi aset tetap */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("aset_tetap", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      kode_barang: {
        type: Sequelize.STRING(30),
        allowNull: true,
        unique: true,
      },
      nama_barang: { type: Sequelize.STRING(255), allowNull: false },
      kode_akun: {
        type: Sequelize.STRING(30),
        allowNull: true,
        comment: "Ref kode_akun_bas — kelompok 1.3.xx",
      },
      kategori: {
        type: Sequelize.ENUM(
          "TANAH",
          "PERALATAN_MESIN",
          "GEDUNG_BANGUNAN",
          "JALAN_IRIGASI_INSTALASI",
          "ASET_TETAP_LAINNYA",
          "KDP",
        ),
        allowNull: false,
      },
      tahun_perolehan: { type: Sequelize.INTEGER, allowNull: true },
      harga_perolehan: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 },
      akumulasi_penyusutan: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 },
      umur_ekonomis: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: "Dalam tahun",
      },
      tarif_penyusutan: {
        type: Sequelize.DECIMAL(8, 4),
        allowNull: true,
        comment: "Persentase/tahun",
      },
      kondisi: {
        type: Sequelize.ENUM("BAIK", "RUSAK_RINGAN", "RUSAK_BERAT"),
        allowNull: true,
      },
      lokasi: { type: Sequelize.TEXT, allowNull: true },
      status: {
        type: Sequelize.ENUM("AKTIF", "DIHAPUS", "DIPINDAHKAN"),
        defaultValue: "AKTIF",
      },
      keterangan: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable("mutasi_aset", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      aset_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "aset_tetap", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      tanggal: { type: Sequelize.DATEONLY, allowNull: false },
      jenis_mutasi: {
        type: Sequelize.ENUM(
          "TAMBAH_BELI",
          "TAMBAH_HIBAH",
          "TAMBAH_REKLASIFIKASI",
          "KURANG_PENGHAPUSAN",
          "KURANG_REKLASIFIKASI",
          "KURANG_PINDAH",
        ),
        allowNull: false,
      },
      nilai: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 },
      dokumen_referensi: { type: Sequelize.STRING(100), allowNull: true },
      keterangan: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex("aset_tetap", ["kategori"]);
    await queryInterface.addIndex("aset_tetap", ["status"]);
    await queryInterface.addIndex("mutasi_aset", ["aset_id"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("mutasi_aset");
    await queryInterface.dropTable("aset_tetap");
  },
};
