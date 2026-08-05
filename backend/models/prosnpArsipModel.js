'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProsnArsip extends Model {
    static associate(models) {
      ProsnArsip.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
      ProsnArsip.belongsTo(models.ProsnPeriode, { foreignKey: 'periode_id', as: 'periode' });
      ProsnArsip.belongsTo(models.ProsnBuktiDukung, { foreignKey: 'bukti_input_manual_id', as: 'buktiInputManual' });
      ProsnArsip.belongsTo(models.User, { foreignKey: 'diarsipkan_oleh', as: 'diarsipkanOleh' });
    }
  }

  ProsnArsip.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tenant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    periode_id: { type: DataTypes.INTEGER, allowNull: false },
    nomor_arsip: { type: DataTypes.STRING(100), allowNull: false },
    snapshot_data: { type: DataTypes.JSON, allowNull: false },
    checksum_snapshot: { type: DataTypes.STRING(64), allowNull: false },
    bukti_input_manual_id: { type: DataTypes.INTEGER, allowNull: true },
    diekspor_excel_at: { type: DataTypes.DATE, allowNull: true },
    diekspor_pdf_at: { type: DataTypes.DATE, allowNull: true },
    diekspor_word_at: { type: DataTypes.DATE, allowNull: true },
    diarsipkan_oleh: { type: DataTypes.INTEGER, allowNull: false },
    diarsipkan_at: { type: DataTypes.DATE, allowNull: false },
    catatan: { type: DataTypes.TEXT, allowNull: true },
  }, { sequelize, modelName: 'ProsnArsip', tableName: 'prosnp_arsip', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  return ProsnArsip;
};
