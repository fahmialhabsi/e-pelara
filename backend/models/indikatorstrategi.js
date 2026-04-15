"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class IndikatorStrategi extends Model {
    static associate(models) {
      this.belongsTo(models.Strategi, {
        foreignKey: "strategi_id",
        as: "strategi",
      });
      this.belongsTo(models.OpdPenanggungJawab, {
        foreignKey: "penanggung_jawab",
        as: "opdPenanggungJawab",
      });
      this.belongsTo(models.PeriodeRpjmd, {
        foreignKey: "periode_id",
        as: "periode",
      });
    }
  }

  IndikatorStrategi.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      indikator_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
        references: { model: "indikators", key: "id" },
      },
      periode_id:  { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      strategi_id: { type: DataTypes.INTEGER,          allowNull: true },
      sasaran_id:  { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      tujuan_id:   { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      misi_id:     { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      kode_indikator:   { type: DataTypes.STRING(100), allowNull: false },
      nama_indikator:   { type: DataTypes.TEXT,        allowNull: false },
      tipe_indikator: {
        type: DataTypes.ENUM("Outcome", "Output", "Impact", "Process", "Input"),
        allowNull: true,
      },
      jenis:           { type: DataTypes.STRING(100), allowNull: true },
      jenis_indikator: {
        type: DataTypes.ENUM("Kuantitatif", "Kualitatif"),
        allowNull: true,
      },
      satuan:               { type: DataTypes.STRING(50), allowNull: true },
      tolok_ukur_kinerja:   { type: DataTypes.TEXT,       allowNull: true },
      target_kinerja:       { type: DataTypes.TEXT,       allowNull: true },
      kriteria_kuantitatif: { type: DataTypes.TEXT,       allowNull: true },
      kriteria_kualitatif:  { type: DataTypes.TEXT,       allowNull: true },
      definisi_operasional: { type: DataTypes.TEXT,       allowNull: true },
      metode_penghitungan:  { type: DataTypes.TEXT,       allowNull: true },
      baseline:             { type: DataTypes.TEXT,       allowNull: true },
      target_awal:          { type: DataTypes.DECIMAL(15,2), allowNull: true },
      target_akhir:         { type: DataTypes.DECIMAL(15,2), allowNull: true },
      tahun_awal:           { type: DataTypes.INTEGER,    allowNull: true },
      tahun_akhir:          { type: DataTypes.INTEGER,    allowNull: true },
      capaian_tahun_1: { type: DataTypes.STRING(100), allowNull: true },
      capaian_tahun_2: { type: DataTypes.STRING(100), allowNull: true },
      capaian_tahun_3: { type: DataTypes.STRING(100), allowNull: true },
      capaian_tahun_4: { type: DataTypes.STRING(100), allowNull: true },
      capaian_tahun_5: { type: DataTypes.STRING(100), allowNull: true },
      target_tahun_1:  { type: DataTypes.STRING(100), allowNull: true },
      target_tahun_2:  { type: DataTypes.STRING(100), allowNull: true },
      target_tahun_3:  { type: DataTypes.STRING(100), allowNull: true },
      target_tahun_4:  { type: DataTypes.STRING(100), allowNull: true },
      target_tahun_5:  { type: DataTypes.STRING(100), allowNull: true },
      sumber_data:      { type: DataTypes.TEXT,    allowNull: true },
      penanggung_jawab: { type: DataTypes.INTEGER, allowNull: true },
      keterangan:       { type: DataTypes.TEXT,    allowNull: true },
      rekomendasi_ai:   { type: DataTypes.TEXT,    allowNull: true },
      jenis_dokumen: { type: DataTypes.STRING(50), allowNull: false },
      tahun:         { type: DataTypes.STRING(10), allowNull: false },
    },
    {
      sequelize,
      modelName:  "IndikatorStrategi",
      tableName:  "indikatorstrategis",
      underscored: true,
      timestamps:  true,
      indexes: [
        {
          unique: true,
          name:   "unique_indikatorstrategis",
          fields: ["indikator_id", "kode_indikator", "jenis_dokumen", "tahun"],
        },
      ],
    }
  );

  return IndikatorStrategi;
};
