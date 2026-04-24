"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class JurnalDetail extends Model {
    static associate(models) {
      JurnalDetail.belongsTo(models.JurnalUmum, {
        foreignKey: "jurnal_id",
        as: "jurnal",
      });
    }
  }

  JurnalDetail.init(
    {
      jurnal_id: { type: DataTypes.INTEGER, allowNull: false },
      kode_akun: { type: DataTypes.STRING(30), allowNull: false },
      nama_akun: { type: DataTypes.STRING(255), allowNull: true },
      uraian: { type: DataTypes.TEXT, allowNull: true },
      debit: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
      },
      kredit: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
      },
      urutan: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      sequelize,
      modelName: "JurnalDetail",
      tableName: "jurnal_detail",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return JurnalDetail;
};
