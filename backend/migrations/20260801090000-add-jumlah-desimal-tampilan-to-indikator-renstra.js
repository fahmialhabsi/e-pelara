'use strict';

/**
 * Kolom target_tahun_N & baseline di indikator_renstra sama-sama DECIMAL(15,2)
 * untuk SEMUA indikator, jadi angkanya selalu tersimpan 2 desimal walau
 * konvensi tampil resminya berbeda per indikator (mis. "Konsumsi Energi per
 * Kapita" 3 desimal, "Konsumsi Protein per Kapita" 1 desimal — catatan
 * evaluasi Bappeda). Nilai 1,89 dan 1,890 sama secara matematis, jadi ini
 * murni soal FORMAT TAMPILAN, bukan presisi data — makanya solusinya kolom
 * metadata baru, bukan mengubah skala kolom DECIMAL yang sudah ada (yang
 * berlaku seragam ke semua baris, tidak bisa berbeda per indikator).
 *
 * NULL berarti pakai default (2 desimal, perilaku sebelum kolom ini ada).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('indikator_renstra', 'jumlah_desimal_tampilan', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('indikator_renstra', 'jumlah_desimal_tampilan');
  },
};
