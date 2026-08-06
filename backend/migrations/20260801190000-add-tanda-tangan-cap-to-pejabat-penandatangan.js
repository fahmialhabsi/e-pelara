'use strict';

/**
 * Tanda tangan & cap dinas ELEKTRONIK milik pejabat sendiri (bukan diambil
 * dari dokumen pihak lain — lihat diskusi 2026-08-01), disimpan sebagai file
 * gambar (URL relatif ke /uploads) supaya bisa dipasang otomatis di blok
 * tanda tangan dokumen resmi (PDF/Word) tanpa placeholder manual lagi.
 *
 * `persetujuan_pemilik` adalah gerbang wajib: baris tanda_tangan_url/
 * cap_dinas_url TIDAK BOLEH diisi lewat API kalau kolom ini bernilai false —
 * ditegakkan di controller, bukan cuma UI — supaya gambar tanda tangan/cap
 * pejabat tidak bisa disimpan tanpa persetujuan eksplisit dari pejabat ybs.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('pejabat_penandatangan', 'tanda_tangan_url', {
      type: Sequelize.STRING(500),
      allowNull: true,
    });
    await queryInterface.addColumn('pejabat_penandatangan', 'cap_dinas_url', {
      type: Sequelize.STRING(500),
      allowNull: true,
    });
    await queryInterface.addColumn('pejabat_penandatangan', 'persetujuan_pemilik', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('pejabat_penandatangan', 'tanda_tangan_url');
    await queryInterface.removeColumn('pejabat_penandatangan', 'cap_dinas_url');
    await queryInterface.removeColumn('pejabat_penandatangan', 'persetujuan_pemilik');
  },
};
