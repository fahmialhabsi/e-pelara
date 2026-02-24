"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Misi extends Model {
    static associate(models) {
      Misi.belongsTo(models.Visi, { foreignKey: "visi_id", as: "visi" });

      // Relasi ke Tujuan
      Misi.hasMany(models.Tujuan, { as: "Tujuan", foreignKey: "misi_id" });
    }
  }
  Misi.init(
    {
      visi_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      isi_misi: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      no_misi: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      deskripsi: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      rpjmd_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      periode_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      jenis_dokumen: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      tahun: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Misi",
      tableName: "misi",
      underscored: true,
      timestamps: true,
    }
  );

  return Misi;
};
