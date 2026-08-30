'use strict';

/**
 * Corrective pass — Rekonsiliasi Semester B.1.3 (mandat §9), Pilihan B:
 * transaksi TETAP per-pengisian/per-periode (tidak refactor ke ledger
 * tahunan terpisah — risiko migrasi data lebih besar drpd manfaatnya karena
 * rule engine SUDAH query lintas-periode-per-tahun sejak awal, lihat
 * prosnpRuleEngineService.hitungUlangB13), tapi ditambah:
 *   - source_transaction_id + is_carry_forward di prosnp_stok_transaksi:
 *     menandai baris yg dibuat OTOMATIS sbg salinan saldo akhir semester
 *     sebelumnya (bukan input manual baru) -> mencegah double counting krn
 *     jelas mana yg asli vs turunan.
 *   - kolom rekonsiliasi di prosnp_pengisian: dipakai HANYA utk indikator
 *     tipe cadangan_pangan_beras (sparse by design, sama pola dgn kolom skor).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('prosnp_stok_transaksi', 'source_transaction_id', {
      type: Sequelize.INTEGER, allowNull: true,
      references: { model: 'prosnp_stok_transaksi', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
      comment: 'Jika diisi: baris ini adalah salinan carry-forward dari transaksi ini (biasanya saldo akhir semester sebelumnya).',
    });
    await queryInterface.addColumn('prosnp_stok_transaksi', 'is_carry_forward', {
      type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false,
    });

    await queryInterface.addColumn('prosnp_pengisian', 'rekonsiliasi_status', {
      type: Sequelize.ENUM('tidak_berlaku', 'ok', 'perlu_rekonsiliasi'), allowNull: false, defaultValue: 'tidak_berlaku',
    });
    await queryInterface.addColumn('prosnp_pengisian', 'rekonsiliasi_selisih', { type: Sequelize.DECIMAL(18, 2), allowNull: true });
    await queryInterface.addColumn('prosnp_pengisian', 'rekonsiliasi_alasan', { type: Sequelize.TEXT, allowNull: true });
    await queryInterface.addColumn('prosnp_pengisian', 'rekonsiliasi_diperiksa_at', { type: Sequelize.DATE, allowNull: true });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('prosnp_pengisian', 'rekonsiliasi_diperiksa_at');
    await queryInterface.removeColumn('prosnp_pengisian', 'rekonsiliasi_alasan');
    await queryInterface.removeColumn('prosnp_pengisian', 'rekonsiliasi_selisih');
    await queryInterface.removeColumn('prosnp_pengisian', 'rekonsiliasi_status');
    await queryInterface.removeColumn('prosnp_stok_transaksi', 'is_carry_forward');
    await queryInterface.removeColumn('prosnp_stok_transaksi', 'source_transaction_id');
  },
};
