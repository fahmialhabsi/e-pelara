"use strict";

module.exports = (sequelize, DataTypes) => {
  const MrPlanningContextStakeholder = sequelize.define(
    "MrPlanningContextStakeholder",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      mr_planning_context_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      nama_pemangku_kepentingan: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },

      jenis_pemangku_kepentingan_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      jenis_pemangku_kepentingan: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },

      peran: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      kebutuhan_harapan: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      pengaruh: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      kepentingan: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      strategi_komunikasi: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      keterangan: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      urutan: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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
      tableName: "mr_planning_context_stakeholder",
      freezeTableName: true,
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return MrPlanningContextStakeholder;
};