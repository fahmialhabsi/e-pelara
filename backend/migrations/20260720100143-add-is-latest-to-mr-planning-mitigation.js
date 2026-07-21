'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('mr_planning_mitigation', 'is_latest', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });

    await queryInterface.addIndex('mr_planning_mitigation', ['is_latest'], {
      name: 'idx_mr_planning_mitigation_is_latest',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      'mr_planning_mitigation',
      'idx_mr_planning_mitigation_is_latest',
    );
    await queryInterface.removeColumn('mr_planning_mitigation', 'is_latest');
  },
};
