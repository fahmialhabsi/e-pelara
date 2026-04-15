"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class KewajibanJangkaPendek extends Model {
    static associate() {}
  }

  KewajibanJangkaPendek.init(
    {
      tahun_anggaran: { type: DataTypes.INTEGER, allowNull: false },
      jenis: {
        type: DataTypes.ENUM(
          "UTANG_BELANJA_PEGAWAI",
          "UTANG_BELANJA_BARANG",
          "UTANG_PFK",
          "PENDAPATAN_DITERIMA_DIMUKA",
          "LAINNYA",
        ),
        allowNull: false,
      },
      uraian: { type: DataTypes.TEXT, allowNull: false },
      nilai: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
      jatuh_tempo: { type: DataTypes.DATEONLY, allowNull: true },
      status: {
        type: DataTypes.ENUM("OUTSTANDING", "LUNAS"),
        defaultValue: "OUTSTANDING",
      },
      keterangan: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: "KewajibanJangkaPendek",
      tableName: "kewajiban_jangka_pendek",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return KewajibanJangkaPendek;
};
