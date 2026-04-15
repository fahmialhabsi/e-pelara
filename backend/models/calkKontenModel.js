"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CalkKonten extends Model {
    static associate(models) {
      CalkKonten.belongsTo(models.CalkTemplate, {
        foreignKey: "template_id",
        as: "template",
      });
    }
  }

  CalkKonten.init(
    {
      tahun_anggaran: { type: DataTypes.INTEGER, allowNull: false },
      template_id: { type: DataTypes.INTEGER, allowNull: false },
      konten: { type: DataTypes.TEXT("long"), allowNull: true },
      data_otomatis: { type: DataTypes.JSON, allowNull: true },
      variabel: { type: DataTypes.JSON, allowNull: true },
      status: {
        type: DataTypes.ENUM("DRAFT", "FINAL"),
        defaultValue: "DRAFT",
      },
      terakhir_diedit: { type: DataTypes.DATE, allowNull: true },
      diedit_oleh: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      sequelize,
      modelName: "CalkKonten",
      tableName: "calk_konten",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return CalkKonten;
};
