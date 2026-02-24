"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Rkpd extends Model {
    static associate(models) {
      Rkpd.belongsTo(models.PeriodeRpjmd, {
        foreignKey: "periode_id",
        as: "periode",
      });
      Rkpd.belongsTo(models.OpdPenanggungJawab, {
        foreignKey: "opd_id",
        as: "opd",
      });
      Rkpd.belongsTo(models.Visi, { foreignKey: "visi_id", as: "visi" });
      Rkpd.belongsTo(models.Misi, { foreignKey: "misi_id", as: "misi" });
      Rkpd.belongsTo(models.Tujuan, { foreignKey: "tujuan_id", as: "tujuan" });
      Rkpd.belongsTo(models.Sasaran, {
        foreignKey: "sasaran_id",
        as: "sasaran",
      });
      Rkpd.belongsTo(models.Strategi, {
        foreignKey: "strategi_id",
        as: "strategi",
      });
      Rkpd.belongsTo(models.ArahKebijakan, {
        foreignKey: "arah_id",
        as: "arah_kebijakan",
      });
      Rkpd.belongsTo(models.Program, {
        foreignKey: "program_id",
        as: "program",
      });
      Rkpd.belongsTo(models.Kegiatan, {
        foreignKey: "kegiatan_id",
        as: "kegiatan",
      });
      Rkpd.belongsTo(models.SubKegiatan, {
        foreignKey: "sub_kegiatan_id",
        as: "sub_kegiatan",
      });
      Rkpd.belongsTo(models.RenstraProgram, {
        foreignKey: "renstra_program_id",
        as: "renstra_program",
      });

      Rkpd.belongsToMany(models.PrioritasNasional, {
        through: "rkpd_prioritas_nasional",
        foreignKey: "rkpd_id",
        otherKey: "prioritas_nasional_id",
        as: "Prioritas_nasional",
      });
      Rkpd.belongsToMany(models.PrioritasDaerah, {
        through: "rkpd_prioritas_daerah",
        foreignKey: "rkpd_id",
        otherKey: "prioritas_daerah_id",
        as: "Prioritas_daerah",
      });
      Rkpd.belongsToMany(models.PrioritasGubernur, {
        through: "rkpd_prioritas_gubernur",
        foreignKey: "rkpd_id",
        otherKey: "prioritas_gubernur_id",
        as: "Prioritas_gubernur",
      });

      Rkpd.hasMany(models.IndikatorTujuan, {
        foreignKey: "rkpd_id",
        as: "Indikator_tujuan",
      });
      Rkpd.hasMany(models.IndikatorSasaran, {
        foreignKey: "rkpd_id",
        as: "Indikator_sasaran",
      });
      Rkpd.hasMany(models.IndikatorProgram, {
        foreignKey: "rkpd_id",
        as: "Indikator_program",
      });
      Rkpd.hasMany(models.IndikatorKegiatan, {
        foreignKey: "rkpd_id",
        as: "Indikator_kegiatan",
      });
    }
  }

  Rkpd.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      tahun: { type: DataTypes.STRING, allowNull: false },
      periode_id: { type: DataTypes.INTEGER, allowNull: false },
      opd_id: { type: DataTypes.INTEGER, allowNull: false },
      visi_id: DataTypes.INTEGER,
      misi_id: DataTypes.INTEGER,
      tujuan_id: DataTypes.INTEGER,
      sasaran_id: DataTypes.INTEGER,
      strategi_id: DataTypes.INTEGER,
      arah_id: DataTypes.INTEGER,
      program_id: DataTypes.INTEGER,
      kegiatan_id: DataTypes.INTEGER,
      sub_kegiatan_id: DataTypes.INTEGER,
      renstra_program_id: DataTypes.INTEGER,
      target: DataTypes.STRING,
      anggaran: DataTypes.DECIMAL(18, 2),
      jenis_dokumen: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Rkpd",
      tableName: "rkpd",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { name: "idx_tahun", fields: ["tahun"] },
        { name: "idx_periode_id", fields: ["periode_id"] },
        { name: "idx_periode_tahun", fields: ["periode_id", "tahun"] },
      ],
    }
  );

  return Rkpd;
};
