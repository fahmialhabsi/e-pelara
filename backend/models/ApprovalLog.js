"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ApprovalLog extends Model {
    static associate(models) {
      // tidak diperlukan foreign-key constraint ketat agar tidak bloking startup
    }
  }

  ApprovalLog.init(
    {
      entity_type: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: "misi | program | kegiatan | sub_kegiatan | dll",
      },
      entity_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      action: {
        type: DataTypes.ENUM("SUBMIT", "APPROVE", "REJECT", "REVISE"),
        allowNull: false,
        comment: "Aksi yang dilakukan user",
      },
      from_status: {
        type: DataTypes.ENUM("DRAFT", "SUBMITTED", "APPROVED", "REJECTED"),
        allowNull: true,
        comment: "Status sebelum aksi ini",
      },
      to_status: {
        type: DataTypes.ENUM("DRAFT", "SUBMITTED", "APPROVED", "REJECTED"),
        allowNull: false,
        comment: "Status setelah aksi ini",
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "User yang melakukan aksi",
      },
      username: {
        type: DataTypes.STRING(150),
        allowNull: true,
        comment: "Snapshot username saat aksi (untuk audit)",
      },
      catatan: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Catatan atau alasan (wajib saat REJECT)",
      },
    },
    {
      sequelize,
      modelName: "ApprovalLog",
      tableName: "approval_logs",
      underscored: true,
      timestamps: true,
      updatedAt: false, // log-only, tidak perlu updated_at
    },
  );

  return ApprovalLog;
};
