"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class AsetTetap extends Model {
    static associate(models) {
      AsetTetap.hasMany(models.MutasiAset, {
        foreignKey: "aset_id",
        as: "mutasi",
      });
    }
  }

  AsetTetap.init(
    {
      kode_barang: { type: DataTypes.STRING(30), allowNull: true, unique: true },
      nama_barang: { type: DataTypes.STRING(255), allowNull: false },
      kode_akun: { type: DataTypes.STRING(30), allowNull: true },
      kategori: {
        type: DataTypes.ENUM(
          "TANAH",
          "PERALATAN_MESIN",
          "GEDUNG_BANGUNAN",
          "JALAN_IRIGASI_INSTALASI",
          "ASET_TETAP_LAINNYA",
          "KDP",
        ),
        allowNull: false,
      },
      tahun_perolehan: { type: DataTypes.INTEGER, allowNull: true },
      harga_perolehan: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
      akumulasi_penyusutan: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
      umur_ekonomis: { type: DataTypes.INTEGER, allowNull: true },
      tarif_penyusutan: { type: DataTypes.DECIMAL(8, 4), allowNull: true },
      kondisi: {
        type: DataTypes.ENUM("BAIK", "RUSAK_RINGAN", "RUSAK_BERAT"),
        allowNull: true,
      },
      lokasi: { type: DataTypes.TEXT, allowNull: true },
      status: {
        type: DataTypes.ENUM("AKTIF", "DIHAPUS", "DIPINDAHKAN"),
        defaultValue: "AKTIF",
      },
      keterangan: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: "AsetTetap",
      tableName: "aset_tetap",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return AsetTetap;
};
