"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class IndikatorDetail extends Model {
    static associate(models) {
      IndikatorDetail.belongsTo(models.Indikator, {
        foreignKey: "indikator_id",
        as: "indikator",
      });
    }
  }

  IndikatorDetail.init(
    {
      indikator_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      jenis: {
        type: DataTypes.ENUM("Impact", "Outcome", "Output", "Proses"),
        allowNull: false,
      },
      tolok_ukur: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      target_kinerja: {
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
      periode_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "periode_rpjmds", // sesuaikan dengan nama tabel periode
          key: "id",
        },
      },
    },
    {
      sequelize,
      modelName: "IndikatorDetail",
      tableName: "indikator_detail",
      underscored: true,
      indexes: [
        {
          name: "idx_detail_indikator_id",
          fields: ["indikator_id"],
        },
        {
          name: "idx_detail_tahun",
          fields: ["tahun"],
        },
        {
          name: "idx_detail_periode_id",
          fields: ["periode_id"],
        },
        {
          name: "unique_detail_per_year",
          unique: true,
          fields: ["indikator_id", "tahun", "periode_id"],
        },
      ],
    }
  );

  return IndikatorDetail;
};
