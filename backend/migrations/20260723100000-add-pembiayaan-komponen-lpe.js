"use strict";

/**
 * Tambah komponen LPE "PERUBAHAN_EKUITAS_PEMBIAYAAN" — menangkap efek Ekuitas
 * dari jurnal UP/GU/TUP (Kas debit/Ekuitas kredit, lihat bkuJurnalService.js)
 * yang sebelumnya tidak pernah ikut dihitung di EKUITAS_AKHIR LPE, sehingga
 * LPE tidak pernah balance dengan Neraca kalau ada penerimaan UP/GU/TUP.
 */

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TABLE \`lpe_snapshot\` MODIFY \`komponen\` ENUM(
        'EKUITAS_AWAL','SURPLUS_DEFISIT_LO','PERUBAHAN_EKUITAS_PEMBIAYAAN',
        'KOREKSI_PERSEDIAAN','KOREKSI_ASET_TETAP','KOREKSI_LAINNYA',
        'KEWAJIBAN_KONSOLIDASIKAN','EKUITAS_AKHIR'
      ) NOT NULL;`,
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `DELETE FROM \`lpe_snapshot\` WHERE \`komponen\` = 'PERUBAHAN_EKUITAS_PEMBIAYAAN';`,
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE \`lpe_snapshot\` MODIFY \`komponen\` ENUM(
        'EKUITAS_AWAL','SURPLUS_DEFISIT_LO',
        'KOREKSI_PERSEDIAAN','KOREKSI_ASET_TETAP','KOREKSI_LAINNYA',
        'KEWAJIBAN_KONSOLIDASIKAN','EKUITAS_AKHIR'
      ) NOT NULL;`,
    );
  },
};
