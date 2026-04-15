"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RenjaRevisionLog extends Model {
    static associate(models) {
      RenjaRevisionLog.belongsTo(models.RenjaDokumen, {
        foreignKey: "renja_dokumen_id",
        as: "renjaDokumen",
      });
      RenjaRevisionLog.belongsTo(models.RenjaDokumenVersion, {
        foreignKey: "from_version_id",
        as: "fromVersion",
      });
      RenjaRevisionLog.belongsTo(models.RenjaDokumenVersion, {
        foreignKey: "to_version_id",
        as: "toVersion",
      });
    }
  }

  RenjaRevisionLog.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      renja_dokumen_id: { type: DataTypes.INTEGER, allowNull: false },
      from_version_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      to_version_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      revision_type: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "perubahan" },
      change_reason: { type: DataTypes.TEXT, allowNull: true },
      created_by: { type: DataTypes.INTEGER, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false },
    },
    {
      sequelize,
      modelName: "RenjaRevisionLog",
      tableName: "renja_revision_log",
      underscored: true,
      timestamps: false,
    },
  );

  return RenjaRevisionLog;
};
