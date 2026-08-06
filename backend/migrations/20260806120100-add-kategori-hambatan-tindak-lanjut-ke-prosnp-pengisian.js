'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('prosnp_pengisian', 'hambatan_kategori_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'prosnp_kategori_referensi', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.addColumn('prosnp_pengisian', 'tindak_lanjut_kategori_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'prosnp_kategori_referensi', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('prosnp_pengisian', 'tindak_lanjut_kategori_id');
    await queryInterface.removeColumn('prosnp_pengisian', 'hambatan_kategori_id');
  },
};
