// File: models/indikatorkegiatan.js
"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class IndikatorKegiatan extends Model {
    static associate(models) {
      this.belongsTo(models.Misi, { foreignKey: "misi_id", as: "misi" });
      this.belongsTo(models.Tujuan, { foreignKey: "tujuan_id", as: "tujuan" });
      this.belongsTo(models.Sasaran, {
        foreignKey: "sasaran_id",
        as: "sasaran",
      });
      this.belongsTo(models.Program, {
        foreignKey: "program_id",
        as: "program",
      });
      this.belongsTo(models.IndikatorProgram, {
        foreignKey: "indikator_program_id",
        as: "indikatorProgram",
      });
      this.belongsTo(models.OpdPenanggungJawab, {
        foreignKey: "penanggung_jawab",
        as: "opdPenanggungJawab",
      });
      this.belongsTo(models.Rkpd, { foreignKey: "rkpd_id", as: "rkpd" });
    }
  }

  IndikatorKegiatan.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      misi_id: DataTypes.INTEGER.UNSIGNED,
      tujuan_id: DataTypes.INTEGER.UNSIGNED,
      sasaran_id: DataTypes.INTEGER.UNSIGNED,
      program_id: DataTypes.INTEGER.UNSIGNED,
      indikator_program_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
      kode_indikator: { type: DataTypes.STRING(100), allowNull: false },
      nama_indikator: { type: DataTypes.TEXT, allowNull: false },
      tipe_indikator: { type: DataTypes.ENUM("Proses"), allowNull: false },
      jenis: DataTypes.STRING(100),
      tolok_ukur_kinerja: DataTypes.TEXT,
      target_kinerja: DataTypes.TEXT,
      jenis_indikator: {
        type: DataTypes.ENUM("Kuantitatif", "Kualitatif"),
        allowNull: false,
      },
      kriteria_kuantitatif: DataTypes.TEXT,
      kriteria_kualitatif: DataTypes.TEXT,
      satuan: DataTypes.STRING(50),
      definisi_operasional: DataTypes.TEXT,
      metode_penghitungan: DataTypes.TEXT,
      baseline: DataTypes.TEXT,
      capaian_tahun_1: DataTypes.STRING(100),
      capaian_tahun_2: DataTypes.STRING(100),
      capaian_tahun_3: DataTypes.STRING(100),
      capaian_tahun_4: DataTypes.STRING(100),
      capaian_tahun_5: DataTypes.STRING(100),
      target_tahun_1: DataTypes.STRING(100),
      target_tahun_2: DataTypes.STRING(100),
      target_tahun_3: DataTypes.STRING(100),
      target_tahun_4: DataTypes.STRING(100),
      target_tahun_5: DataTypes.STRING(100),
      sumber_data: DataTypes.TEXT,
      penanggung_jawab: DataTypes.INTEGER.UNSIGNED,
      keterangan: DataTypes.TEXT,
      rekomendasi_ai: DataTypes.TEXT,
      rkpd_id: DataTypes.INTEGER.UNSIGNED,
      jenis_dokumen: { type: DataTypes.STRING, allowNull: false },
      tahun: { type: DataTypes.STRING, allowNull: false },
    },
    {
      sequelize,
      modelName: "IndikatorKegiatan",
      tableName: "indikatorkegiatans",
      underscored: true,
      timestamps: false,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        {
          unique: true,
          name: "unique_indikatorkegiatans_combination",
          fields: ["kode_indikator", "jenis_dokumen", "tahun"],
        },
      ],
    }
  );

  // Hooks
  IndikatorKegiatan.addHook("beforeCreate", async (instance) => {
    const exists = await IndikatorKegiatan.findOne({
      where: {
        kode_indikator: instance.kode_indikator,
        jenis_dokumen: instance.jenis_dokumen,
        tahun: instance.tahun,
      },
    });
    if (exists) {
      throw new Error(
        "Data dengan kombinasi kode_indikator, jenis_dokumen, dan tahun sudah ada."
      );
    }
  });

  IndikatorKegiatan.addHook("beforeBulkCreate", async (instances) => {
    for (const instance of instances) {
      const exists = await IndikatorKegiatan.findOne({
        where: {
          kode_indikator: instance.kode_indikator,
          jenis_dokumen: instance.jenis_dokumen,
          tahun: instance.tahun,
        },
      });
      if (exists) {
        throw new Error(
          `Data duplikat ditemukan: kode_indikator=${instance.kode_indikator}`
        );
      }
    }
  });

  return IndikatorKegiatan;
};
