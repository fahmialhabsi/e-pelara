'use strict';

/**
 * Corrective "B.1.3 DPA/DPPA Authoritative Target Source" — target Cadangan
 * Pangan Beras (B.1.3) kini juga bisa authoritative-sourced dari DPA/DPPA
 * terstruktur (lihat prosnpDpaSourceService.resolveOperationalTargetB13),
 * bukan hanya Keputusan Gubernur. `nomor_keputusan`/`tanggal_keputusan`
 * dilonggarkan NOT NULL -> NULLABLE agar target DPA/DPPA (tanpa Keputusan)
 * dapat tersimpan. Backend TETAP mewajibkan keduanya utk target yang bukan
 * bersumber DPA/DPPA operasional (lihat validateTargetSourceConsistency di
 * prosnpCadanganPanganService.js) — ini murni pelonggaran constraint skema,
 * bukan perubahan aturan bisnis Keputusan Gubernur existing. Tidak ada
 * kolom baru, tidak ada rewrite data existing.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('prosnp_cadangan_target', 'nomor_keputusan', {
      type: Sequelize.STRING(150), allowNull: true,
    });
    await queryInterface.changeColumn('prosnp_cadangan_target', 'tanggal_keputusan', {
      type: Sequelize.DATEONLY, allowNull: true,
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('prosnp_cadangan_target', 'nomor_keputusan', {
      type: Sequelize.STRING(150), allowNull: false,
    });
    await queryInterface.changeColumn('prosnp_cadangan_target', 'tanggal_keputusan', {
      type: Sequelize.DATEONLY, allowNull: false,
    });
  },
};
