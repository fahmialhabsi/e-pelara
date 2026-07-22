"use strict";

/**
 * Fase 3 perbaikan BKU (gap sedang): cegah duplikasi sync SPJ SIGAP di level
 * DATABASE, bukan cuma cek aplikasi (`Bku.findOne({sigap_spj_id})`) yang
 * rawan race condition kalau 2 proses sync jalan bersamaan. MySQL
 * memperbolehkan banyak NULL pada unique index, jadi baris BKU non-SPJ
 * (manual/UP/setoran) tetap aman.
 */

module.exports = {
  async up(queryInterface) {
    await queryInterface.removeIndex("bku", "idx_bku_sigap_spj").catch(() => {});
    await queryInterface.addIndex("bku", ["sigap_spj_id"], {
      name: "idx_bku_sigap_spj",
      unique: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("bku", "idx_bku_sigap_spj").catch(() => {});
    await queryInterface.addIndex("bku", ["sigap_spj_id"], { name: "idx_bku_sigap_spj" });
  },
};
