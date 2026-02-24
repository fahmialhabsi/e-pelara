"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Evaluasi extends Model {}

  Evaluasi.init(
    {
      indikator_id: { type: DataTypes.INTEGER, allowNull: false },
      tanggal_evaluasi: { type: DataTypes.DATEONLY, allowNull: false },
      catatan: { type: DataTypes.TEXT },
      rekomendasi: { type: DataTypes.TEXT },
      target: { type: DataTypes.FLOAT, allowNull: false },
      realisasi_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "realisasi_indikator",
          key: "id_realisasi",
        },
      },
      realisasi_nilai: { type: DataTypes.FLOAT, allowNull: false },
      status: {
        type: DataTypes.ENUM("Tercapai", "Tidak Tercapai"),
        allowNull: false,
      },
      jenis_dokumen: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      tahun: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Evaluasi",

      tableName: "evaluasi",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return Evaluasi;
};
