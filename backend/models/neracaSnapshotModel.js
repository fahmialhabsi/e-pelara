"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class NeracaSnapshot extends Model {
    static associate() {}
  }

  NeracaSnapshot.init(
    {
      tahun_anggaran: { type: DataTypes.INTEGER, allowNull: false },
      kode_akun: { type: DataTypes.STRING(30), allowNull: false },
      nama_akun: { type: DataTypes.STRING(255), allowNull: true },
      kelompok: {
        type: DataTypes.ENUM("ASET", "KEWAJIBAN", "EKUITAS"),
        allowNull: false,
      },
      nilai_tahun_ini: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
      nilai_tahun_lalu: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
      urutan: { type: DataTypes.INTEGER, allowNull: true },
      dikunci: { type: DataTypes.BOOLEAN, defaultValue: false },
    },
    {
      sequelize,
      modelName: "NeracaSnapshot",
      tableName: "neraca_snapshot",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return NeracaSnapshot;
};
