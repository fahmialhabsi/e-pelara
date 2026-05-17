"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RenstraTabelStrategi extends Model {
    static associate(models) {
      RenstraTabelStrategi.belongsTo(models.IndikatorRenstra, {
        foreignKey: "indikator_id",
        as: "indikator_detail",
      });

      RenstraTabelStrategi.belongsTo(models.RenstraStrategi, {
        foreignKey: "strategi_id",
        as: "strategi",
      });

      RenstraTabelStrategi.belongsTo(models.RenstraOPD, {
        foreignKey: "renstra_id",
        as: "renstra",
      });
    }
  }

  RenstraTabelStrategi.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      renstra_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      strategi_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      indikator_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      kode_strategi: DataTypes.STRING(255),
      deskripsi_strategi: DataTypes.TEXT,
      indikator: DataTypes.TEXT,

      baseline: DataTypes.DECIMAL(15, 2),
      satuan_target: DataTypes.STRING(255),
      lokasi: DataTypes.TEXT,
      opd_penanggung_jawab: DataTypes.STRING(255),

      target_tahun_1: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
      target_tahun_2: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
      target_tahun_3: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
      target_tahun_4: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
      target_tahun_5: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
      target_tahun_6: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },

      pagu_tahun_1: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },
      pagu_tahun_2: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },
      pagu_tahun_3: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },
      pagu_tahun_4: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },
      pagu_tahun_5: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },
      pagu_tahun_6: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },

      target_akhir_renstra: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
      pagu_akhir_renstra: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },

      pagu_rpjmd_acuan: { type: DataTypes.DECIMAL(20, 2), defaultValue: 0 },

      versi: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
      status_revisi: {
        type: DataTypes.ENUM("draft", "verifikasi", "approved", "ditolak"),
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
    },
    {
      sequelize,
      modelName: "RenstraTabelStrategi",
      tableName: "renstra_tabel_strategi",
      underscored: false,
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      indexes: [
        {
          unique: true,
          fields: ["renstra_id", "strategi_id", "indikator_id"],
          name: "uniq_renstra_tabel_strategi",
        },
        {
          fields: ["status_revisi"],
          name: "idx_status_revisi_strategi",
        },
      ],
    }
  );

  return RenstraTabelStrategi;
};