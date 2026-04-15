"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Piutang extends Model {
    static associate() {}
  }

  Piutang.init(
    {
      tahun_anggaran: { type: DataTypes.INTEGER, allowNull: false },
      jenis: {
        type: DataTypes.ENUM("PIUTANG_RETRIBUSI", "PIUTANG_LAIN"),
        allowNull: false,
      },
      nama_debitur: { type: DataTypes.STRING(255), allowNull: true },
      uraian: { type: DataTypes.TEXT, allowNull: true },
      nilai: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
      tanggal_jatuh_tempo: { type: DataTypes.DATEONLY, allowNull: true },
      status: {
        type: DataTypes.ENUM("BELUM_LUNAS", "LUNAS", "MACET"),
        defaultValue: "BELUM_LUNAS",
      },
    },
    {
      sequelize,
      modelName: "Piutang",
      tableName: "piutang",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return Piutang;
};
