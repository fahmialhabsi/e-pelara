"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RenstraPdDokumen extends Model {
    static associate(models) {
      RenstraPdDokumen.belongsTo(models.PeriodeRpjmd, {
        foreignKey: "periode_id",
        as: "periode",
      });
      RenstraPdDokumen.belongsTo(models.PerangkatDaerah, {
        foreignKey: "perangkat_daerah_id",
        as: "perangkatDaerah",
      });
      RenstraPdDokumen.belongsTo(models.RenstraOPD, {
        foreignKey: "renstra_opd_id",
        as: "renstraOpd",
      });
      RenstraPdDokumen.hasMany(models.RenjaDokumen, {
        foreignKey: "renstra_pd_dokumen_id",
        as: "renjaDokumens",
      });
    }
  }

  RenstraPdDokumen.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      periode_id: { type: DataTypes.INTEGER, allowNull: false },
      perangkat_daerah_id: { type: DataTypes.INTEGER, allowNull: false },
      judul: { type: DataTypes.STRING(512), allowNull: false },
      versi: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      status: {
        type: DataTypes.ENUM("draft", "review", "final"),
        allowNull: false,
        defaultValue: "draft",
      },
      is_final_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      tanggal_pengesahan: { type: DataTypes.DATEONLY, allowNull: true },
      derivation_key: { type: DataTypes.STRING(128), allowNull: true },
      is_test: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      renstra_opd_id: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      sequelize,
      modelName: "RenstraPdDokumen",
      tableName: "renstra_pd_dokumen",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return RenstraPdDokumen;
};
