"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RpjmdDokumen extends Model {
    static associate(models) {
      RpjmdDokumen.belongsTo(models.PeriodeRpjmd, {
        foreignKey: "periode_id",
        as: "periode",
      });
    }
  }

  RpjmdDokumen.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      periode_id: { type: DataTypes.INTEGER, allowNull: false },
      judul: { type: DataTypes.STRING(512), allowNull: false },
      versi: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      status: {
        type: DataTypes.ENUM("draft", "review", "final"),
        allowNull: false,
        defaultValue: "draft",
      },
      is_final_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      tanggal_pengesahan: { type: DataTypes.DATEONLY, allowNull: true },
    },
    {
      sequelize,
      modelName: "RpjmdDokumen",
      tableName: "rpjmd_dokumen",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return RpjmdDokumen;
};
