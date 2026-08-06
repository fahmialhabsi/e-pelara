"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class LoSnapshot extends Model {
    static associate() {}
  }

  LoSnapshot.init(
    {
      tahun_anggaran: { type: DataTypes.INTEGER, allowNull: false },
      kode_akun: { type: DataTypes.STRING(30), allowNull: false },
      nama_akun: { type: DataTypes.STRING(255), allowNull: true },
      kelompok: {
        type: DataTypes.ENUM("PENDAPATAN_LO", "BEBAN_LO"),
        allowNull: false,
      },
      nilai_tahun_ini: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
      nilai_tahun_lalu: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
      urutan: { type: DataTypes.INTEGER, allowNull: true },
      dikunci: { type: DataTypes.BOOLEAN, defaultValue: false },
      needs_recall: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      recall_reason: { type: DataTypes.STRING(255), allowNull: true },
      last_recall_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: "LoSnapshot",
      tableName: "lo_snapshot",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return LoSnapshot;
};
