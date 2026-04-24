"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class LakSnapshot extends Model {
    static associate() {}
  }

  LakSnapshot.init(
    {
      tahun_anggaran: { type: DataTypes.INTEGER, allowNull: false },
      kelompok: {
        type: DataTypes.ENUM(
          "AKTIVITAS_OPERASI",
          "AKTIVITAS_INVESTASI",
          "AKTIVITAS_PENDANAAN",
          "SALDO_KAS",
        ),
        allowNull: false,
      },
      komponen: { type: DataTypes.STRING(100), allowNull: false },
      uraian: { type: DataTypes.TEXT, allowNull: true },
      nilai_tahun_ini: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
      nilai_tahun_lalu: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
      urutan: { type: DataTypes.INTEGER, allowNull: true },
      dikunci: { type: DataTypes.BOOLEAN, defaultValue: false },
    },
    {
      sequelize,
      modelName: "LakSnapshot",
      tableName: "lak_snapshot",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return LakSnapshot;
};
