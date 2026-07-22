"use strict";

/**
 * Fase 3 (desain kas tunai vs bank): tambah atribut `jenis_kas` per baris BKU
 * (TUNAI/BANK) supaya bisa direkonstruksi jadi 2 Buku Pembantu (Kas Tunai &
 * Kas di Bank) untuk rekonsiliasi terpisah — TANPA mengubah akun GL tunggal
 * `1.1.01.02` (Kas di Bendahara Pengeluaran) yang sudah dipakai luas di
 * LRA/Neraca/LO/rekonsiliasi. BKU tetap 1 ledger gabungan (saldo kombinasi
 * tidak berubah); pemisahan tunai/bank murni level pelaporan/pembantu.
 *
 * `PEMINDAHAN_KAS` ditambah ke enum jenis_transaksi untuk mencatat perpindahan
 * kas internal bank<->tunai (2 baris BKU per pemindahan, tanpa jurnal GL
 * karena akunnya sama — lihat lkBkuController.pindahKas).
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("bku", "jenis_kas", {
      type: Sequelize.ENUM("TUNAI", "BANK"),
      allowNull: false,
      defaultValue: "BANK",
    });

    await queryInterface.sequelize.query(
      `ALTER TABLE \`bku\` MODIFY \`jenis_transaksi\` ENUM(
        'UP','GU','TUP','LS_GAJI','LS_BARANG','PENERIMAAN_LAIN',
        'PENGELUARAN_LAIN','SETORAN_SISA_UP','PEMINDAHAN_KAS'
      ) NOT NULL;`,
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TABLE \`bku\` MODIFY \`jenis_transaksi\` ENUM(
        'UP','GU','TUP','LS_GAJI','LS_BARANG','PENERIMAAN_LAIN',
        'PENGELUARAN_LAIN','SETORAN_SISA_UP'
      ) NOT NULL;`,
    );
    await queryInterface.removeColumn("bku", "jenis_kas");
  },
};
