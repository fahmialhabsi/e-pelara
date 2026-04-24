"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class MasterSubKegiatan extends Model {
    static associate(models) {
      MasterSubKegiatan.belongsTo(models.RegulasiVersi, {
        foreignKey: "regulasi_versi_id",
        as: "regulasiVersi",
      });
      MasterSubKegiatan.belongsTo(models.MasterKegiatan, {
        foreignKey: "master_kegiatan_id",
        as: "masterKegiatan",
      });
      MasterSubKegiatan.hasMany(models.MasterIndikator, {
        foreignKey: "master_sub_kegiatan_id",
        as: "masterIndikators",
      });
    }
  }

  MasterSubKegiatan.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      master_kegiatan_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      dataset_key: {
        type: DataTypes.STRING(64),
        allowNull: false,
        defaultValue: "sekretariat_bidang_sheet2",
      },
      kode_sub_kegiatan: DataTypes.STRING(64),
      kode_sub_kegiatan_full: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      nama_sub_kegiatan: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      kinerja: DataTypes.TEXT,
      /** NOT NULL DB ditunda — sinkron dengan kegiatan induk / backfill */
      regulasi_versi_id: DataTypes.INTEGER,
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "MasterSubKegiatan",
      tableName: "master_sub_kegiatan",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        {
          fields: ["master_kegiatan_id"],
          name: "idx_master_sub_kegiatan_master_kegiatan_id",
        },
        {
          fields: ["dataset_key"],
          name: "idx_master_sub_kegiatan_dataset_key",
        },
        {
          unique: true,
          fields: ["dataset_key", "kode_sub_kegiatan_full"],
          name: "uq_master_sub_kegiatan_dataset_kode_sub_full",
        },
      ],
    },
  );

  return MasterSubKegiatan;
};
