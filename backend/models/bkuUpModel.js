"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class BkuUp extends Model {
    static associate(models) {
      BkuUp.belongsTo(models.Bku, { foreignKey: "bku_id", as: "bku_pencairan" });
      BkuUp.belongsTo(models.Bku, { foreignKey: "setoran_bku_id", as: "bku_setoran" });
    }
  }

  BkuUp.init(
    {
      tahun_anggaran: { type: DataTypes.INTEGER, allowNull: false },
      jenis: { type: DataTypes.ENUM("UP", "GU", "TUP"), allowNull: false },
      tanggal: { type: DataTypes.DATEONLY, allowNull: false },
      nominal: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
      sisa_up: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
      status: {
        type: DataTypes.ENUM(
          "AKTIF",
          "GU_PENDING",
          "LUNAS",
          "SETOR_KEMBALI",
        ),
        defaultValue: "AKTIF",
      },
      sigap_up_id: { type: DataTypes.INTEGER, allowNull: true },
      keterangan: { type: DataTypes.TEXT, allowNull: true },
      nomor_bukti: { type: DataTypes.STRING(60), allowNull: true },
      nomor_sp2d: { type: DataTypes.STRING(50), allowNull: true },
      bku_id: { type: DataTypes.INTEGER, allowNull: true },
      setoran_bku_id: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      sequelize,
      modelName: "BkuUp",
      tableName: "bku_up",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return BkuUp;
};
