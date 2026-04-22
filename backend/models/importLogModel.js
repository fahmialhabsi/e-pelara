"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ImportLog extends Model {
    static associate(models) {
      ImportLog.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
      ImportLog.belongsTo(models.PeriodeRpjmd, { foreignKey: "periode_id", as: "periode" });
      ImportLog.belongsTo(models.Tenant, { foreignKey: "tenant_id", as: "tenant" });
    }
  }

  ImportLog.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      preview_id: { type: DataTypes.STRING(64), allowNull: true, unique: true },
      user_id: { type: DataTypes.INTEGER, allowNull: true },
      periode_id: { type: DataTypes.INTEGER, allowNull: false },
      jumlah_berhasil: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      jumlah_gagal: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      tenant_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 1,
        references: { model: "tenants", key: "id" },
      },
    },
    {
      sequelize,
      modelName: "ImportLog",
      tableName: "import_logs",
      underscored: true,
      timestamps: false,
    },
  );

  return ImportLog;
};
