"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await Promise.all([
      queryInterface.addColumn("tujuan", "periode_id", {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "periode_rpjmds",
          key: "id",
        },
      }),
      queryInterface.addColumn("sasaran", "periode_id", {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "periode_rpjmds",
          key: "id",
        },
      }),
      queryInterface.addColumn("strategi", "periode_id", {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "periode_rpjmds",
          key: "id",
        },
      }),
      queryInterface.addColumn("arah_kebijakan", "periode_id", {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "periode_rpjmds",
          key: "id",
        },
      }),
      queryInterface.addColumn("program", "periode_id", {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "periode_rpjmds",
          key: "id",
        },
      }),
      queryInterface.addColumn("kegiatan", "periode_id", {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "periode_rpjmds",
          key: "id",
        },
      }),
      queryInterface.addColumn("sub_kegiatan", "periode_id", {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "periode_rpjmds",
          key: "id",
        },
      }),
    ]);
  },

  async down(queryInterface, Sequelize) {
    await Promise.all([
      queryInterface.removeColumn("tujuan", "periode_id"),
      queryInterface.removeColumn("sasaran", "periode_id"),
      queryInterface.removeColumn("strategi", "periode_id"),
      queryInterface.removeColumn("arah_kebijakan", "periode_id"),
      queryInterface.removeColumn("program", "periode_id"),
      queryInterface.removeColumn("kegiatan", "periode_id"),
      queryInterface.removeColumn("sub_kegiatan", "periode_id"),
    ]);
  },
};
