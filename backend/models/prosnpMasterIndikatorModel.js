'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProsnMasterIndikator extends Model {
    static associate(models) {
      ProsnMasterIndikator.hasMany(models.ProsnIndikator, { foreignKey: 'master_indikator_id', as: 'instansiPeriode' });
      ProsnMasterIndikator.hasMany(models.ProsnNomenklaturMapping, { foreignKey: 'master_indikator_id', as: 'mapping' });
      ProsnMasterIndikator.belongsTo(models.PerangkatDaerah, { foreignKey: 'default_responsible_opd_id', as: 'defaultResponsibleOpd' });
    }
  }

  ProsnMasterIndikator.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    kode: { type: DataTypes.STRING(32), allowNull: false, unique: true },
    nama_indikator: { type: DataTypes.TEXT, allowNull: false },
    objek_kertas_kerja: { type: DataTypes.STRING(255), allowNull: true },
    tipe_form: {
      type: DataTypes.ENUM(
        'dukungan_program', 'target_capaian_rasio', 'distribusi_status',
        'penugasan_kdh', 'koordinasi_forkopimda', 'cadangan_pangan_beras', 'inovasi_dan_perkada',
        'status_bertingkat_evidence', 'checklist_proporsional_evidence',
        'pelaporan_berkala_evidence', 'capaian_persentase_bertingkat',
      ),
      allowNull: false,
    },
    bobot_maksimal: { type: DataTypes.DECIMAL(4, 2), allowNull: false },
    kriteria_skor: { type: DataTypes.JSON, allowNull: false },
    urutan: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    aktif: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    kelompok_tematik: { type: DataTypes.ENUM('ketahanan_pangan', 'mbg'), allowNull: false, defaultValue: 'ketahanan_pangan' },
    default_responsible_opd_id: { type: DataTypes.INTEGER, allowNull: true },
    evidence_requirement_provenance: { type: DataTypes.ENUM('regulatory_requirement', 'internal_control'), allowNull: false, defaultValue: 'internal_control' },
    indikator_renstra_id: { type: DataTypes.INTEGER, allowNull: true },
  }, { sequelize, modelName: 'ProsnMasterIndikator', tableName: 'prosnp_master_indikator', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  return ProsnMasterIndikator;
};
