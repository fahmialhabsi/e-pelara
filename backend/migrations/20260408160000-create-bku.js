"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const existing = new Set(tables.map((t) => String(t).toLowerCase()));
    if (existing.has("bku")) {
      console.log("[migration] ⏭️  bku sudah ada");
      return;
    }

    await queryInterface.createTable("bku", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      tahun_anggaran: { type: Sequelize.INTEGER, allowNull: false },
      bulan: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: "1-12",
      },
      tanggal: { type: Sequelize.DATEONLY, allowNull: false },
      nomor_bukti: { type: Sequelize.STRING(60), allowNull: true },
      nomor_spm: { type: Sequelize.STRING(50), allowNull: true },
      nomor_sp2d: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: "Untuk integrasi SIPD/SIMDA di masa depan (saat ini nullable)",
      },
      uraian: { type: Sequelize.TEXT, allowNull: false },
      jenis_transaksi: {
        type: Sequelize.ENUM(
          "UP",
          "GU",
          "TUP",
          "LS_GAJI",
          "LS_BARANG",
          "PENERIMAAN_LAIN",
          "PENGELUARAN_LAIN",
          "SETORAN_SISA_UP",
        ),
        allowNull: false,
      },
      penerimaan: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 },
      pengeluaran: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 },
      saldo: {
        type: Sequelize.DECIMAL(18, 2),
        defaultValue: 0,
        comment: "Running balance setelah baris ini",
      },
      kode_akun: {
        type: Sequelize.STRING(30),
        allowNull: true,
        comment: "Ref kode_akun_bas — wajib untuk pengeluaran belanja",
      },
      dpa_id: { type: Sequelize.INTEGER, allowNull: true },
      jurnal_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "jurnal_umum", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      sigap_spj_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: "ID SPJ di SIGAP — idempotency sync",
      },
      sigap_bku_id: { type: Sequelize.INTEGER, allowNull: true },
      bendahara_id: { type: Sequelize.INTEGER, allowNull: true },
      status_validasi: {
        type: Sequelize.ENUM("BELUM", "VALID", "DITOLAK"),
        defaultValue: "BELUM",
      },
      catatan_validasi: { type: Sequelize.TEXT, allowNull: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    await queryInterface.addIndex("bku", ["tahun_anggaran", "bulan"], {
      name: "idx_bku_tahun_bulan",
    });
    await queryInterface.addIndex("bku", ["tanggal"], { name: "idx_bku_tanggal" });
    await queryInterface.addIndex("bku", ["kode_akun"], { name: "idx_bku_kode_akun" });
    await queryInterface.addIndex("bku", ["sigap_spj_id"], { name: "idx_bku_sigap_spj" });
    console.log("[migration] ✅ bku dibuat");
  },

  async down(queryInterface) {
    await queryInterface.dropTable("bku").catch(() => {});
  },
};
