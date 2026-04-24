"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class BkuObjek extends Model {
    static associate(models) {
      BkuObjek.belongsTo(models.Bku, { foreignKey: "bku_id", as: "bku" });
    }
  }

  BkuObjek.init(
    {
      bku_id: { type: DataTypes.INTEGER, allowNull: false },
      kode_akun: { type: DataTypes.STRING(30), allowNull: false },
      nama_akun: { type: DataTypes.STRING(255), allowNull: true },
      jumlah: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
      keterangan: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: "BkuObjek",
      tableName: "bku_objek",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return BkuObjek;
};
