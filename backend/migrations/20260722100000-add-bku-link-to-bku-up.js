"use strict";

/**
 * Fase 1 perbaikan BKU: pencairan UP/GU/TUP sekarang wajib menghasilkan
 * baris `bku` (penerimaan) yang terhubung ke jurnal+saldo, bukan cuma
 * catatan administratif `bku_up` yang berdiri sendiri. Kolom `bku_id`
 * melacak baris pencairan; `setoran_bku_id` melacak baris pengeluaran
 * saat sisa UP/TUP disetor kembali ke kas daerah.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("bku_up", "nomor_bukti", {
      type: Sequelize.STRING(60),
      allowNull: true,
    });
    await queryInterface.addColumn("bku_up", "nomor_sp2d", {
      type: Sequelize.STRING(50),
      allowNull: true,
    });
    await queryInterface.addColumn("bku_up", "bku_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: "bku", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
      comment: "Baris BKU (penerimaan) hasil pencairan UP/GU/TUP ini",
    });
    await queryInterface.addColumn("bku_up", "setoran_bku_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: "bku", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
      comment: "Baris BKU (pengeluaran SETORAN_SISA_UP) saat sisa UP disetor kembali",
    });
    await queryInterface.addIndex("bku_up", ["bku_id"], { name: "idx_bku_up_bku_id" });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("bku_up", "idx_bku_up_bku_id").catch(() => {});
    await queryInterface.removeColumn("bku_up", "setoran_bku_id");
    await queryInterface.removeColumn("bku_up", "bku_id");
    await queryInterface.removeColumn("bku_up", "nomor_sp2d");
    await queryInterface.removeColumn("bku_up", "nomor_bukti");
  },
};
