"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RenstraTabelKegiatan extends Model {
    static associate(models) {
      // Relasi ke renstra_program
      RenstraTabelKegiatan.belongsTo(models.RenstraProgram, {
        foreignKey: "program_id",
        as: "program",
      });

      // Relasi ke renstra_kegiatan
      RenstraTabelKegiatan.belongsTo(models.RenstraKegiatan, {
        foreignKey: "kegiatan_id",
        as: "kegiatan",
      });

      // Relasi ke Renstra OPD
      RenstraTabelKegiatan.belongsTo(models.RenstraOPD, {
        foreignKey: "renstra_id",
        as: "renstra",
      });

      // Relasi ke indikator_renstra
      RenstraTabelKegiatan.belongsTo(models.IndikatorRenstra, {
        foreignKey: "indikator_id",
        as: "indikator_detail",
      });

      // ✅ Tambahkan relasi ke subkegiatan
      RenstraTabelKegiatan.hasMany(models.RenstraTabelSubkegiatan, {
        foreignKey: "kegiatan_id",
        as: "subkegiatans", // harus sama dengan yang di include
      });
    }
  }

  RenstraTabelKegiatan.init(
    {
      renstra_id: DataTypes.INTEGER,
      program_id: DataTypes.INTEGER,
      kegiatan_id: DataTypes.INTEGER,
      indikator_id: DataTypes.INTEGER,
      baseline: DataTypes.FLOAT,
      satuan_target: DataTypes.STRING,

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
      lokasi: DataTypes.STRING,
      target_akhir_renstra: DataTypes.DECIMAL(15, 2),
      pagu_akhir_renstra: DataTypes.DECIMAL(20, 2),
      pagu_rpjmd_acuan: DataTypes.DECIMAL(20, 2),
      versi: DataTypes.INTEGER,
      status_revisi: DataTypes.STRING,
      last_revised_at: DataTypes.DATE,
      last_revised_by: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "RenstraTabelKegiatan",
      tableName: "renstra_tabel_kegiatan",
    }
  );

  return RenstraTabelKegiatan;
};
