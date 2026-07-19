'use strict';

/**
 * Realisasi per indikator_renstra (OPD, per tahun) — realisasi_indikator (yang sudah
 * ada) terkunci FK ke tabel `indikator` (RPJMD), bukan `indikator_renstra`, jadi perlu
 * tabel terpisah supaya realisasi indikator sub_kegiatan/kegiatan/program level OPD
 * bisa dicatat dan dijembatani ke `lakip` untuk Tabel 2.1/2.2 Renja.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('realisasi_indikator_renstra', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      indikator_renstra_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'indikator_renstra', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      tahun: { type: Sequelize.STRING(4), allowNull: false },
      nilai_realisasi: { type: Sequelize.DECIMAL(20, 2), allowNull: true },
      keterangan: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('realisasi_indikator_renstra', ['indikator_renstra_id', 'tahun'], {
      unique: true,
      name: 'uq_realisasi_indikator_renstra_ind_tahun',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('realisasi_indikator_renstra');
  },
};
