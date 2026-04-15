"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class LkKinerja extends Model {
    static associate() {}
  }

  LkKinerja.init(
    {
      tahun_anggaran: { type: DataTypes.INTEGER, allowNull: false },
      kode_referensi: { type: DataTypes.STRING(64), allowNull: true },
      judul: { type: DataTypes.STRING(255), allowNull: true },
      target: { type: DataTypes.TEXT, allowNull: true },
      realisasi: { type: DataTypes.TEXT, allowNull: true },
      satuan: { type: DataTypes.STRING(64), allowNull: true },
      kuartal: { type: DataTypes.INTEGER, allowNull: true },
      payload: { type: DataTypes.JSON, allowNull: true },
      sumber: { type: DataTypes.STRING(32), defaultValue: "SIGAP" },
    },
    {
      sequelize,
      modelName: "LkKinerja",
      tableName: "lk_kinerja",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return LkKinerja;
};
