"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class BkuUp extends Model {
    static associate() {}
  }

  BkuUp.init(
    {
      tahun_anggaran: { type: DataTypes.INTEGER, allowNull: false },
      jenis: { type: DataTypes.ENUM("UP", "GU", "TUP"), allowNull: false },
      tanggal: { type: DataTypes.DATEONLY, allowNull: false },
      nominal: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
      sisa_up: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
      status: {
        type: DataTypes.ENUM(
          "AKTIF",
          "GU_PENDING",
          "LUNAS",
          "SETOR_KEMBALI",
        ),
        defaultValue: "AKTIF",
      },
      sigap_up_id: { type: DataTypes.INTEGER, allowNull: true },
      keterangan: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: "BkuUp",
      tableName: "bku_up",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return BkuUp;
};
