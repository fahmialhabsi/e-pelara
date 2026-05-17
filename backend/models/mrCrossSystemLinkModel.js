"use strict";

module.exports = (sequelize, DataTypes) => {
  const MrCrossSystemLink = sequelize.define(
    "MrCrossSystemLink",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      // =====================================================
      // RELASI MR INTERNAL
      // =====================================================
      context_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      mr_planning_risk_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      mr_planning_mitigation_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      mr_planning_monitoring_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      // =====================================================
      // SOURCE
      // =====================================================
      source_system: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },

      source_module: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },

      source_table: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },

      source_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      // =====================================================
      // TARGET
      // =====================================================
      target_system: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },

      target_module: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },

      target_table: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },

      target_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      target_reference_code: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },

      target_reference_label: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      // =====================================================
      // SPIP LEGACY LINK FIELDS
      // =====================================================
      linked_spip_risk_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      linked_spip_rtp_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      linked_spip_monitoring_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      linked_spip_evidence_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      // =====================================================
      // LINK STATUS
      // =====================================================
      link_type: {
        type: DataTypes.ENUM(
          "risk_mapping",
          "rtp_mapping",
          "monitoring_mapping",
          "evidence_mapping",
          "approval_mapping",
          "snapshot_mapping",
          "dashboard_mapping"
        ),
        allowNull: false,
      },

      link_status: {
        type: DataTypes.ENUM(
          "draft",
          "active",
          "inactive",
          "archived",
          "broken"
        ),
        allowNull: false,
        defaultValue: "draft",
      },

      sync_status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "pending",
      },

      last_sync_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      sync_error_message: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      metadata_json: {
        type: DataTypes.JSON,
        allowNull: true,
      },

      link_note: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      // =====================================================
      // VERIFICATION
      // =====================================================
      is_verified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      verified_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      verified_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      // =====================================================
      // AUDIT
      // =====================================================
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
      tableName: "mr_cross_system_link",
      freezeTableName: true,
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return MrCrossSystemLink;
};