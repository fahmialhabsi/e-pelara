"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class IndikatorRenstra extends Model {
    static associate(models) {
      // Relasi dengan RenstraOPD
      IndikatorRenstra.belongsTo(models.RenstraOPD, {
        foreignKey: "renstra_id",
        targetKey: "id",
        as: "renstra",
      });
    }
  }

  IndikatorRenstra.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      ref_id: { type: DataTypes.INTEGER, allowNull: false },
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
      baseline: DataTypes.STRING,
      target_tahun_1: DataTypes.STRING,
      target_tahun_2: DataTypes.STRING,
      target_tahun_3: DataTypes.STRING,
      target_tahun_4: DataTypes.STRING,
      target_tahun_5: DataTypes.STRING,
      target_tahun_6: DataTypes.STRING,
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
