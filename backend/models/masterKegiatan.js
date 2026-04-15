"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class MasterKegiatan extends Model {
    static associate(models) {
      MasterKegiatan.belongsTo(models.RegulasiVersi, {
        foreignKey: "regulasi_versi_id",
        as: "regulasiVersi",
      });
      MasterKegiatan.belongsTo(models.MasterProgram, {
        foreignKey: "master_program_id",
        as: "masterProgram",
      });
      MasterKegiatan.hasMany(models.MasterSubKegiatan, {
        foreignKey: "master_kegiatan_id",
        as: "masterSubKegiatans",
      });
    }
  }

  MasterKegiatan.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      master_program_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      dataset_key: {
        type: DataTypes.STRING(64),
        allowNull: false,
        defaultValue: "sekretariat_bidang_sheet2",
      },
      kode_kegiatan: DataTypes.STRING(64),
      kode_kegiatan_full: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      nama_kegiatan: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      /** NOT NULL DB ditunda — sinkron dengan program induk / backfill */
      regulasi_versi_id: DataTypes.INTEGER,
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "MasterKegiatan",
      tableName: "master_kegiatan",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        {
          fields: ["master_program_id"],
          name: "idx_master_kegiatan_master_program_id",
        },
        { fields: ["dataset_key"], name: "idx_master_kegiatan_dataset_key" },
        {
          unique: true,
          fields: ["dataset_key", "kode_kegiatan_full"],
          name: "uq_master_kegiatan_dataset_kode_kegiatan_full",
        },
      ],
    },
  );

  return MasterKegiatan;
};
