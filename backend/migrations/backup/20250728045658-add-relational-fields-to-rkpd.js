"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("rkpd", "program_id", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: "program",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addColumn("rkpd", "kegiatan_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "kegiatan",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addColumn("rkpd", "sub_kegiatan_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "sub_kegiatan",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addColumn("rkpd", "opd_penanggung_jawab_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "opd_penanggung_jawab",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addColumn("rkpd", "prioritas_nasional_id", {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: true,
      references: {
        model: "prioritas_nasional",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addColumn("rkpd", "prioritas_daerah_id", {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: true,
      references: {
        model: "prioritas_daerah",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addColumn("rkpd", "prioritas_kepala_daerah_id", {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: true,
      references: {
        model: "prioritas_kepala_daerah",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("rkpd", "program_id");
    await queryInterface.removeColumn("rkpd", "kegiatan_id");
    await queryInterface.removeColumn("rkpd", "sub_kegiatan_id");
    await queryInterface.removeColumn("rkpd", "opd_penanggung_jawab_id");
    await queryInterface.removeColumn("rkpd", "prioritas_nasional_id");
    await queryInterface.removeColumn("rkpd", "prioritas_daerah_id");
    await queryInterface.removeColumn("rkpd", "prioritas_kepala_daerah_id");
  },
};
