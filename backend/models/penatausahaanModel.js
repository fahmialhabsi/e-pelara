"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Penatausahaan extends Model {
    static associate(models) {
      Penatausahaan.belongsTo(models.PeriodeRpjmd, {
        foreignKey: "periode_id",
        as: "periode",
      });

      Penatausahaan.belongsTo(models.Dpa, {
        foreignKey: "dpa_id",
        as: "dpa",
      });
    }
  }

  Penatausahaan.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      tahun: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      periode_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      tanggal_transaksi: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      uraian: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      jumlah: {
        type: DataTypes.DOUBLE,
        allowNull: false,
      },
      jenis_transaksi: DataTypes.STRING,
      bukti: DataTypes.STRING,
      sumber_dana: DataTypes.STRING,
      jenis_dokumen: DataTypes.STRING,
      dpa_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Penatausahaan",
      tableName: "penatausahaan",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return Penatausahaan;
};
