"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("renstra_program");

    // Hapus kolom lama (jika ada)
    const colsToRemove = [
      "kebijakan_id",
      "no_program",
      "isi_program",
      "no_rpjmd",
      "isi_program_rpjmd",
      "misi_id", // tambahkan ini!
    ];

    for (const col of colsToRemove) {
      if (table[col]) {
        await queryInterface.removeColumn("renstra_program", col);
      }
    }

    // Tambah kolom baru (hanya jika belum ada)
    if (!table.opd_penanggung_jawab) {
      await queryInterface.addColumn(
        "renstra_program",
        "opd_penanggung_jawab",
        {
          type: Sequelize.STRING,
          allowNull: false,
        }
      );
    }

    if (!table.bidang_opd_penanggung_jawab) {
      await queryInterface.addColumn(
        "renstra_program",
        "bidang_opd_penanggung_jawab",
        {
          type: Sequelize.STRING,
          allowNull: false,
        }
      );
    }

    if (!table.rpjmd_program_id) {
      await queryInterface.addColumn("renstra_program", "rpjmd_program_id", {
        type: Sequelize.UUID,
        allowNull: false,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // Tambahkan kembali kolom-kolom yang dihapus
    await queryInterface.addColumn("renstra_program", "kebijakan_id", {
      type: Sequelize.INTEGER,
    });
    await queryInterface.addColumn("renstra_program", "no_program", {
      type: Sequelize.STRING,
    });
    await queryInterface.addColumn("renstra_program", "isi_program", {
      type: Sequelize.TEXT,
    });
    await queryInterface.addColumn("renstra_program", "no_rpjmd", {
      type: Sequelize.STRING,
    });
    await queryInterface.addColumn("renstra_program", "isi_program_rpjmd", {
      type: Sequelize.TEXT,
    });
    await queryInterface.addColumn("renstra_program", "misi_id", {
      type: Sequelize.INTEGER,
    });

    // Hapus kembali kolom-kolom baru
    await queryInterface.removeColumn(
      "renstra_program",
      "opd_penanggung_jawab"
    );
    await queryInterface.removeColumn(
      "renstra_program",
      "bidang_opd_penanggung_jawab"
    );
    await queryInterface.removeColumn("renstra_program", "rpjmd_program_id");
  },
};
