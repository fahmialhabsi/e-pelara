"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RkpdDokumenVersion extends Model {
    static associate(models) {
      RkpdDokumenVersion.belongsTo(models.RkpdDokumen, {
        foreignKey: "rkpd_dokumen_id",
        as: "rkpdDokumen",
      });
    }
  }

  RkpdDokumenVersion.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      rkpd_dokumen_id: { type: DataTypes.INTEGER, allowNull: false },
      version_number: { type: DataTypes.INTEGER, allowNull: false },
      snapshot_data: { type: DataTypes.JSON, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false },
      created_by: { type: DataTypes.INTEGER, allowNull: true },
      is_current: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      status: { type: DataTypes.STRING(24), allowNull: false, defaultValue: "draft" },
    },
    {
      sequelize,
      modelName: "RkpdDokumenVersion",
      tableName: "rkpd_dokumen_version",
      underscored: true,
      timestamps: false,
    },
  );

  return RkpdDokumenVersion;
};
