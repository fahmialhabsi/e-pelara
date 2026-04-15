"use strict";

/**
 * Minimum viable seed untuk kesiapan uji validasi planning.
 * Menyediakan minimal 1 periode RPJMD aktif:
 * - tabel canonical `periode_rpjmds`
 * - tabel compatibility mirror `rpjmd_periode` (jika tersedia)
 */

async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables();
  const normalized = new Set(tables.map((t) => String(t).toLowerCase()));
  return normalized.has(String(tableName).toLowerCase());
}

module.exports = {
  async up(queryInterface) {
    const tahunAwal = 2025;
    const tahunAkhir = 2029;
    const namaPeriode = `RPJMD ${tahunAwal}-${tahunAkhir}`;

    if (await tableExists(queryInterface, "periode_rpjmds")) {
      const [rows] = await queryInterface.sequelize.query(
        "SELECT id FROM periode_rpjmds WHERE tahun_awal = :tahunAwal AND tahun_akhir = :tahunAkhir LIMIT 1",
        { replacements: { tahunAwal, tahunAkhir } },
      );
      if (!rows.length) {
        await queryInterface.bulkInsert("periode_rpjmds", [
          {
            nama: namaPeriode,
            tahun_awal: tahunAwal,
            tahun_akhir: tahunAkhir,
          },
        ]);
      }
    }

    if (await tableExists(queryInterface, "rpjmd_periode")) {
      const [rows] = await queryInterface.sequelize.query(
        "SELECT id FROM rpjmd_periode WHERE tahun_awal = :tahunAwal AND tahun_akhir = :tahunAkhir LIMIT 1",
        { replacements: { tahunAwal, tahunAkhir } },
      );
      if (!rows.length) {
        await queryInterface.bulkInsert("rpjmd_periode", [
          {
            nama: namaPeriode,
            tahun_awal: tahunAwal,
            tahun_akhir: tahunAkhir,
            dokumen_url: null,
            status: "draft",
            created_at: new Date(),
            updated_at: new Date(),
          },
        ]);
      }
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete(
      "periode_rpjmds",
      { tahun_awal: 2025, tahun_akhir: 2029 },
      {},
    ).catch(() => {});

    await queryInterface.bulkDelete(
      "rpjmd_periode",
      { tahun_awal: 2025, tahun_akhir: 2029 },
      {},
    ).catch(() => {});
  },
};
