"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RenjaDataFixDocLock extends Model {
    static associate(models) {
      RenjaDataFixDocLock.belongsTo(models.RenjaDokumen, {
        foreignKey: "renja_dokumen_id",
        as: "renjaDokumen",
      });
    }
  }

  RenjaDataFixDocLock.init(
    {
      renja_dokumen_id: { type: DataTypes.INTEGER, primaryKey: true },
      user_id: { type: DataTypes.INTEGER, allowNull: false },
      lock_expires_at: { type: DataTypes.DATE, allowNull: false },
    },
    {
      sequelize,
      modelName: "RenjaDataFixDocLock",
      tableName: "renja_data_fix_doc_lock",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return RenjaDataFixDocLock;
};
