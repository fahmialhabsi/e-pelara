"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class MutasiAset extends Model {
    static associate(models) {
      MutasiAset.belongsTo(models.AsetTetap, {
        foreignKey: "aset_id",
        as: "aset",
      });
    }
  }

  MutasiAset.init(
    {
      aset_id: { type: DataTypes.INTEGER, allowNull: false },
      tanggal: { type: DataTypes.DATEONLY, allowNull: false },
      jenis_mutasi: {
        type: DataTypes.ENUM(
          "TAMBAH_BELI",
          "TAMBAH_HIBAH",
          "TAMBAH_REKLASIFIKASI",
          "KURANG_PENGHAPUSAN",
          "KURANG_REKLASIFIKASI",
          "KURANG_PINDAH",
        ),
        allowNull: false,
      },
      nilai: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
      dokumen_referensi: { type: DataTypes.STRING(100), allowNull: true },
      keterangan: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: "MutasiAset",
      tableName: "mutasi_aset",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return MutasiAset;
};
