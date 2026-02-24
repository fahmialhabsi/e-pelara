// src/models/renstra_kebijakanModel.js (VERSI FINAL BENAR)
"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RenstraKebijakan extends Model {
    static associate(models) {
      // Asosiasi yang Anda definisikan sudah terlihat benar.
      RenstraKebijakan.belongsTo(models.RenstraOPD, {
        foreignKey: "renstra_id",
        as: "renstra",
      });
      RenstraKebijakan.belongsTo(models.ArahKebijakan, {
        foreignKey: "rpjmd_arah_id",
        as: "arah_kebijakan",
      });
      RenstraKebijakan.belongsTo(models.RenstraStrategi, {
        foreignKey: "strategi_id",
        as: "strategi",
      });
    }
  }

  RenstraKebijakan.init(
    {
      strategi_id: DataTypes.INTEGER,
      rpjmd_arah_id: DataTypes.INTEGER,
      kode_kebjkn: DataTypes.STRING,
      deskripsi: DataTypes.TEXT,
      prioritas: DataTypes.ENUM("Tinggi", "Sedang", "Rendah"),
      no_arah_rpjmd: DataTypes.STRING,
      isi_arah_rpjmd: DataTypes.TEXT,
      jenisDokumen: {
        type: DataTypes.STRING,
        field: "jenisDokumen",
      },
      tahun: DataTypes.STRING,
      renstra_id: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "RenstraKebijakan",
      tableName: "renstra_kebijakan",
      underscored: true,
      timestamps: false,
    }
  );

  return RenstraKebijakan;
};
