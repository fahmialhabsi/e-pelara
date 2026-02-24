"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(qi, Sequelize) {
    await qi.createTable(
      "cascading",
      {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
        },
        misi_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "misi", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        prior_nas_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          references: {
            model: "prioritas_nasional",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        prior_daerah_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          references: {
            model: "prioritas_daerah",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        prior_kepda_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          references: {
            model: "prioritas_kepala_daerah",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        tujuan_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: "tujuan",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        sasaran_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: "sasaran",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        program_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: "program",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        kegiatan_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "kegiatan", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
      },
      {
        engine: "InnoDB", // memastikan InnoDB
      }
    );
  },
  async down(qi) {
    await qi.dropTable("cascading");
  },
};
