"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("tujuan", {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      rpjmd_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "rpjmds",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      misi_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "misis",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      periode_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "periode_rpjmds",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      no_tujuan: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      isi_tujuan: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      tahun: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      jenis_dokumen: {
        type: Sequelize.STRING,
        allowNull: false,
      },
    });

    // Cek apakah constraint unik sudah ada sebelum menambahkannya
    const [results] = await queryInterface.sequelize.query(`
      SELECT CONSTRAINT_NAME
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tujuan'
        AND CONSTRAINT_NAME = 'unique_no_tujuan_per_misi_periode';
    `);

    if (results.length === 0) {
      await queryInterface.addConstraint("tujuan", {
        fields: ["misi_id", "periode_id", "no_tujuan"],
        type: "unique",
        name: "unique_no_tujuan_per_misi_periode",
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("tujuan");
  },
};
