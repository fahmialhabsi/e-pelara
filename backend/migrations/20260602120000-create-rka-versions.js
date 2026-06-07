'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('rka_versions', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      rka_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'rka',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      version_number: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
      },
      snapshot_json: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      created_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
    await queryInterface.addIndex('rka_versions', ['rka_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('rka_versions');
  },
};
