"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RenstraTargetDetail extends Model {
    static associate(models) {
      RenstraTargetDetail.belongsTo(models.RenstraTarget, {
        foreignKey: "renstra_target_id",
        as: "renstraTarget",
      });
    }
  }

  RenstraTargetDetail.init(
    {
      renstra_target_id: DataTypes.INTEGER,
      level: DataTypes.STRING,
      tahun: DataTypes.INTEGER,
      target_value: DataTypes.DECIMAL(18, 2),
    },
    {
      sequelize,
      modelName: "RenstraTargetDetail",
      tableName: "renstra_target_detail",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return RenstraTargetDetail;
};
