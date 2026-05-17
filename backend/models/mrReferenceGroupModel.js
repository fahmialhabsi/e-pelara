"use strict";

module.exports = (sequelize, DataTypes) => {
  const MrReferenceGroup = sequelize.define(
    "MrReferenceGroup",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      kode_group: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },

      nama_group: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },

      deskripsi: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      domain: {
        type: DataTypes.ENUM(
          "risk",
          "context",
          "analysis",
          "mitigation",
          "monitoring",
          "reporting",
          "spip_linkage"
        ),
        allowNull: false,
        defaultValue: "risk",
      },

      is_system: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      urutan: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
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
      tableName: "mr_reference_groups",
      freezeTableName: true,
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return MrReferenceGroup;
};