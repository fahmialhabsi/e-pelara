"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Bmd extends Model {
    static associate(models) {
      Bmd.belongsTo(models.PeriodeRpjmd, {
        foreignKey: "periode_id",
        as: "periode",
      });
    }
  }

  Bmd.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      nama_barang: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      kode_barang: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      tahun_perolehan: DataTypes.STRING,
      kondisi: DataTypes.STRING,
      nilai_perolehan: DataTypes.DOUBLE,
      sumber_dana: DataTypes.STRING,
      keterangan: DataTypes.TEXT,
      jenis_dokumen: DataTypes.STRING,
      periode_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Bmd",
      tableName: "bmd",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return Bmd;
};
