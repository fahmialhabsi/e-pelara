"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CalkTemplate extends Model {
    static associate(models) {
      CalkTemplate.hasMany(models.CalkKonten, {
        foreignKey: "template_id",
        as: "konten_rows",
      });
    }
  }

  CalkTemplate.init(
    {
      bab: { type: DataTypes.INTEGER, allowNull: false },
      sub_bab: { type: DataTypes.STRING(10), allowNull: true },
      judul: { type: DataTypes.STRING(255), allowNull: false },
      konten_default: { type: DataTypes.TEXT("long"), allowNull: true },
      tipe: {
        type: DataTypes.ENUM("TEKS", "TABEL_AUTO", "TABEL_MANUAL", "CAMPURAN"),
        allowNull: false,
      },
      sumber_data: { type: DataTypes.STRING(100), allowNull: true },
      urutan: { type: DataTypes.INTEGER, allowNull: false },
      wajib: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: "CalkTemplate",
      tableName: "calk_template",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return CalkTemplate;
};
