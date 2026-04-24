"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RenjaSnapshot extends Model {
    static associate(models) {
      RenjaSnapshot.belongsTo(models.RenjaDokumen, {
        foreignKey: "renja_dokumen_id",
        as: "renjaDokumen",
      });
      RenjaSnapshot.belongsTo(models.RenjaDokumenVersion, {
        foreignKey: "renja_dokumen_version_id",
        as: "renjaDokumenVersion",
      });
    }
  }

  RenjaSnapshot.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      renja_dokumen_id: { type: DataTypes.INTEGER, allowNull: false },
      renja_dokumen_version_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      snapshot_type: { type: DataTypes.STRING(32), allowNull: false },
      snapshot_data: { type: DataTypes.JSON, allowNull: true },
      snapshot_hash: { type: DataTypes.STRING(64), allowNull: true },
      created_by: { type: DataTypes.INTEGER, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false },
    },
    {
      sequelize,
      modelName: "RenjaSnapshot",
      tableName: "renja_snapshot",
      underscored: true,
      timestamps: false,
    },
  );

  return RenjaSnapshot;
};
