'use strict';

/**
 * Redesain ProSN — Fase 2: tabel register khusus B.1.1 (Penugasan KDH) dan
 * B.1.2 (Koordinasi Forkopimda). Menggantikan form generik dukungan_program
 * untuk dua indikator ini — lihat migration fase 1 utk perluasan tipe_form.
 */
const tenantColumn = (Sequelize) => ({
  type: Sequelize.INTEGER.UNSIGNED, allowNull: false,
  references: { model: 'tenants', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT',
});
const userColumn = (Sequelize) => ({
  type: Sequelize.INTEGER, allowNull: true,
  references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
});
const auditColumns = (Sequelize) => ({
  created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
  updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
});

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('prosnp_surat_penugasan', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      tenant_id: tenantColumn(Sequelize),
      periode_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'prosnp_periode', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      indikator_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'prosnp_indikator', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      pengisian_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'prosnp_pengisian', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      nomor_surat: { type: Sequelize.STRING(150), allowNull: false },
      tanggal_surat: { type: Sequelize.DATEONLY, allowNull: false },
      bulan: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false, comment: 'Diturunkan dari tanggal_surat saat simpan — dipertahankan sbg kolom eksplisit utk query rule engine per bulan.' },
      jenis_dokumen: { type: Sequelize.STRING(150), allowNull: true },
      pejabat_penandatangan: { type: Sequelize.STRING(150), allowNull: false },
      opd_penerima_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'perangkat_daerah', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      opd_penerima_nama: { type: Sequelize.STRING(255), allowNull: true },
      unit_pelaksana: { type: Sequelize.STRING(255), allowNull: true },
      tanggal_mulai_berlaku: { type: Sequelize.DATEONLY, allowNull: true },
      tanggal_berakhir: { type: Sequelize.DATEONLY, allowNull: true },
      ringkasan_isi: { type: Sequelize.TEXT, allowNull: false },
      cakupan_pengadaan: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      cakupan_pengelolaan: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      cakupan_penyaluran: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      status_tindak_lanjut: { type: Sequelize.ENUM('belum_ditindaklanjuti', 'sedang_diproses', 'selesai'), allowNull: false, defaultValue: 'belum_ditindaklanjuti' },
      catatan: { type: Sequelize.TEXT, allowNull: true },
      lock_version: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      created_by: userColumn(Sequelize),
      updated_by: userColumn(Sequelize),
      ...auditColumns(Sequelize),
    });
    await queryInterface.addIndex('prosnp_surat_penugasan', ['pengisian_id', 'tanggal_surat'], { name: 'idx_prosnp_surat_pengisian_tanggal' });
    await queryInterface.addIndex('prosnp_surat_penugasan', ['tenant_id', 'periode_id', 'nomor_surat'], { name: 'idx_prosnp_surat_dup_check' });

    // Mapping panel B.1.1: satu surat -> banyak Program/Kegiatan/Subkegiatan pendukung
    await queryInterface.createTable('prosnp_surat_penugasan_dukungan', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      tenant_id: tenantColumn(Sequelize),
      surat_penugasan_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'prosnp_surat_penugasan', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      kode_sub_kegiatan: { type: Sequelize.STRING(50), allowNull: true },
      program: { type: Sequelize.STRING(255), allowNull: true },
      kegiatan: { type: Sequelize.STRING(255), allowNull: true },
      sub_kegiatan: { type: Sequelize.STRING(255), allowNull: true },
      indikator_output: { type: Sequelize.TEXT, allowNull: true },
      target: { type: Sequelize.STRING(150), allowNull: true },
      pagu: { type: Sequelize.DECIMAL(20, 2), allowNull: true },
      realisasi: { type: Sequelize.DECIMAL(20, 2), allowNull: true },
      sumber_id: { type: Sequelize.STRING(100), allowNull: true, comment: 'ID sumber (mis. dpa.id) — jejak snapshot, lihat data snapshot layer di service.' },
      sumber_jenis: { type: Sequelize.ENUM('dpa', 'renja', 'rkpd', 'manual'), allowNull: false, defaultValue: 'manual' },
      ...auditColumns(Sequelize),
    });

    await queryInterface.createTable('prosnp_rapat_forkopimda', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      tenant_id: tenantColumn(Sequelize),
      periode_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'prosnp_periode', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      indikator_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'prosnp_indikator', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      pengisian_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'prosnp_pengisian', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      tanggal_rapat: { type: Sequelize.DATEONLY, allowNull: false },
      bulan: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false },
      nama_forum: { type: Sequelize.STRING(255), allowNull: false },
      jenis_forum: { type: Sequelize.STRING(150), allowNull: true },
      is_forkopimda: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      pimpinan_rapat: { type: Sequelize.STRING(150), allowNull: true },
      lokasi: { type: Sequelize.STRING(255), allowNull: true },
      unsur_forkopimda_hadir: { type: Sequelize.JSON, allowNull: true },
      instansi_lain_hadir: { type: Sequelize.TEXT, allowNull: true },
      topik_pengadaan: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      topik_pengelolaan: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      topik_penyaluran: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      agenda: { type: Sequelize.TEXT, allowNull: true },
      masalah: { type: Sequelize.TEXT, allowNull: true },
      keputusan: { type: Sequelize.TEXT, allowNull: true },
      tindak_lanjut: { type: Sequelize.TEXT, allowNull: true },
      penanggung_jawab_tindak_lanjut: { type: Sequelize.STRING(150), allowNull: true },
      batas_waktu_tindak_lanjut: { type: Sequelize.DATEONLY, allowNull: true },
      status_tindak_lanjut: { type: Sequelize.ENUM('belum_ditindaklanjuti', 'sedang_diproses', 'selesai'), allowNull: false, defaultValue: 'belum_ditindaklanjuti' },
      sub_kegiatan_pendukung: { type: Sequelize.STRING(255), allowNull: true },
      materi: { type: Sequelize.TEXT, allowNull: true },
      lock_version: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      created_by: userColumn(Sequelize),
      updated_by: userColumn(Sequelize),
      ...auditColumns(Sequelize),
    });
    await queryInterface.addIndex('prosnp_rapat_forkopimda', ['pengisian_id', 'tanggal_rapat'], { name: 'idx_prosnp_rapat_pengisian_tanggal' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('prosnp_rapat_forkopimda');
    await queryInterface.dropTable('prosnp_surat_penugasan_dukungan');
    await queryInterface.dropTable('prosnp_surat_penugasan');
  },
};
