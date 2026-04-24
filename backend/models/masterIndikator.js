"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class MasterIndikator extends Model {
    static associate(models) {
      MasterIndikator.belongsTo(models.RegulasiVersi, {
        foreignKey: "regulasi_versi_id",
        as: "regulasiVersi",
      });
      MasterIndikator.belongsTo(models.MasterSubKegiatan, {
        foreignKey: "master_sub_kegiatan_id",
        as: "masterSubKegiatan",
      });
    }
  }

  MasterIndikator.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      master_sub_kegiatan_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      urutan: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      indikator: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      kinerja: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Kinerja dari sumber Sheet2_Normalized (per baris indikator)",
      },
      satuan: DataTypes.STRING(128),
      regulasi_versi_id: DataTypes.INTEGER,
      level: {
        type: DataTypes.ENUM("PROGRAM", "KEGIATAN", "SUB_KEGIATAN"),
        allowNull: false,
        defaultValue: "SUB_KEGIATAN",
      },
      tipe: {
        type: DataTypes.ENUM("output", "outcome", "lainnya"),
        allowNull: false,
        defaultValue: "output",
      },
      is_wajib: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      rumus: DataTypes.TEXT,
      satuan_bebas: DataTypes.STRING(64),
    },
    {
      sequelize,
      modelName: "MasterIndikator",
      tableName: "master_indikator",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        {
          fields: ["master_sub_kegiatan_id"],
          name: "idx_master_indikator_master_sub_kegiatan_id",
        },
        {
          unique: true,
          fields: ["master_sub_kegiatan_id", "urutan"],
          name: "uq_master_indikator_sub_urutan",
        },
      ],
    },
  );

  return MasterIndikator;
};
