'use strict';

/**
 * Evidence & Operasi Pangan — Phase 0 Foundation. Tabel registry
 * dokumen/evidence generik, independen dari `prosnp_bukti_dukung` (tidak
 * ada FK ke tabel ProSN mana pun — mandat "Phase 0" §5/§20/§72).
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
    await queryInterface.createTable('food_ops_document', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      tenant_id: tenantColumn(Sequelize),

      kelompok_uuid: { type: Sequelize.UUID, allowNull: false },
      versi: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
      menggantikan_document_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'food_ops_document', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },

      document_class: { type: Sequelize.ENUM('REGULATION', 'OPERATIONAL_EVIDENCE', 'ACTIVITY_DOCUMENT', 'REPORT', 'OTHER'), allowNull: false },
      document_type: { type: Sequelize.STRING(50), allowNull: false },

      judul: { type: Sequelize.STRING(255), allowNull: false },
      nomor_dokumen: { type: Sequelize.STRING(150), allowNull: true },
      tanggal_dokumen: { type: Sequelize.DATEONLY, allowNull: true },
      penerbit: { type: Sequelize.STRING(255), allowNull: true },

      file_name_original: { type: Sequelize.STRING(255), allowNull: false },
      file_name_stored: { type: Sequelize.STRING(255), allowNull: false },
      file_path: { type: Sequelize.STRING(500), allowNull: false },
      file_url: { type: Sequelize.STRING(500), allowNull: true },

      mime_type: { type: Sequelize.STRING(150), allowNull: false },
      ukuran_byte: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
      checksum_sha256: { type: Sequelize.STRING(64), allowNull: false },

      status: { type: Sequelize.ENUM('aktif', 'perlu_perbaikan', 'digantikan', 'dibatalkan'), allowNull: false, defaultValue: 'aktif' },
      status_verifikasi: { type: Sequelize.ENUM('uploaded', 'valid', 'invalid', 'needs_clarification', 'duplicate', 'expired'), allowNull: false, defaultValue: 'uploaded' },

      extracted_text_cache: { type: Sequelize.TEXT, allowNull: true },
      extracted_at: { type: Sequelize.DATE, allowNull: true },
      extraction_method: { type: Sequelize.STRING(32), allowNull: true },
      klasifikasi_meta: { type: Sequelize.JSON, allowNull: true },

      authority_level: { type: Sequelize.ENUM('STRUCTURED_SYSTEM_SOURCE', 'SIGNED_UPLOAD', 'SYSTEM_GENERATED_DRAFT', 'SUPPORTING', 'TEST_DATA'), allowNull: true },
      generated_status: { type: Sequelize.ENUM('DRAFT', 'GENERATED', 'FINAL'), allowNull: true },

      lock_version: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      created_by: userColumn(Sequelize),
      updated_by: userColumn(Sequelize),
      ...auditColumns(Sequelize),
    });

    await queryInterface.addIndex('food_ops_document', ['tenant_id', 'kelompok_uuid'], { name: 'idx_food_ops_document_tenant_kelompok' });
    await queryInterface.addIndex('food_ops_document', ['tenant_id', 'document_class'], { name: 'idx_food_ops_document_tenant_class' });
    await queryInterface.addIndex('food_ops_document', ['tenant_id', 'document_type'], { name: 'idx_food_ops_document_tenant_type' });
    await queryInterface.addIndex('food_ops_document', ['tenant_id', 'tanggal_dokumen'], { name: 'idx_food_ops_document_tenant_tanggal' });
    await queryInterface.addIndex('food_ops_document', ['checksum_sha256'], { name: 'idx_food_ops_document_checksum' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('food_ops_document');
  },
};
