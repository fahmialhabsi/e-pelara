"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Indikator extends Model {
    static associate(models) {
      Indikator.hasMany(models.IndikatorDetail, {
        foreignKey: "indikator_id",
        as: "details",
      });
      Indikator.belongsTo(models.Misi, { foreignKey: "misi_id", as: "misi" });
      Indikator.belongsTo(models.Tujuan, {
        foreignKey: "tujuan_id",
        as: "tujuan",
      });
      Indikator.belongsTo(models.Sasaran, {
        foreignKey: "sasaran_id",
        as: "sasaran",
      });
      Indikator.belongsTo(models.Program, {
        foreignKey: "program_id",
        as: "program",
      });
      Indikator.belongsTo(models.Kegiatan, {
        foreignKey: "kegiatan_id",
        as: "kegiatan",
      });
      Indikator.belongsTo(models.RPJMD, {
        foreignKey: "rpjmd_id",
        as: "rpjmd",
      });
      Indikator.belongsTo(models.Tenant, { foreignKey: "tenant_id", as: "tenant" });
      Indikator.hasMany(models.RealisasiBulanan, {
        foreignKey: "indikator_id",
        as: "realisasi_bulanan",
      });
    }
  }

  Indikator.init(
    {
      misi_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "misi_id",
      },
      tujuan_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "tujuan_id",
      },
      sasaran_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "sasaran_id",
      },
      program_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "program_id",
      },
      kegiatan_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "kegiatan_id",
      },

      kode_indikator: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: "",
      },
      nama_indikator: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: "",
      },
      definisi_operasional: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      satuan: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: "",
      },
      metode_penghitungan: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      baseline: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      capaian_tahun_1: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      capaian_tahun_2: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      capaian_tahun_3: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      capaian_tahun_4: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      capaian_tahun_5: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      target_tahun_1: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      target_tahun_2: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      target_tahun_3: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      target_tahun_4: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      target_tahun_5: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      sumber_data: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      penanggung_jawab: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      keterangan: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      jenis_indikator: {
        type: DataTypes.ENUM("kuantitatif", "kualitatif"),
        allowNull: false,
        defaultValue: "kuantitatif",
      },
      tipe_indikator: {
        type: DataTypes.ENUM("Impact", "Outcome", "Output", "Proses"),
        allowNull: false,
        defaultValue: "Output",
      },
      kriteria_kuantitatif: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      kriteria_kualitatif: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      level_dokumen: {
        type: DataTypes.ENUM(
          "Rpjmd",
          "Renstra",
          "Rkpd",
          "Renja",
          "Rka",
          "Dpa",
          "Pengkeg",
          "monev",
          "Lpk-dispang",
          "Lk-dispang",
          "Lakip",
          "cloneData"
        ),
        allowNull: false,
        defaultValue: "Rpjmd",
      },
      jenis_iku: {
        type: DataTypes.ENUM("IKU", "IKP", "IKSK"),
        allowNull: false,
        defaultValue: "IKU",
      },
      stage: {
        type: DataTypes.ENUM(
          "misi",
          "tujuan",
          "sasaran",
          "program",
          "kegiatan"
        ),
        allowNull: false,
        defaultValue: "misi",
      },
      jenisDokumen: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "jenis_dokumen",
      },
      tahun: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "tahun",
      },
      tenant_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 1,
        references: { model: "tenants", key: "id" },
      },
    },
    {
      sequelize,
      modelName: "Indikator",
      tableName: "indikator",
      timestamps: true,
      underscored: true,
    }
  );

  return Indikator;
};
