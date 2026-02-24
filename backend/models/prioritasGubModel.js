"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PrioritasGubernur extends Model {
    static associate(models) {
      PrioritasGubernur.belongsTo(models.Sasaran, {
        foreignKey: "sasaran_id",
        as: "Sasaran",
      });
      PrioritasGubernur.hasMany(models.Rkpd, {
        foreignKey: "prioritas_kepala_daerah_id",
        as: "rkpd",
      });
    }
  }

  PrioritasGubernur.init(
    {
      kode_priogub: { type: DataTypes.STRING, allowNull: false },
      nama_priogub: { type: DataTypes.STRING, allowNull: false },
      uraian_priogub: { type: DataTypes.STRING(100), allowNull: false },
      opd_tujuan: { type: DataTypes.TEXT, allowNull: true },
      standar_layanan_opd: { type: DataTypes.TEXT, allowNull: true },
      jenis_dokumen: { type: DataTypes.STRING(100), allowNull: false },
      tahun: { type: DataTypes.INTEGER, allowNull: false },
      periode_id: { type: DataTypes.INTEGER, allowNull: false },
      sasaran_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "sasaran",
          key: "id",
        },
      },
    },
    {
      sequelize,
      modelName: "PrioritasGubernur",
      tableName: "prioritas_kepala_daerah",
      timestamps: false,
      indexes: [
        {
          name: "unique_priogub_combination",
          unique: true,
          fields: [
            "kode_priogub",
            "uraian_priogub",
            "jenis_dokumen",
            "tahun",
            "periode_id",
          ],
        },
      ],
    }
  );

  return PrioritasGubernur;
};
