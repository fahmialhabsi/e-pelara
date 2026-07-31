'use strict';

/**
 * Program Prioritas Nasional/Daerah/Gubernur sebelumnya hanya ditandai di
 * level item RKPD (per tahun), belum ada di Renstra sama sekali — akibatnya
 * Renja Bab V (Permendagri 14/2026) tidak bisa menyajikan penandaan ini
 * secara konsisten lintas tahun untuk satu Program Renstra yang sama.
 * Migrasi ini menambah 3 kolom penanda di renstra_program, mengikuti pola
 * kolom yang sama persis di tabel `rkpd` (lihat migrations/backup/
 * 20250728045658-add-relational-fields-to-rkpd.js).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('renstra_program', 'prioritas_nasional_id', {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: true,
      references: {
        model: 'prioritas_nasional',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.addColumn('renstra_program', 'prioritas_daerah_id', {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: true,
      references: {
        model: 'prioritas_daerah',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.addColumn('renstra_program', 'prioritas_kepala_daerah_id', {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: true,
      references: {
        model: 'prioritas_kepala_daerah',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('renstra_program', 'prioritas_nasional_id');
    await queryInterface.removeColumn('renstra_program', 'prioritas_daerah_id');
    await queryInterface.removeColumn('renstra_program', 'prioritas_kepala_daerah_id');
  },
};
