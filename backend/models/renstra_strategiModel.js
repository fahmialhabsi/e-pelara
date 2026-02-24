"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RenstraStrategi extends Model {
    static associate(models) {
      RenstraStrategi.belongsTo(models.RenstraOPD, {
        foreignKey: "renstra_id",
        targetKey: "id",
        as: "renstra",
      });

      RenstraStrategi.belongsTo(models.Strategi, {
        foreignKey: "rpjmd_strategi_id",
        targetKey: "id",
        as: "strategi_rpjmd",
      });
    }
  }

  RenstraStrategi.init(
    {
      renstra_id: DataTypes.INTEGER,
      sasaran_id: DataTypes.INTEGER,
      rpjmd_strategi_id: DataTypes.INTEGER,
      kode_strategi: DataTypes.STRING,
      deskripsi: DataTypes.TEXT,
      no_rpjmd: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      isi_strategi_rpjmd: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "RenstraStrategi",
      tableName: "renstra_strategi",
      underscored: true,
      timestamps: false,
    }
  );

  return RenstraStrategi;
};
