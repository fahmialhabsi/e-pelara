"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RenstraTabelSubkegiatan extends Model {
    static associate(models) {
      // Relasi ke RenstraProgram
      this.belongsTo(models.RenstraProgram, {
        foreignKey: "program_id",
        as: "program",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });

      // Relasi ke RenstraKegiatan
      this.belongsTo(models.RenstraKegiatan, {
        foreignKey: "kegiatan_id",
        as: "kegiatan",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });

      // Relasi ke RenstraSubkegiatan
      this.belongsTo(models.RenstraSubkegiatan, {
        foreignKey: "subkegiatan_id",
        as: "renstraSubkegiatan", // alias unik
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });

      // Relasi ke SubKegiatan
      this.belongsTo(models.SubKegiatan, {
        foreignKey: "subkegiatan_id",
        as: "subkegiatan", // alias tetap
      });

      // Relasi ke RenstraOPD
      this.belongsTo(models.RenstraOPD, {
        foreignKey: "renstra_opd_id",
        as: "renstra_opd",
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
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
      target_akhir_renstra: { type: DataTypes.DECIMAL(10, 0), allowNull: true },
      pagu_akhir_renstra: { type: DataTypes.DECIMAL(20, 2), allowNull: true },
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
