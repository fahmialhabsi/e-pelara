"use strict";

module.exports = (sequelize, DataTypes) => {
  const MrRiskMatrix = sequelize.define(
    "MrRiskMatrix",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      matrix_code: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },

      likelihood_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      impact_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      likelihood_value: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },

      likelihood_label: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },

      impact_value: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },

      impact_label: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },

      score: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },

      level_risiko_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      level_risiko: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      warna_risiko: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },

      appetite_threshold: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },

      is_above_appetite: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      effective_start_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      effective_end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      tahun_berlaku: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      metadata_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },

      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      updated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: "mr_risk_matrix",
      freezeTableName: true,
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return MrRiskMatrix;
};