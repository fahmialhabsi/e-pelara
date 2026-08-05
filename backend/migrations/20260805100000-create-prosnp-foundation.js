'use strict';

/**
 * Fondasi Modul ProSN internal.
 *
 * Seluruh tabel bertenant: tenant_id wajib agar unique scope MySQL tidak
 * melemah karena NULL. Konsistensi tenant parent/child tetap divalidasi pada
 * service layer karena MySQL tidak dapat menegakkan composite FK ini dengan
 * model relasi yang ada.
 */
const tenantRef = { model: 'tenants', key: 'id' };
const userRef = { model: 'users', key: 'id' };
const tenantColumn = (Sequelize) => ({
  type: Sequelize.INTEGER.UNSIGNED,
  allowNull: false,
  references: tenantRef,
  onUpdate: 'CASCADE',
  onDelete: 'RESTRICT',
});
const auditColumns = (Sequelize) => ({
  created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
  updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
});
const userColumn = (Sequelize, allowNull = true) => ({
  type: Sequelize.INTEGER,
  allowNull,
  references: userRef,
  onUpdate: 'CASCADE',
  onDelete: allowNull ? 'SET NULL' : 'RESTRICT',
});

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('prosnp_periode', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      tenant_id: tenantColumn(Sequelize),
      perangkat_daerah_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'perangkat_daerah', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      tahun: { type: Sequelize.STRING(4), allowNull: false },
      semester: { type: Sequelize.ENUM('1', '2', 'tahunan'), allowNull: false, defaultValue: 'tahunan' },
      nama: { type: Sequelize.STRING(150), allowNull: false },
      tanggal_mulai: { type: Sequelize.DATEONLY, allowNull: false },
      tanggal_tenggat: { type: Sequelize.DATEONLY, allowNull: false },
      status: { type: Sequelize.ENUM('draft', 'aktif', 'terkunci', 'diarsipkan'), allowNull: false, defaultValue: 'draft' },
      dikunci_at: { type: Sequelize.DATE, allowNull: true },
      dikunci_oleh: userColumn(Sequelize),
      catatan: { type: Sequelize.TEXT, allowNull: true },
      created_by: userColumn(Sequelize),
      updated_by: userColumn(Sequelize),
      ...auditColumns(Sequelize),
    });
    await queryInterface.addIndex('prosnp_periode', ['tenant_id', 'perangkat_daerah_id', 'tahun', 'semester'], { unique: true, name: 'uq_prosnp_periode_scope' });
    await queryInterface.addIndex('prosnp_periode', ['tenant_id', 'status', 'tanggal_tenggat'], { name: 'idx_prosnp_periode_status_deadline' });

    await queryInterface.createTable('prosnp_indikator', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      tenant_id: tenantColumn(Sequelize),
      periode_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'prosnp_periode', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      kode: { type: Sequelize.STRING(32), allowNull: false },
      nama: { type: Sequelize.STRING(500), allowNull: false },
      deskripsi: { type: Sequelize.TEXT, allowNull: true },
      tipe_form: { type: Sequelize.ENUM('dukungan_program', 'target_capaian_rasio', 'distribusi_status'), allowNull: false },
      konfigurasi_form: { type: Sequelize.JSON, allowNull: false },
      satuan_default: { type: Sequelize.STRING(80), allowNull: true },
      rumus: { type: Sequelize.TEXT, allowNull: true },
      wajib_bukti: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      minimum_bukti: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
      urutan: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      aktif: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      renja_pro_sn_master_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'renja_pro_sn_master', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      renja_dukungan_prosn_tematik_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'renja_dukungan_prosn_tematik', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      created_by: userColumn(Sequelize),
      updated_by: userColumn(Sequelize),
      ...auditColumns(Sequelize),
    });
    await queryInterface.addIndex('prosnp_indikator', ['tenant_id', 'periode_id', 'kode'], { unique: true, name: 'uq_prosnp_indikator_scope_kode' });
    await queryInterface.addIndex('prosnp_indikator', ['tenant_id', 'periode_id', 'aktif', 'urutan'], { name: 'idx_prosnp_indikator_active_order' });

    await queryInterface.createTable('prosnp_pengisian', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      tenant_id: tenantColumn(Sequelize),
      indikator_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'prosnp_indikator', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      status: {
        type: Sequelize.ENUM('belum_diisi', 'dalam_pengisian', 'lengkap', 'perlu_perbaikan', 'siap_diinput_prosn', 'diinput_manual', 'diarsipkan'),
        allowNull: false,
        defaultValue: 'belum_diisi',
      },
      lock_version: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      data_form: { type: Sequelize.JSON, allowNull: false },
      target_nilai: { type: Sequelize.DECIMAL(20, 4), allowNull: true },
      realisasi_nilai: { type: Sequelize.DECIMAL(20, 4), allowNull: true },
      rasio_nilai: { type: Sequelize.DECIMAL(9, 4), allowNull: true },
      satuan: { type: Sequelize.STRING(80), allowNull: true },
      sumber_data: { type: Sequelize.TEXT, allowNull: true },
      periode_data: { type: Sequelize.STRING(100), allowNull: true },
      hambatan: { type: Sequelize.TEXT, allowNull: true },
      tindak_lanjut: { type: Sequelize.TEXT, allowNull: true },
      diisi_oleh: userColumn(Sequelize),
      diisi_at: { type: Sequelize.DATE, allowNull: true },
      siap_input_oleh: userColumn(Sequelize),
      siap_input_at: { type: Sequelize.DATE, allowNull: true },
      input_manual_oleh: userColumn(Sequelize),
      input_manual_at: { type: Sequelize.DATE, allowNull: true },
      nomor_bukti_input: { type: Sequelize.STRING(150), allowNull: true },
      created_by: userColumn(Sequelize),
      updated_by: userColumn(Sequelize),
      ...auditColumns(Sequelize),
    });
    await queryInterface.addIndex('prosnp_pengisian', ['tenant_id', 'indikator_id'], { unique: true, name: 'uq_prosnp_pengisian_indicator' });
    await queryInterface.addIndex('prosnp_pengisian', ['tenant_id', 'status'], { name: 'idx_prosnp_pengisian_status' });

    await queryInterface.createTable('prosnp_bukti_dukung', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      tenant_id: tenantColumn(Sequelize),
      periode_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'prosnp_periode', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      kelompok_uuid: { type: Sequelize.UUID, allowNull: false },
      versi: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
      judul: { type: Sequelize.STRING(255), allowNull: false },
      jenis_bukti: { type: Sequelize.STRING(80), allowNull: true },
      nama_asli: { type: Sequelize.STRING(255), allowNull: false },
      nama_tersimpan: { type: Sequelize.STRING(255), allowNull: false },
      file_path: { type: Sequelize.STRING(500), allowNull: false },
      file_url: { type: Sequelize.STRING(500), allowNull: true },
      mime_type: { type: Sequelize.STRING(150), allowNull: false },
      ukuran_byte: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      checksum_sha256: { type: Sequelize.STRING(64), allowNull: false },
      status: { type: Sequelize.ENUM('aktif', 'perlu_perbaikan', 'digantikan', 'dibatalkan'), allowNull: false, defaultValue: 'aktif' },
      lock_version: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      menggantikan_bukti_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'prosnp_bukti_dukung', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      catatan: { type: Sequelize.TEXT, allowNull: true },
      diunggah_oleh: userColumn(Sequelize, false),
      diunggah_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      ...auditColumns(Sequelize),
    });
    await queryInterface.addIndex('prosnp_bukti_dukung', ['tenant_id', 'periode_id', 'kelompok_uuid', 'versi'], { unique: true, name: 'uq_prosnp_bukti_version' });
    await queryInterface.addIndex('prosnp_bukti_dukung', ['tenant_id', 'periode_id', 'status'], { name: 'idx_prosnp_bukti_scope_status' });
    await queryInterface.addIndex('prosnp_bukti_dukung', ['tenant_id', 'checksum_sha256'], { name: 'idx_prosnp_bukti_checksum' });

    await queryInterface.createTable('prosnp_bukti_indikator', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      tenant_id: tenantColumn(Sequelize),
      bukti_dukung_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'prosnp_bukti_dukung', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      indikator_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'prosnp_indikator', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      relevansi: { type: Sequelize.TEXT, allowNull: true },
      checklist_status: { type: Sequelize.ENUM('belum_dicek', 'sesuai', 'tidak_sesuai'), allowNull: false, defaultValue: 'belum_dicek' },
      lock_version: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      catatan_kekurangan: { type: Sequelize.TEXT, allowNull: true },
      ditautkan_oleh: userColumn(Sequelize),
      ...auditColumns(Sequelize),
    });
    await queryInterface.addIndex('prosnp_bukti_indikator', ['tenant_id', 'bukti_dukung_id', 'indikator_id'], { unique: true, name: 'uq_prosnp_bukti_indicator' });
    await queryInterface.addIndex('prosnp_bukti_indikator', ['tenant_id', 'indikator_id', 'checklist_status'], { name: 'idx_prosnp_bukti_indicator_check' });

    await queryInterface.createTable('prosnp_pemeriksaan', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      tenant_id: tenantColumn(Sequelize),
      pengisian_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'prosnp_pengisian', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      putaran: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
      hasil: { type: Sequelize.ENUM('lengkap', 'perlu_perbaikan'), allowNull: false },
      status_data: { type: Sequelize.ENUM('lengkap', 'tidak_lengkap', 'tidak_valid'), allowNull: false },
      status_bukti: { type: Sequelize.ENUM('lengkap', 'tidak_lengkap', 'tidak_valid'), allowNull: false },
      catatan_kekurangan: { type: Sequelize.TEXT, allowNull: true },
      diperiksa_oleh: userColumn(Sequelize, false),
      diperiksa_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      ...auditColumns(Sequelize),
    });
    await queryInterface.addIndex('prosnp_pemeriksaan', ['tenant_id', 'pengisian_id', 'putaran'], { unique: true, name: 'uq_prosnp_review_round' });

    await queryInterface.createTable('prosnp_riwayat_status', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      tenant_id: tenantColumn(Sequelize),
      pengisian_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'prosnp_pengisian', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      status_sebelum: { type: Sequelize.STRING(40), allowNull: true },
      status_sesudah: { type: Sequelize.STRING(40), allowNull: false },
      alasan: { type: Sequelize.TEXT, allowNull: true },
      metadata: { type: Sequelize.JSON, allowNull: true },
      diubah_oleh: userColumn(Sequelize, false),
      diubah_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('prosnp_riwayat_status', ['tenant_id', 'pengisian_id', 'diubah_at'], { name: 'idx_prosnp_status_history' });

    await queryInterface.createTable('prosnp_arsip', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      tenant_id: tenantColumn(Sequelize),
      periode_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'prosnp_periode', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      nomor_arsip: { type: Sequelize.STRING(100), allowNull: false },
      snapshot_data: { type: Sequelize.JSON, allowNull: false },
      checksum_snapshot: { type: Sequelize.STRING(64), allowNull: false },
      bukti_input_manual_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'prosnp_bukti_dukung', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      diekspor_excel_at: { type: Sequelize.DATE, allowNull: true },
      diekspor_pdf_at: { type: Sequelize.DATE, allowNull: true },
      diekspor_word_at: { type: Sequelize.DATE, allowNull: true },
      diarsipkan_oleh: userColumn(Sequelize, false),
      diarsipkan_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      catatan: { type: Sequelize.TEXT, allowNull: true },
      ...auditColumns(Sequelize),
    });
    await queryInterface.addIndex('prosnp_arsip', ['tenant_id', 'periode_id'], { unique: true, name: 'uq_prosnp_archive_period' });
    await queryInterface.addIndex('prosnp_arsip', ['tenant_id', 'nomor_arsip'], { unique: true, name: 'uq_prosnp_archive_number' });
  },

  async down(queryInterface) {
    for (const table of [
      'prosnp_arsip', 'prosnp_riwayat_status', 'prosnp_pemeriksaan',
      'prosnp_bukti_indikator', 'prosnp_bukti_dukung', 'prosnp_pengisian',
      'prosnp_indikator', 'prosnp_periode',
    ]) {
      await queryInterface.dropTable(table);
    }
  },
};
