'use strict';

module.exports = (sequelize, DataTypes) => {
  const RenjaTargetGroupMapping = sequelize.define(
    'RenjaTargetGroupMapping',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      perangkat_daerah_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      tahun: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      regulasi_acuan: {
        type: DataTypes.STRING(32),
        allowNull: false,
      },
      document_kind: {
        type: DataTypes.STRING(32),
        allowNull: false,
      },
      kode_sub_kegiatan: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      kelompok_sasaran: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      source_type: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: 'manual',
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
      tableName: 'renja_target_group_mapping',
      underscored: true,
      timestamps: true,
      indexes: [
        {
          unique: true,
          name: 'uq_renja_target_group_mapping_scope_code',
          fields: [
            'perangkat_daerah_id',
            'tahun',
            'regulasi_acuan',
            'document_kind',
            'kode_sub_kegiatan',
          ],
        },
        {
          name: 'idx_renja_target_group_mapping_pd_code',
          fields: ['perangkat_daerah_id', 'kode_sub_kegiatan'],
        },
      ],
    },
  );

  return RenjaTargetGroupMapping;
};
