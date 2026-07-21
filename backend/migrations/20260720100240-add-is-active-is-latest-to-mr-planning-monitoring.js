'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('mr_planning_monitoring', 'is_active', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });

    await queryInterface.addColumn('mr_planning_monitoring', 'is_latest', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });

    await queryInterface.addIndex('mr_planning_monitoring', ['is_active'], {
      name: 'idx_mr_planning_monitoring_is_active',
    });
    await queryInterface.addIndex('mr_planning_monitoring', ['is_latest'], {
      name: 'idx_mr_planning_monitoring_is_latest',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      'mr_planning_monitoring',
      'idx_mr_planning_monitoring_is_active',
    );
    await queryInterface.removeIndex(
      'mr_planning_monitoring',
      'idx_mr_planning_monitoring_is_latest',
    );
    await queryInterface.removeColumn('mr_planning_monitoring', 'is_active');
    await queryInterface.removeColumn('mr_planning_monitoring', 'is_latest');
  },
};
