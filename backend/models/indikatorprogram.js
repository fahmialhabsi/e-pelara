// models/IndikatorProgram.js
"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class IndikatorProgram extends Model {
    static associate(models) {
      this.belongsTo(models.IndikatorSasaran, {
        foreignKey: "sasaran_id",
        as: "indikatorSasaran",
      });
      this.hasMany(models.IndikatorKegiatan, {
        foreignKey: "indikator_program_id",
        as: "kegiatans",
      });
      IndikatorProgram.belongsTo(models.Program, {
        as: "program",
        foreignKey: "program_id",
      });
      this.belongsTo(models.OpdPenanggungJawab, {
        foreignKey: "penanggung_jawab",
        as: "opdPenanggungJawab",
      });
      this.belongsTo(models.Rkpd, {
        foreignKey: "rkpd_id",
        as: "rkpd",
      });
    }
  }

  IndikatorProgram.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      sasaran_id: { type: DataTypes.INTEGER, allowNull: false },
      kode_indikator: { type: DataTypes.STRING(100), allowNull: false },
      nama_indikator: { type: DataTypes.TEXT, allowNull: false },
      tipe_indikator: { type: DataTypes.ENUM("Output"), allowNull: false },
      jenis: { type: DataTypes.TEXT, allowNull: true },
      tolok_ukur_kinerja: { type: DataTypes.TEXT, allowNull: true },
      target_kinerja: { type: DataTypes.TEXT, allowNull: true },
      jenis_indikator: {
        type: DataTypes.ENUM("Kuantitatif", "Kualitatif"),
        allowNull: false,
      },
      kriteria_kuantitatif: { type: DataTypes.TEXT, allowNull: true },
      kriteria_kualitatif: { type: DataTypes.TEXT, allowNull: true },
      satuan: { type: DataTypes.STRING(50), allowNull: true },
      definisi_operasional: { type: DataTypes.TEXT, allowNull: true },
      metode_penghitungan: { type: DataTypes.TEXT, allowNull: true },
      baseline: { type: DataTypes.TEXT, allowNull: true },
      capaian_tahun_1: { type: DataTypes.STRING(100), allowNull: true },
      capaian_tahun_2: { type: DataTypes.STRING(100), allowNull: true },
      capaian_tahun_3: { type: DataTypes.STRING(100), allowNull: true },
      capaian_tahun_4: { type: DataTypes.STRING(100), allowNull: true },
      capaian_tahun_5: { type: DataTypes.STRING(100), allowNull: true },
      target_tahun_1: { type: DataTypes.STRING(100), allowNull: true },
      target_tahun_2: { type: DataTypes.STRING(100), allowNull: true },
      target_tahun_3: { type: DataTypes.STRING(100), allowNull: true },
      target_tahun_4: { type: DataTypes.STRING(100), allowNull: true },
      target_tahun_5: { type: DataTypes.STRING(100), allowNull: true },
      program_id: { type: DataTypes.INTEGER, allowNull: true },
      sumber_data: { type: DataTypes.TEXT, allowNull: true },
      penanggung_jawab: { type: DataTypes.STRING(255), allowNull: true },
      keterangan: { type: DataTypes.TEXT, allowNull: true },
      rekomendasi_ai: { type: DataTypes.TEXT, allowNull: true },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at",
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "updated_at",
        defaultValue: DataTypes.NOW,
      },
      rkpd_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      jenis_dokumen: { type: DataTypes.STRING, allowNull: false },
      tahun: { type: DataTypes.STRING, allowNull: false },
    },
    {
      sequelize,
      modelName: "IndikatorProgram",
      tableName: "indikatorprograms",
      underscored: true,
      timestamps: true,
      indexes: [
        {
          unique: true,
          name: "unique_indikatorprograms_combination",
          fields: ["program_id", "kode_indikator", "jenis_dokumen", "tahun"],
        },
      ],
    }
  );

  // Hooks
  IndikatorProgram.addHook("beforeCreate", async (instance) => {
    const exists = await IndikatorProgram.findOne({
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

  IndikatorProgram.addHook("beforeBulkCreate", async (instances) => {
    for (const instance of instances) {
      const exists = await IndikatorProgram.findOne({
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

  return IndikatorProgram;
};
