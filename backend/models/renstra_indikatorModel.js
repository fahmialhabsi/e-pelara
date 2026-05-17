"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class IndikatorRenstra extends Model {
    static associate(models) {
      IndikatorRenstra.belongsTo(models.RenstraOPD, {
        foreignKey: "renstra_id",
        targetKey: "id",
        as: "renstra",
      });

      IndikatorRenstra.belongsTo(models.RenstraKebijakan, {
        foreignKey: "ref_id",
        targetKey: "id",
        as: "kebijakan",
      });

      IndikatorRenstra.hasMany(models.RenstraTabelArahKebijakan, {
        foreignKey: "indikator_id",
        as: "tabel_arah_kebijakan",
      });

      IndikatorRenstra.belongsTo(models.RenstraStrategi, {
        foreignKey: "ref_id",
        targetKey: "id",
        constraints: false,
        as: "strategi",
      });

      IndikatorRenstra.hasMany(models.RenstraTabelStrategi, {
        foreignKey: "indikator_id",
        as: "tabel_strategi",
      });

      IndikatorRenstra.belongsTo(models.RenstraKegiatan, {
        foreignKey: "ref_id",
        targetKey: "id",
        constraints: false,
        as: "kegiatan",
      });

      IndikatorRenstra.hasMany(models.RenstraTabelKegiatan, {
        foreignKey: "indikator_id",
        as: "tabel_kegiatan",
      });
      IndikatorRenstra.belongsTo(models.RenstraSubkegiatan, {
        foreignKey: "ref_id",
        targetKey: "id",
        constraints: false,
        as: "sub_kegiatan",
      });

      IndikatorRenstra.hasMany(models.RenstraTabelSubkegiatan, {
        foreignKey: "indikator_id",
        as: "tabel_sub_kegiatan",
      });
    }
  }

  IndikatorRenstra.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      ref_id: { type: DataTypes.INTEGER, allowNull: false },
      source_indikator_id: DataTypes.INTEGER,
      stage: DataTypes.ENUM(
        "tujuan",
        "sasaran",
        "strategi",
        "kebijakan",
        "program",
        "kegiatan",
        "sub_kegiatan"
      ),
      kode_indikator: { type: DataTypes.STRING, allowNull: false },
      nama_indikator: { type: DataTypes.TEXT, allowNull: false },
      satuan: DataTypes.STRING,
      definisi_operasional: DataTypes.TEXT,
      metode_penghitungan: DataTypes.TEXT,
      baseline: DataTypes.DECIMAL(15, 2),
      target_tahun_1: DataTypes.DECIMAL(15, 2),
      target_tahun_2: DataTypes.DECIMAL(15, 2),
      target_tahun_3: DataTypes.DECIMAL(15, 2),
      target_tahun_4: DataTypes.DECIMAL(15, 2),
      target_tahun_5: DataTypes.DECIMAL(15, 2),
      target_tahun_6: DataTypes.DECIMAL(15, 2),
      lokasi: DataTypes.STRING(255),
      pagu_tahun_1: DataTypes.DECIMAL(20, 2),
      pagu_tahun_2: DataTypes.DECIMAL(20, 2),
      pagu_tahun_3: DataTypes.DECIMAL(20, 2),
      pagu_tahun_4: DataTypes.DECIMAL(20, 2),
      pagu_tahun_5: DataTypes.DECIMAL(20, 2),
      pagu_tahun_6: DataTypes.DECIMAL(20, 2),
      jenis_indikator: DataTypes.ENUM("Kuantitatif", "Kualitatif"),
      tipe_indikator: DataTypes.ENUM("Impact", "Outcome", "Output", "Proses"),
      kriteria_kuantitatif: DataTypes.STRING,
      kriteria_kualitatif: DataTypes.STRING,
      sumber_data: DataTypes.STRING,
      penanggung_jawab: DataTypes.STRING,
      keterangan: DataTypes.TEXT,
      tahun: DataTypes.STRING,
      jenis_dokumen: DataTypes.STRING,
      renstra_id: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "IndikatorRenstra",
      tableName: "indikator_renstra", // sesuai nama tabel di DB
      underscored: true,
      timestamps: true, // karena tabel ada created_at & updated_at
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  

  return IndikatorRenstra;
};


