"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RenstraTabelPrioritas extends Model {
    static associate(models) {
      // Tidak ada FK langsung, hanya terhubung via renstra_id
    }
  }

  RenstraTabelPrioritas.init(
    {
      renstra_id: DataTypes.INTEGER,
      jenis_prioritas: {
        type: DataTypes.ENUM("nasional", "daerah", "gubernur"),
        defaultValue: "nasional",
      },
      nama_prioritas: DataTypes.STRING(255),
      kode_prioritas: DataTypes.STRING(50),
      indikator: DataTypes.STRING(255),
      baseline: DataTypes.FLOAT,
      satuan_target: DataTypes.STRING(100),
      lokasi: DataTypes.STRING(255),
      opd_penanggung_jawab: DataTypes.STRING(255),
      program_terkait: DataTypes.STRING(255),
      kegiatan_terkait: DataTypes.STRING(255),
      target_tahun_1: DataTypes.FLOAT,
      target_tahun_2: DataTypes.FLOAT,
      target_tahun_3: DataTypes.FLOAT,
      target_tahun_4: DataTypes.FLOAT,
      target_tahun_5: DataTypes.FLOAT,
      target_tahun_6: DataTypes.FLOAT,
      pagu_tahun_1: DataTypes.DECIMAL(20, 2),
      pagu_tahun_2: DataTypes.DECIMAL(20, 2),
      pagu_tahun_3: DataTypes.DECIMAL(20, 2),
      pagu_tahun_4: DataTypes.DECIMAL(20, 2),
      pagu_tahun_5: DataTypes.DECIMAL(20, 2),
      pagu_tahun_6: DataTypes.DECIMAL(20, 2),
      target_akhir_renstra: DataTypes.DECIMAL(10, 2),
      pagu_akhir_renstra: DataTypes.DECIMAL(20, 2),
      keterangan: DataTypes.TEXT,
    },
    {
      sequelize,
      modelName: "RenstraTabelPrioritas",
      tableName: "renstra_tabel_prioritas",
      underscored: true,
      timestamps: true,
    }
  );

  return RenstraTabelPrioritas;
};
