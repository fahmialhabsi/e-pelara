"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class LraSnapshot extends Model {
    static associate() {}
  }

  LraSnapshot.init(
    {
      tahun_anggaran: { type: DataTypes.INTEGER, allowNull: false },
      kode_akun: { type: DataTypes.STRING(30), allowNull: false },
      nama_akun: { type: DataTypes.STRING(255), allowNull: true },
      urutan: { type: DataTypes.INTEGER, allowNull: true },
      anggaran_murni: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
      anggaran_perubahan: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
      realisasi: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
      sisa: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
      persen: { type: DataTypes.DECIMAL(10, 4), defaultValue: 0 },
      realisasi_tahun_lalu: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
      dikunci: { type: DataTypes.BOOLEAN, defaultValue: false },
    },
    {
      sequelize,
      modelName: "LraSnapshot",
      tableName: "lra_snapshot",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return LraSnapshot;
};
