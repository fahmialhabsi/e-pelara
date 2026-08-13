'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProsnPengisian extends Model {
    static associate(models) {
      ProsnPengisian.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
      ProsnPengisian.belongsTo(models.ProsnIndikator, { foreignKey: 'indikator_id', as: 'indikator' });
      ProsnPengisian.belongsTo(models.User, { foreignKey: 'diisi_oleh', as: 'pengisi' });
      ProsnPengisian.hasMany(models.ProsnPemeriksaan, { foreignKey: 'pengisian_id', as: 'pemeriksaans' });
      ProsnPengisian.hasMany(models.ProsnRiwayatStatus, { foreignKey: 'pengisian_id', as: 'riwayatStatus' });
      ProsnPengisian.belongsTo(models.ProsnKategoriReferensi, { foreignKey: 'hambatan_kategori_id', as: 'hambatanKategori' });
      ProsnPengisian.belongsTo(models.ProsnKategoriReferensi, { foreignKey: 'tindak_lanjut_kategori_id', as: 'tindakLanjutKategori' });
      ProsnPengisian.hasMany(models.ProsnSuratPenugasan, { foreignKey: 'pengisian_id', as: 'suratPenugasan' });
      ProsnPengisian.hasMany(models.ProsnRapatForkopimda, { foreignKey: 'pengisian_id', as: 'rapatForkopimda' });
      ProsnPengisian.hasMany(models.ProsnStokTransaksi, { foreignKey: 'pengisian_id', as: 'stokTransaksi' });
      ProsnPengisian.hasMany(models.ProsnInovasi, { foreignKey: 'pengisian_id', as: 'inovasi' });
      ProsnPengisian.hasOne(models.ProsnSatgasMbg, { foreignKey: 'pengisian_id', as: 'satgasMbg' });
      ProsnPengisian.hasMany(models.ProsnSarprasKomponenMbg, { foreignKey: 'pengisian_id', as: 'sarprasKomponenMbg' });
      ProsnPengisian.hasMany(models.ProsnLaporanSatgasMbg, { foreignKey: 'pengisian_id', as: 'laporanSatgasMbg' });
    }
  }

  ProsnPengisian.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tenant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    indikator_id: { type: DataTypes.INTEGER, allowNull: false },
    status: {
      type: DataTypes.ENUM('belum_diisi', 'dalam_pengisian', 'lengkap', 'perlu_perbaikan', 'diperiksa', 'siap_diinput_prosn', 'diinput_manual', 'siap_diekspor', 'diarsipkan'),
      allowNull: false, defaultValue: 'belum_diisi',
    },
    lock_version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    data_form: { type: DataTypes.JSON, allowNull: false },
    target_nilai: { type: DataTypes.DECIMAL(20, 4), allowNull: true },
    realisasi_nilai: { type: DataTypes.DECIMAL(20, 4), allowNull: true },
    rasio_nilai: { type: DataTypes.DECIMAL(9, 4), allowNull: true },
    satuan: { type: DataTypes.STRING(80), allowNull: true },
    sumber_data: { type: DataTypes.TEXT, allowNull: true },
    periode_data: { type: DataTypes.STRING(100), allowNull: true },
    hambatan: { type: DataTypes.TEXT, allowNull: true },
    hambatan_kategori_id: { type: DataTypes.INTEGER, allowNull: true },
    tindak_lanjut: { type: DataTypes.TEXT, allowNull: true },
    tindak_lanjut_kategori_id: { type: DataTypes.INTEGER, allowNull: true },
    diisi_oleh: { type: DataTypes.INTEGER, allowNull: true }, diisi_at: { type: DataTypes.DATE, allowNull: true },
    siap_input_oleh: { type: DataTypes.INTEGER, allowNull: true }, siap_input_at: { type: DataTypes.DATE, allowNull: true },
    input_manual_oleh: { type: DataTypes.INTEGER, allowNull: true }, input_manual_at: { type: DataTypes.DATE, allowNull: true },
    nomor_bukti_input: { type: DataTypes.STRING(150), allowNull: true },
    skor_indikatif_internal: { type: DataTypes.DECIMAL(4, 2), allowNull: true },
    skor_alasan: { type: DataTypes.TEXT, allowNull: true },
    skor_detail: { type: DataTypes.JSON, allowNull: true },
    skor_dihitung_at: { type: DataTypes.DATE, allowNull: true },
    legacy_status: { type: DataTypes.ENUM('needs_review'), allowNull: true },
    legacy_data_form: { type: DataTypes.JSON, allowNull: true },
    rekonsiliasi_status: { type: DataTypes.ENUM('tidak_berlaku', 'ok', 'perlu_rekonsiliasi'), allowNull: false, defaultValue: 'tidak_berlaku' },
    rekonsiliasi_selisih: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
    rekonsiliasi_alasan: { type: DataTypes.TEXT, allowNull: true },
    rekonsiliasi_diperiksa_at: { type: DataTypes.DATE, allowNull: true },
    sumber_data_tanggal_posisi: { type: DataTypes.DATEONLY, allowNull: true },
    sumber_data_referensi_dokumen: { type: DataTypes.STRING(255), allowNull: true },
    // Corrective "ProSN Semester-II Readiness — Sumber Data Authoritative
    // Auto-Sync" (mandat §19) — TRUE hanya bila server memverifikasi saat
    // save bahwa sumber_data PERSIS SAMA dgn saran sistem terkini (lihat
    // prosnpController.updatePengisian); memungkinkan frontend menyegarkan
    // tampilan otomatis TANPA risiko menimpa teks yg pernah diedit manual.
    sumber_data_is_auto: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    created_by: { type: DataTypes.INTEGER, allowNull: true }, updated_by: { type: DataTypes.INTEGER, allowNull: true },
  }, { sequelize, modelName: 'ProsnPengisian', tableName: 'prosnp_pengisian', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  return ProsnPengisian;
};
