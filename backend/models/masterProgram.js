"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class MasterProgram extends Model {
    static associate(models) {
      MasterProgram.belongsTo(models.RegulasiVersi, {
        foreignKey: "regulasi_versi_id",
        as: "regulasiVersi",
      });
      MasterProgram.hasMany(models.MasterKegiatan, {
        foreignKey: "master_program_id",
        as: "masterKegiatans",
      });
    }
  }

  MasterProgram.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      dataset_key: {
        type: DataTypes.STRING(64),
        allowNull: false,
        defaultValue: "sekretariat_bidang_sheet2",
      },
      kode_urusan: DataTypes.STRING(32),
      kode_bidang_urusan: DataTypes.STRING(32),
      kode_program: DataTypes.STRING(64),
      kode_program_full: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      nama_urusan: DataTypes.TEXT,
      nama_program: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      /**
       * Diisi bertahap; NOT NULL DB ditunda sampai seluruh baris ter-backfill.
       * @see migration 20260415100001-add-regulasi-versi-to-master
       */
      regulasi_versi_id: DataTypes.INTEGER,
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "MasterProgram",
      tableName: "master_program",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { fields: ["dataset_key"], name: "idx_master_program_dataset_key" },
        {
          unique: true,
          fields: ["dataset_key", "kode_program_full"],
          name: "uq_master_program_dataset_kode_program_full",
        },
      ],
    },
  );

  return MasterProgram;
};
