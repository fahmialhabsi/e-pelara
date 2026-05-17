"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RenstraTabelSubkegiatan extends Model {
    static associate(models) {
      this.belongsTo(models.RenstraProgram, {
        foreignKey: "program_id",
        as: "program",
      });

      this.belongsTo(models.RenstraKegiatan, {
        foreignKey: "kegiatan_id",
        as: "kegiatan",
      });

      this.belongsTo(models.RenstraOPD, {
        foreignKey: "renstra_id",
        as: "renstra",
      });

      this.belongsTo(models.RenstraSubkegiatan, {
        foreignKey: "sub_kegiatan_id",
        as: "sub_kegiatan",
      });

      this.belongsTo(models.IndikatorRenstra, {
        foreignKey: "indikator_id",
        as: "indikator_detail",
      });
    }
  }

  RenstraTabelSubkegiatan.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      renstra_id: { type: DataTypes.INTEGER, allowNull: true },
      sub_kegiatan_id: { type: DataTypes.INTEGER, allowNull: true },
      indikator_id: { type: DataTypes.INTEGER, allowNull: true },

      program_id: { type: DataTypes.INTEGER, allowNull: false },
      kegiatan_id: { type: DataTypes.INTEGER, allowNull: false },
      subkegiatan_id: { type: DataTypes.INTEGER, allowNull: false },
      indikator_manual: { type: DataTypes.STRING(255), allowNull: true },
      baseline: { type: DataTypes.FLOAT, allowNull: true },
      satuan_target: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: 0,
      },
      kode_subkegiatan: { type: DataTypes.STRING(255), allowNull: true },
      nama_subkegiatan: { type: DataTypes.STRING(255), allowNull: true },
      sub_bidang_penanggung_jawab: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      target_tahun_1: { type: DataTypes.FLOAT, allowNull: true },
      target_tahun_2: { type: DataTypes.FLOAT, allowNull: true },
      target_tahun_3: { type: DataTypes.FLOAT, allowNull: true },
      target_tahun_4: { type: DataTypes.FLOAT, allowNull: true },
      target_tahun_5: { type: DataTypes.FLOAT, allowNull: true },
      target_tahun_6: { type: DataTypes.FLOAT, allowNull: true },
      pagu_tahun_1: { type: DataTypes.DECIMAL(20, 2), allowNull: true },
      pagu_tahun_2: { type: DataTypes.DECIMAL(20, 2), allowNull: true },
      pagu_tahun_3: { type: DataTypes.DECIMAL(20, 2), allowNull: true },
      pagu_tahun_4: { type: DataTypes.DECIMAL(20, 2), allowNull: true },
      pagu_tahun_5: { type: DataTypes.DECIMAL(20, 2), allowNull: true },
      pagu_tahun_6: { type: DataTypes.DECIMAL(20, 2), allowNull: true },
      lokasi: { type: DataTypes.STRING(255), allowNull: true },
      target_akhir_renstra: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      pagu_akhir_renstra: { type: DataTypes.DECIMAL(20, 2), allowNull: true },
      pagu_rpjmd_acuan: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: true,
        defaultValue: 0,
      },
      versi: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      status_revisi: {
        type: DataTypes.ENUM("draft", "verifikasi", "approved", "ditolak"),
        allowNull: false,
        defaultValue: "draft",
      },
      last_revised_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      last_revised_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      renstra_opd_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "RenstraOPD", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
    },
    {
      sequelize,
      modelName: "RenstraTabelSubkegiatan",
      tableName: "renstra_tabel_subkegiatan",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: false,
    }
  );

  return RenstraTabelSubkegiatan;
};
