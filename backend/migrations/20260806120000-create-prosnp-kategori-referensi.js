'use strict';

/**
 * Tabel referensi kategori Hambatan/Tindak Lanjut untuk pengisian ProSN.
 *
 * Data global (bukan per-tenant) — ini taksonomi tetap seperti "kendala SDM",
 * "keterlambatan anggaran", dsb., bukan data operasional per OPD. Pola sama
 * dengan mr_reference_groups/mr_reference_items (lookup generik), tapi dibuat
 * tabel sendiri yang lebih sederhana (1 tabel, bukan group+item terpisah)
 * karena baru ada 2 kelompok (hambatan, tindak_lanjut) — bukan sistem lookup
 * lintas-domain seperti di modul MR.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('prosnp_kategori_referensi', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      kelompok: { type: Sequelize.ENUM('hambatan', 'tindak_lanjut'), allowNull: false },
      kode: { type: Sequelize.STRING(50), allowNull: false },
      label: { type: Sequelize.STRING(255), allowNull: false },
      urutan: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      aktif: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('prosnp_kategori_referensi', ['kelompok', 'kode'], { unique: true, name: 'uq_prosnp_kategori_referensi_kelompok_kode' });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('prosnp_kategori_referensi');
  },
};
