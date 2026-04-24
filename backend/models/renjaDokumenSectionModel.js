"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RenjaDokumenSection extends Model {
    static associate(models) {
      RenjaDokumenSection.belongsTo(models.RenjaDokumen, {
        foreignKey: "renja_dokumen_id",
        as: "renjaDokumen",
      });
    }
  }

  RenjaDokumenSection.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      renja_dokumen_id: { type: DataTypes.INTEGER, allowNull: false },
      section_key: { type: DataTypes.STRING(32), allowNull: false },
      section_title: { type: DataTypes.STRING(255), allowNull: false },
      content: { type: DataTypes.TEXT("long"), allowNull: true },
      completion_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      is_locked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      source_mode: { type: DataTypes.STRING(16), allowNull: false, defaultValue: "MANUAL" },
      updated_by: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      sequelize,
      modelName: "RenjaDokumenSection",
      tableName: "renja_dokumen_section",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return RenjaDokumenSection;
};
