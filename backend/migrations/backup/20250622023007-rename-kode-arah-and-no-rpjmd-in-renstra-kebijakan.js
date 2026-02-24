"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Ubah nama field 'kode_arah' menjadi 'kode_kebjkn' pada tabel renstra_kebijakan
    await queryInterface.renameColumn(
      "renstra_kebijakan",
      "kode_arah",
      "kode_kebjkn",
      {
        // Anda bisa menambahkan opsi tambahan di sini jika diperlukan, misalnya:
        // alter: true // jika ingin menggunakan ALTER TABLE secara langsung
      }
    );

    // Ubah nama field 'no_rpjmd' menjadi 'no_arah_rpjmd' pada tabel renstra_kebijakan
    await queryInterface.renameColumn(
      "renstra_kebijakan",
      "no_rpjmd",
      "no_arah_rpjmd",
      {
        // Anda bisa menambahkan opsi tambahan di sini jika diperlukan
      }
    );
  },

  down: async (queryInterface, Sequelize) => {
    // Revert perubahan: kembalikan nama field 'kode_kebjkn' menjadi 'kode_arah'
    await queryInterface.renameColumn(
      "renstra_kebijakan",
      "kode_kebjkn",
      "kode_arah",
      {
        // Anda bisa menambahkan opsi tambahan di sini jika diperlukan
      }
    );

    // Revert perubahan: kembalikan nama field 'no_arah_rpjmd' menjadi 'no_rpjmd'
    await queryInterface.renameColumn(
      "renstra_kebijakan",
      "no_arah_rpjmd",
      "no_rpjmd",
      {
        // Anda bisa menambahkan opsi tambahan di sini jika diperlukan
      }
    );
  },
};
