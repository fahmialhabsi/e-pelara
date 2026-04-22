"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Sasaran extends Model {
    static associate(models) {
      Sasaran.belongsTo(models.Tujuan, {
        foreignKey: "tujuan_id",
        as: "Tujuan",
      });

      Sasaran.hasMany(models.Strategi, {
        foreignKey: "sasaran_id",
        as: "Strategi",
      });

      Sasaran.belongsTo(models.PeriodeRpjmd, {
        foreignKey: "periode_id",
        as: "periode",
      });
      Sasaran.belongsTo(models.Tenant, { foreignKey: "tenant_id", as: "tenant" });

      Sasaran.hasMany(models.Program, {
        foreignKey: "sasaran_id",
        as: "Program",
      });

      Sasaran.hasMany(models.Indikator, {
        foreignKey: "sasaran_id",
        as: "Indikator",
      });

      Sasaran.hasMany(models.Rkpd, { foreignKey: "sasaran_id", as: "rkpd" });

      Sasaran.hasMany(models.RenstraSasaran, {
        foreignKey: "rpjmd_sasaran_id",
        as: "renstra_sasaran",
      });
    }
  }

  Sasaran.init(
    {
      rpjmd_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      periode_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "periode_rpjmds",
          key: "id",
        },
      },
      tenant_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 1,
        references: { model: "tenants", key: "id" },
      },
      tujuan_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      nomor: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      isi_sasaran: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      jenis_dokumen: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      tahun: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Sasaran",
      tableName: "sasaran",
      underscored: true,
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: [
            "nomor",
            "tujuan_id",
            "jenis_dokumen",
            "tahun",
            "periode_id",
          ],
        },
      ],
    }
  );

  return Sasaran;
};
