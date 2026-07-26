"use strict";

/**
 * Area Dampak (Pedoman No 2 Form Coaching Clinic Inspektorat — 5 area: Beban
 * Keuangan Negara, Penurunan Reputasi, Kesehatan & Keselamatan Kerja,
 * Realisasi Capaian Kinerja, Temuan BPK/Inspektorat) sebelumnya cuma tabel
 * statis di laporan (Lampiran 7.1B), TIDAK PERNAH terhubung ke penilaian
 * Dampak yang sesungguhnya dipilih user di wizard MR — jadi Dampak yang
 * tercatat tidak bisa ditelusuri dasarnya ke kriteria resmi. Kolom ini
 * menyimpan area dampak dominan yang jadi dasar penilaian Dampak per
 * Analisis Risiko, supaya penilaiannya defensible/traceable ke Pedoman No 2.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("mr_planning_risk_analysis", "dampak_area_ref_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "residual_impact_ref_id",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("mr_planning_risk_analysis", "dampak_area_ref_id");
  },
};
