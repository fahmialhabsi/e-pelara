"use strict";
const { Model } = require("sequelize");

/**
 * Canonical model RKPD (table: `rkpd`).
 * - field "Skema refactor" = canonical untuk endpoint planning baru
 * - field "Skema legacy"   = compatibility-only untuk modul lama
 */
module.exports = (sequelize, DataTypes) => {
  class Rkpd extends Model {
    static associate(models) {
      Rkpd.belongsTo(models.Renja, {
        foreignKey: "renja_id",
        as: "renja",
      });

      Rkpd.belongsTo(models.PeriodeRpjmd, {
        foreignKey: "periode_id",
        as: "periode",
      });

      Rkpd.belongsTo(models.PeriodeRpjmd, {
        foreignKey: "periode_rpjmd_id",
        as: "rpjmdPeriode",
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
      tahun: { type: DataTypes.INTEGER, allowNull: false },

      /** FK ke Renja (sumber utama perencanaan tahunan) */
      renja_id: { type: DataTypes.INTEGER, allowNull: true },

      // Skema refactor (planning doc-centric)
      periode_rpjmd_id: { type: DataTypes.INTEGER, allowNull: true },
      kode_program: { type: DataTypes.STRING(50), allowNull: true },
      nama_program: { type: DataTypes.STRING(255), allowNull: true },
      kode_kegiatan: { type: DataTypes.STRING(50), allowNull: true },
      nama_kegiatan: { type: DataTypes.STRING(255), allowNull: true },
      kode_sub_kegiatan: { type: DataTypes.STRING(50), allowNull: true },
      nama_sub_kegiatan: { type: DataTypes.STRING(255), allowNull: true },
      indikator: { type: DataTypes.TEXT, allowNull: true },
      target: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
      satuan: { type: DataTypes.STRING(64), allowNull: true },
      pagu_anggaran: { type: DataTypes.DECIMAL(20, 2), allowNull: true },
      sumber_dana: { type: DataTypes.STRING(128), allowNull: true },
      opd_penanggung_jawab: { type: DataTypes.STRING(255), allowNull: true },
      status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "draft",
      },
      approval_status: {
        type: DataTypes.ENUM("DRAFT", "SUBMITTED", "APPROVED", "REJECTED"),
        allowNull: false,
        defaultValue: "DRAFT",
      },
      epelara_rkpd_id: { type: DataTypes.STRING(100), allowNull: true },
      sinkronisasi_status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "belum_sinkron",
      },
      sinkronisasi_terakhir: { type: DataTypes.DATE, allowNull: true },
      dibuat_oleh: { type: DataTypes.INTEGER, allowNull: true },
      disetujui_oleh: { type: DataTypes.INTEGER, allowNull: true },
      disetujui_at: { type: DataTypes.DATE, allowNull: true },

      // Skema legacy (tetap dipertahankan agar kompatibel)
      periode_id: { type: DataTypes.INTEGER, allowNull: true },
      opd_id: { type: DataTypes.INTEGER, allowNull: true },
      visi_id: { type: DataTypes.INTEGER, allowNull: true },
      misi_id: { type: DataTypes.INTEGER, allowNull: true },
      tujuan_id: { type: DataTypes.INTEGER, allowNull: true },
      sasaran_id: { type: DataTypes.INTEGER, allowNull: true },
      strategi_id: { type: DataTypes.INTEGER, allowNull: true },
      arah_id: { type: DataTypes.INTEGER, allowNull: true },
      program_id: { type: DataTypes.INTEGER, allowNull: true },
      kegiatan_id: { type: DataTypes.INTEGER, allowNull: true },
      sub_kegiatan_id: { type: DataTypes.INTEGER, allowNull: true },
      renstra_program_id: { type: DataTypes.INTEGER, allowNull: true },
      anggaran: { type: DataTypes.DECIMAL(20, 2), allowNull: true },
      jenis_dokumen: { type: DataTypes.STRING(50), allowNull: true },
      arah_kebijakan_id: { type: DataTypes.INTEGER, allowNull: true },
      penanggung_jawab: { type: DataTypes.STRING(255), allowNull: true },
      prioritas_daerah_id: { type: DataTypes.INTEGER, allowNull: true },
      prioritas_kepala_daerah_id: { type: DataTypes.INTEGER, allowNull: true },
      prioritas_nasional_id: { type: DataTypes.INTEGER, allowNull: true },
      change_reason_text: { type: DataTypes.TEXT, allowNull: true },
      change_reason_file: { type: DataTypes.STRING(255), allowNull: true },
      version: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 1,
      },
      is_active_version: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      rpjmd_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      pagu_year_1: { type: DataTypes.DECIMAL(20, 2), allowNull: true },
      pagu_year_2: { type: DataTypes.DECIMAL(20, 2), allowNull: true },
      pagu_year_3: { type: DataTypes.DECIMAL(20, 2), allowNull: true },
      pagu_year_4: { type: DataTypes.DECIMAL(20, 2), allowNull: true },
      pagu_year_5: { type: DataTypes.DECIMAL(20, 2), allowNull: true },
      pagu_total: { type: DataTypes.DECIMAL(20, 2), allowNull: true },
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
        { name: "rkpd_tahun_idx", fields: ["tahun"] },
      ],
    }
  );

  return Rkpd;
};
