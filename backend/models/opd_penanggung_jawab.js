"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class OpdPenanggungJawab extends Model {
    static associate(models) {
      this.hasMany(models.Program, {
        foreignKey: "opd_penanggung_jawab",
        as: "programs",
      });

      // Relasi ke Indikator Tujuan
      this.hasMany(models.IndikatorTujuan, {
        foreignKey: "penanggung_jawab",
        as: "indikatorTujuans",
      });

      // Relasi ke Indikator Sasaran
      this.hasMany(models.IndikatorSasaran, {
        foreignKey: "penanggung_jawab",
        as: "indikatorSasarans",
      });

      // Relasi ke Indikator Program
      this.hasMany(models.IndikatorProgram, {
        foreignKey: "penanggung_jawab",
        as: "indikatorPrograms",
      });

      // Relasi ke Indikator Kegiatan
      this.hasMany(models.IndikatorKegiatan, {
        foreignKey: "penanggung_jawab",
        as: "indikatorKegiatans",
      });
      this.hasMany(models.Rkpd, {
        foreignKey: "penanggung_jawab",
        as: "rkpd",
      });
      this.belongsTo(models.Tenant, { foreignKey: "tenant_id", as: "tenant" });
    }
  }

  OpdPenanggungJawab.init(
    {
      nama_opd: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      nama_bidang_opd: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      // Field baru:
      nama: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      nip: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      jabatan: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      jenis_dokumen: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      tahun: {
        type: DataTypes.INTEGER,
        allowNull: false,
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
      modelName: "OpdPenanggungJawab",
      tableName: "opd_penanggung_jawab",
      underscored: true, // konsisten dengan snake_case kolom
      timestamps: true, // atau true jika Anda pakai createdAt/updatedAt
    }
  );

  return OpdPenanggungJawab;
};
