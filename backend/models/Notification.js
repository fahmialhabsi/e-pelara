"use strict";
const { Model } = require("sequelize");

/**
 * Tabel `notifications` di db_epelara.sql memakai kolom legacy camelCase:
 *   userId, read, createdAt, updatedAt
 * Model tetap memakai nama atribut snake_case di kode (user_id, is_read) dengan field mapping.
 */
module.exports = (sequelize, DataTypes) => {
  class Notification extends Model {}

  Notification.init(
    {
      user_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        field: "userId",
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: "",
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: "",
      },
      type: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: "INFO",
      },
      is_read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: "read",
      },
      entity_type: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: "entity_type",
      },
      entity_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "entity_id",
      },
      link: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Notification",
      tableName: "notifications",
      underscored: false,
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  );

  return Notification;
};
