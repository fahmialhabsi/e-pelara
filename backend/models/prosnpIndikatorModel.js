'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProsnIndikator extends Model {
    static associate(models) {
      ProsnIndikator.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
      ProsnIndikator.belongsTo(models.ProsnPeriode, { foreignKey: 'periode_id', as: 'periode' });
      ProsnIndikator.belongsTo(models.RenjaProSnMaster, { foreignKey: 'renja_pro_sn_master_id', as: 'referensiProSn' });
      ProsnIndikator.belongsTo(models.RenjaDukunganProsnTematik, { foreignKey: 'renja_dukungan_prosn_tematik_id', as: 'referensiDukunganRenja' });
      ProsnIndikator.belongsTo(models.ProsnMasterIndikator, { foreignKey: 'master_indikator_id', as: 'masterIndikator' });
      ProsnIndikator.belongsTo(models.PerangkatDaerah, { foreignKey: 'responsible_opd_id', as: 'responsibleOpd' });
      ProsnIndikator.belongsTo(models.PerangkatDaerah, { foreignKey: 'data_owner_opd_id', as: 'dataOwnerOpd' });
      ProsnIndikator.belongsTo(models.User, { foreignKey: 'evidence_coordinator_user_id', as: 'evidenceCoordinator' });
      ProsnIndikator.hasMany(models.ProsnIndikatorKontributor, { foreignKey: 'indikator_id', as: 'kontributor' });
      ProsnIndikator.hasOne(models.ProsnPengisian, { foreignKey: 'indikator_id', as: 'pengisian' });
      ProsnIndikator.belongsToMany(models.ProsnBuktiDukung, { through: models.ProsnBuktiIndikator, foreignKey: 'indikator_id', otherKey: 'bukti_dukung_id', as: 'buktiDukung' });
    }
  }

  ProsnIndikator.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tenant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    periode_id: { type: DataTypes.INTEGER, allowNull: false },
    kode: { type: DataTypes.STRING(32), allowNull: false },
    nama: { type: DataTypes.STRING(500), allowNull: false },
    deskripsi: { type: DataTypes.TEXT, allowNull: true },
    tipe_form: {
      type: DataTypes.ENUM(
        'dukungan_program', 'target_capaian_rasio', 'distribusi_status',
        'penugasan_kdh', 'koordinasi_forkopimda', 'cadangan_pangan_beras', 'inovasi_dan_perkada',
        'status_bertingkat_evidence', 'checklist_proporsional_evidence',
        'pelaporan_berkala_evidence', 'capaian_persentase_bertingkat',
      ),
      allowNull: false,
    },
    konfigurasi_form: { type: DataTypes.JSON, allowNull: false },
    satuan_default: { type: DataTypes.STRING(80), allowNull: true },
    rumus: { type: DataTypes.TEXT, allowNull: true },
    wajib_bukti: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    minimum_bukti: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
    urutan: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    aktif: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    renja_pro_sn_master_id: { type: DataTypes.INTEGER, allowNull: true },
    renja_dukungan_prosn_tematik_id: { type: DataTypes.INTEGER, allowNull: true },
    master_indikator_id: { type: DataTypes.INTEGER, allowNull: true },
    bobot_maksimal: { type: DataTypes.DECIMAL(4, 2), allowNull: true },
    responsible_opd_id: { type: DataTypes.INTEGER, allowNull: true },
    data_owner_opd_id: { type: DataTypes.INTEGER, allowNull: true },
    evidence_coordinator_user_id: { type: DataTypes.INTEGER, allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    updated_by: { type: DataTypes.INTEGER, allowNull: true },
  }, { sequelize, modelName: 'ProsnIndikator', tableName: 'prosnp_indikator', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  return ProsnIndikator;
};
