"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RenjaValidationRun extends Model {
    static associate(models) {
      RenjaValidationRun.belongsTo(models.RenjaDokumen, {
        foreignKey: "renja_dokumen_id",
        as: "renjaDokumen",
      });
      RenjaValidationRun.hasMany(models.RenjaMismatchResult, {
        foreignKey: "renja_validation_run_id",
        as: "mismatches",
      });
    }
  }

  RenjaValidationRun.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      renja_dokumen_id: { type: DataTypes.INTEGER, allowNull: false },
      run_type: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "full" },
      blocking_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      warning_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      info_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      summary_json: { type: DataTypes.JSON, allowNull: true },
      computed_at: { type: DataTypes.DATE, allowNull: false },
      created_by: { type: DataTypes.INTEGER, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false },
    },
    {
      sequelize,
      modelName: "RenjaValidationRun",
      tableName: "renja_validation_run",
      underscored: true,
      timestamps: false,
    },
  );

  return RenjaValidationRun;
};
