"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class LkPdfRiwayat extends Model {
    static associate() {}
  }

  LkPdfRiwayat.init(
    {
      tahun_anggaran: { type: DataTypes.INTEGER, allowNull: false },
      filename: { type: DataTypes.STRING(255), allowNull: false },
      filepath: { type: DataTypes.STRING(512), allowNull: false },
      size_bytes: { type: DataTypes.INTEGER, allowNull: true },
      user_id: { type: DataTypes.INTEGER, allowNull: true },
      username: { type: DataTypes.STRING(128), allowNull: true },
    },
    {
      sequelize,
      modelName: "LkPdfRiwayat",
      tableName: "lk_pdf_riwayat",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return LkPdfRiwayat;
};
