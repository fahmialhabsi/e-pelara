'use strict';

/**
 * Data Pejabat Penandatangan RKA (Pengguna Anggaran, Kuasa Pengguna Anggaran, Kepala Dinas,
 * Sekretaris) — sebelumnya nama/NIP pejabat ini hardcode di kode export ("Dheny Tjan, SH., M.Si")
 * atau placeholder teks "[Nama Pengguna Anggaran]" yang tidak pernah terisi. Disimpan per tahun
 * anggaran, mengikuti pola tabel `tapd` yang sudah ada (Setting TAPD).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pejabat_penandatangan', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      tahun: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      role: {
        type: Sequelize.ENUM(
          'PENGGUNA_ANGGARAN',
          'KUASA_PENGGUNA_ANGGARAN',
          'KEPALA_DINAS',
          'SEKRETARIS',
        ),
        allowNull: false,
      },
      nama: { type: Sequelize.STRING(255), allowNull: true },
      nip: { type: Sequelize.STRING(50), allowNull: true },
      jabatan: { type: Sequelize.STRING(255), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('pejabat_penandatangan', ['tahun', 'role'], {
      unique: true,
      name: 'pejabat_penandatangan_tahun_role_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('pejabat_penandatangan');
  },
};
