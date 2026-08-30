'use strict';

/**
 * Corrective pass — Evidence Binding per Record (mandat §5).
 *
 * Sebelumnya bukti terikat hanya ke level indikator (prosnp_bukti_indikator.
 * indikator_id) — satu bukti "berlaku" untuk semua surat/rapat/transaksi di
 * indikator itu. Ini ditambah (BUKAN diganti — kolom lama tetap ada & tetap
 * dipakai sbg fallback binding generik) dengan entity_type/entity_id supaya
 * satu bukti bisa menunjuk LANGSUNG ke satu surat/rapat/transaksi/inovasi
 * spesifik, sesuai pola generik yang diminta mandat ("gunakan entity_type/
 * entity_id apabila cocok dengan arsitektur existing").
 *
 * pengisian_id didenormalisasi di sini (bukan cuma diturunkan dari indikator_id)
 * supaya validasi referensial "entity tidak boleh menunjuk record di luar
 * pengisian yang sama" bisa dicek murah tanpa join berlapis di setiap request.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('prosnp_bukti_indikator', 'pengisian_id', {
      type: Sequelize.INTEGER, allowNull: true,
      references: { model: 'prosnp_pengisian', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
    });
    await queryInterface.addColumn('prosnp_bukti_indikator', 'entity_type', {
      type: Sequelize.ENUM('SURAT_PENUGASAN', 'RAPAT_FORKOPIMDA', 'CADANGAN_TARGET', 'STOK_TRANSAKSI', 'INOVASI', 'PENGISIAN'),
      allowNull: true,
      comment: 'NULL = binding generik lama (berlaku ke seluruh indikator, dipertahankan utk kompatibilitas). Diisi = binding presisi ke satu record spesifik.',
    });
    await queryInterface.addColumn('prosnp_bukti_indikator', 'entity_id', {
      type: Sequelize.INTEGER, allowNull: true,
      comment: 'ID record spesifik sesuai entity_type — FK polimorfik, divalidasi di service layer (MySQL tidak mendukung FK kondisional).',
    });
    await queryInterface.addIndex('prosnp_bukti_indikator', ['entity_type', 'entity_id'], { name: 'idx_prosnp_bukti_entity' });
    await queryInterface.addIndex('prosnp_bukti_indikator', ['pengisian_id'], { name: 'idx_prosnp_bukti_pengisian' });

    // Backfill: baris lama (semua binding existing) diberi pengisian_id yang benar
    // dari indikator_id, entity_type/entity_id dibiarkan NULL (tetap binding generik,
    // bukan diklaim presisi ke record tertentu — sesuai mandat §18 "jangan mengklaim
    // binding otomatis jika tidak yakin").
    await queryInterface.sequelize.query(`
      UPDATE prosnp_bukti_indikator bi
      INNER JOIN prosnp_pengisian p ON p.indikator_id = bi.indikator_id
      SET bi.pengisian_id = p.id
      WHERE bi.pengisian_id IS NULL
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('prosnp_bukti_indikator', 'idx_prosnp_bukti_pengisian');
    await queryInterface.removeIndex('prosnp_bukti_indikator', 'idx_prosnp_bukti_entity');
    await queryInterface.removeColumn('prosnp_bukti_indikator', 'entity_id');
    await queryInterface.removeColumn('prosnp_bukti_indikator', 'entity_type');
    await queryInterface.removeColumn('prosnp_bukti_indikator', 'pengisian_id');
  },
};
