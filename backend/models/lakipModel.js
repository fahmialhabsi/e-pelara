"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Lakip extends Model {
    static associate(models) {
      Lakip.belongsTo(models.PeriodeRpjmd, {
        foreignKey: "periode_id",
        as: "periode",
      });

      Lakip.belongsTo(models.RenstraProgram, {
        foreignKey: "renstra_id",
        as: "renstra_program",
      });

      Lakip.belongsTo(models.Rkpd, {
        foreignKey: "rkpd_id",
        as: "rkpd",
      });

      Lakip.belongsTo(models.Renja, {
        foreignKey: "renja_id",
        as: "renja",
      });

      Lakip.belongsTo(models.LkDispang, {
        foreignKey: "lk_dispang_id",
        as: "lk_dispang",
      });
    }
  }

  Lakip.init(
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
      program: DataTypes.STRING,
      kegiatan: DataTypes.STRING,
      indikator_kinerja: DataTypes.TEXT,
      target: DataTypes.STRING,
      realisasi: DataTypes.STRING,
      evaluasi: DataTypes.TEXT,
      rekomendasi: DataTypes.TEXT,
      jenis_dokumen: DataTypes.STRING,
      renstra_id: DataTypes.INTEGER,
      rkpd_id: DataTypes.INTEGER,
      renja_id: DataTypes.INTEGER,
      lk_dispang_id: DataTypes.INTEGER,
      approval_status: {
        type: DataTypes.ENUM("DRAFT", "SUBMITTED", "APPROVED", "REJECTED"),
        allowNull: false,
        defaultValue: "DRAFT",
      },
    },
    {
      sequelize,
      modelName: "Lakip",
      tableName: "lakip",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return Lakip;
};
