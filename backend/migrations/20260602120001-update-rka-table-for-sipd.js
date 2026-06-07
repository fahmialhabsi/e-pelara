'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Tambahkan kolom opd_id
    await queryInterface.addColumn('rka', 'opd_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: 'periode_id',
    });

    // 2. Tambahkan kolom kode_unik_sub_kegiatan
    await queryInterface.addColumn('rka', 'kode_unik_sub_kegiatan', {
      type: Sequelize.STRING(150),
      allowNull: false,
      defaultValue: 'MIG-' + Date.now(),
      after: 'sub_kegiatan',
    });

    // 3. Tambahkan kolom tahapan
    await queryInterface.addColumn('rka', 'tahapan', {
      type: Sequelize.ENUM('APBD_INDUK', 'PERGESERAN_1', 'PERGESERAN_2', 'APBD_PERUBAHAN'),
      allowNull: false,
      defaultValue: 'APBD_INDUK',
      after: 'kode_unik_sub_kegiatan',
    });

    // 4. Hapus kolom rincian_belanja (Metode aman)
    await queryInterface.removeColumn('rka', 'rincian_belanja');
  },

  async down(queryInterface, Sequelize) {
    // Kembalikan ke kondisi semula
    await queryInterface.addColumn('rka', 'rincian_belanja', {
      type: Sequelize.JSON,
      allowNull: true,
    });
    await queryInterface.removeColumn('rka', 'tahapan');
    await queryInterface.removeColumn('rka', 'kode_unik_sub_kegiatan');
    await queryInterface.removeColumn('rka', 'opd_id');
  },
};
