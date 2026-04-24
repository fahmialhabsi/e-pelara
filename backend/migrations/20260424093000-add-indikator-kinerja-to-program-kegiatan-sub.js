"use strict";

/**
 * Tambah kolom indikator_kinerja pada tabel indikator program/kegiatan/sub_kegiatan.
 * Alasan: konsistensi dengan indikatortujuans/indikatorsasarans/indikatorstrategis,
 * serta adapter Excel yang memetakan "Jenis (IKU/IKK)" ke field internal `jenis`.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const addIfMissing = async (table, col, def) => {
      const desc = await queryInterface.describeTable(table);
      if (!desc || desc[col]) return;
      await queryInterface.addColumn(table, col, def);
    };

    await addIfMissing("indikatorprograms", "indikator_kinerja", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await addIfMissing("indikatorkegiatans", "indikator_kinerja", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await addIfMissing("indikatorsubkegiatans", "indikator_kinerja", {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    // Backfill konservatif: jika indikator_kinerja kosong, samakan dari kolom `jenis`.
    // Tidak overwrite nilai indikator_kinerja yang sudah terisi.
    const backfill = async (table) => {
      const desc = await queryInterface.describeTable(table);
      if (!desc || !desc.indikator_kinerja || !desc.jenis) return;
      await queryInterface.sequelize.query(
        `UPDATE ${table} SET indikator_kinerja = jenis WHERE (indikator_kinerja IS NULL OR indikator_kinerja = '') AND jenis IS NOT NULL AND jenis <> ''`,
      );
    };
    await backfill("indikatorprograms");
    await backfill("indikatorkegiatans");
    await backfill("indikatorsubkegiatans");
  },

  async down(queryInterface) {
    const dropIfExists = async (table, col) => {
      const desc = await queryInterface.describeTable(table);
      if (!desc || !desc[col]) return;
      await queryInterface.removeColumn(table, col);
    };

    await dropIfExists("indikatorprograms", "indikator_kinerja");
    await dropIfExists("indikatorkegiatans", "indikator_kinerja");
    await dropIfExists("indikatorsubkegiatans", "indikator_kinerja");
  },
};
