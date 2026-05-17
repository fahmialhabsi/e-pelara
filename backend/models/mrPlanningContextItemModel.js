"use strict";

module.exports = (sequelize, DataTypes) => {
  const MrPlanningContextItem = sequelize.define(
    "MrPlanningContextItem",
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

      jenis_konteks_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      jenis_konteks: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      periode_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      tahun: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      jenis_dokumen: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      renstra_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      opd_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      stage: {
        type: DataTypes.ENUM(
          "tujuan",
          "sasaran",
          "strategi",
          "kebijakan",
          "program",
          "kegiatan",
          "sub_kegiatan",
          "lakip",
          "lk",
          "temuan_bpk",
          "temuan_inspektorat",
          "pelaksanaan_kegiatan",
          "pertanggungjawaban_keuangan",
          "spip_e_sigap",
          "manual_adhoc",
          "lainnya"
        ),
        allowNull: false,
      },

      ref_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      indikator_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      source_table: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      source_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      kode_konteks: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      nama_konteks: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      uraian_konteks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      kode_indikator: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      nama_indikator: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      satuan: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      baseline: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: true,
      },

      target_tahun_1: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: true,
      },

      target_tahun_2: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: true,
      },

      target_tahun_3: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: true,
      },

      target_tahun_4: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: true,
      },

      target_tahun_5: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: true,
      },

      target_tahun_6: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: true,
      },

      target_akhir: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: true,
      },

      pagu_tahun_1: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: true,
      },

      pagu_tahun_2: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: true,
      },

      pagu_tahun_3: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: true,
      },

      pagu_tahun_4: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: true,
      },

      pagu_tahun_5: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: true,
      },

      pagu_tahun_6: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: true,
      },

      pagu_akhir: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: true,
      },

      penanggung_jawab: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      urutan: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      is_primary: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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
      tableName: "mr_planning_context_item",
      freezeTableName: true,
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return MrPlanningContextItem;
};