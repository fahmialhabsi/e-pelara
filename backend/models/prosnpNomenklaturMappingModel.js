'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProsnNomenklaturMapping extends Model {
    static associate(models) {
      ProsnNomenklaturMapping.belongsTo(models.ProsnMasterIndikator, { foreignKey: 'master_indikator_id', as: 'masterIndikator' });
      ProsnNomenklaturMapping.belongsTo(models.MasterSubKegiatan, { foreignKey: 'master_sub_kegiatan_id', as: 'masterSubKegiatan' });
    }
  }

  ProsnNomenklaturMapping.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    master_indikator_id: { type: DataTypes.INTEGER, allowNull: false },
    master_sub_kegiatan_id: { type: DataTypes.INTEGER, allowNull: true },
    kode_program: { type: DataTypes.STRING(50), allowNull: true },
    nama_program: { type: DataTypes.STRING(255), allowNull: true },
    kode_kegiatan: { type: DataTypes.STRING(50), allowNull: true },
    nama_kegiatan: { type: DataTypes.STRING(255), allowNull: true },
    kode_sub_kegiatan: { type: DataTypes.STRING(50), allowNull: false },
    nama_sub_kegiatan: { type: DataTypes.STRING(255), allowNull: false },
    indikator_sub_kegiatan: { type: DataTypes.TEXT, allowNull: true },
    satuan: { type: DataTypes.STRING(50), allowNull: true },
    status_relevansi: { type: DataTypes.ENUM('core', 'direct_conditional', 'supporting', 'context_only', 'excluded'), allowNull: false },
    jenis_kontribusi: {
      type: DataTypes.ENUM('policy_support', 'delivery', 'budget', 'output', 'outcome', 'evidence', 'infrastructure', 'coordination', 'innovation'),
      allowNull: false,
    },
    komoditas_wajib: { type: DataTypes.STRING(50), allowNull: true },
    berlaku_mulai: { type: DataTypes.DATEONLY, allowNull: true },
    berlaku_sampai: { type: DataTypes.DATEONLY, allowNull: true },
    dasar_pemetaan: { type: DataTypes.TEXT, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, { sequelize, modelName: 'ProsnNomenklaturMapping', tableName: 'prosnp_nomenklatur_mapping', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  return ProsnNomenklaturMapping;
};
