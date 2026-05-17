"use strict";

module.exports = (sequelize, DataTypes) => {
  const MrReferenceItem = sequelize.define(
    "MrReferenceItem",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      group_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      parent_item_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      kode_item: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },

      nama_item: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },

      deskripsi: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      nilai_numeric: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },

      nilai_text: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      warna: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },

      icon: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      urutan: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      is_default: {
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
      tableName: "mr_reference_items",
      freezeTableName: true,
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return MrReferenceItem;
};