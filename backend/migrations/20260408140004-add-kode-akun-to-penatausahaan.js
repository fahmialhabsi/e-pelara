"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const qi = queryInterface;
    const desc = await qi.describeTable("penatausahaan").catch(() => null);
    if (!desc) {
      console.warn("[migration] ⏭️  tabel penatausahaan tidak ada, skip kolom kode_akun");
      return;
    }
    if (desc.kode_akun) {
      console.log("[migration] ⏭️  penatausahaan.kode_akun sudah ada");
      return;
    }
    await qi.addColumn("penatausahaan", "kode_akun", {
      type: Sequelize.STRING(30),
      allowNull: true,
      after: "dpa_id",
      comment: "Referensi ke kode_akun_bas.kode untuk posting jurnal",
    });
    await qi.addIndex("penatausahaan", ["kode_akun"], {
      name: "idx_penatausahaan_kode_akun",
    });
    console.log("[migration] ✅ penatausahaan.kode_akun ditambahkan");
  },

  async down(queryInterface) {
    const desc = await queryInterface.describeTable("penatausahaan").catch(() => null);
    if (!desc || !desc.kode_akun) return;
    await queryInterface.removeIndex("penatausahaan", "idx_penatausahaan_kode_akun").catch(() => {});
    await queryInterface.removeColumn("penatausahaan", "kode_akun");
  },
};
