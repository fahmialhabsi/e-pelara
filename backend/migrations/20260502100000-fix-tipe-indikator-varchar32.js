"use strict";

/**
 * Fix: kolom `tipe_indikator` pada 4 tabel indikator RPJMD.
 *
 * Masalah awal:
 *   - indikatorsasarans  → enum('Outcome')          — hanya terima 'Outcome', tolak 'Impact'
 *   - indikatortujuans   → enum('Impact')            — hanya terima 'Impact'
 *   - indikatorstrategis → enum('Outcome','Output','Impact','Process','Input') — tidak ada 'Proses'
 *   - indikatorarahkebijakans → enum(sama) — tidak ada 'Proses'
 *
 * Solusi: ubah semua ke VARCHAR(32) NOT NULL DEFAULT 'Impact' agar:
 *   1. Semua nilai valid (Impact, Outcome, Output, Process, Input, Proses) bisa tersimpan.
 *   2. Tidak ada ENUM maintenance di masa depan.
 *   3. Data lama tetap aman (nilai lama masih valid string).
 */

const TABLES = [
  "indikatortujuans",
  "indikatorsasarans",
  "indikatorstrategis",
  "indikatorarahkebijakans",
];

module.exports = {
  async up(queryInterface, Sequelize) {
    for (const table of TABLES) {
      await queryInterface.changeColumn(table, "tipe_indikator", {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "Impact",
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // Rollback: kembalikan ke definisi terdekat (ENUM paling luas + safe).
    // indikatortujuans & indikatorsasarans dikembalikan ke varchar(32) juga karena
    // enum lama terlalu sempit untuk rollback yang aman.
    for (const table of TABLES) {
      await queryInterface.changeColumn(table, "tipe_indikator", {
        type: Sequelize.ENUM("Outcome", "Output", "Impact", "Process", "Input", "Proses"),
        allowNull: false,
        defaultValue: "Impact",
      });
    }
  },
};
