"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const existing = new Set(tables.map((t) => String(t).toLowerCase()));
    if (existing.has("jurnal_umum")) {
      console.log("[migration] ⏭️  jurnal_umum sudah ada");
      return;
    }

    await queryInterface.createTable("jurnal_umum", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      nomor_jurnal: {
        type: Sequelize.STRING(30),
        allowNull: false,
        unique: true,
        comment: "Format: JU-YYYY-NNNNNN",
      },
      tanggal: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      tahun_anggaran: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      keterangan: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      referensi: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: "Nomor SPJ, bukti, dll.",
      },
      nomor_sp2d: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment:
          "Untuk integrasi SIPD/SIMDA di masa depan (saat ini nullable)",
      },
      jenis_jurnal: {
        type: Sequelize.ENUM(
          "UMUM",
          "PENYESUAIAN",
          "PENUTUP",
          "KOREKSI",
        ),
        allowNull: false,
        defaultValue: "UMUM",
      },
      sumber: {
        type: Sequelize.ENUM(
          "MANUAL",
          "AUTO_BKU",
          "AUTO_SPJ",
          "AUTO_PENYUSUTAN",
        ),
        allowNull: false,
        defaultValue: "MANUAL",
      },
      status: {
        type: Sequelize.ENUM("DRAFT", "POSTED", "VOID"),
        allowNull: false,
        defaultValue: "DRAFT",
      },
      dibuat_oleh: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: "FK users.id",
      },
      disetujui_oleh: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      tanggal_disetujui: {
        type: Sequelize.DATE,
        allowNull: true,
      },
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

    await queryInterface.addIndex("jurnal_umum", ["tahun_anggaran", "tanggal"], {
      name: "idx_jurnal_umum_tahun_tgl",
    });
    await queryInterface.addIndex("jurnal_umum", ["status"], {
      name: "idx_jurnal_umum_status",
    });
    await queryInterface.addIndex("jurnal_umum", ["nomor_jurnal"], {
      name: "idx_jurnal_umum_nomor",
    });
    console.log("[migration] ✅ jurnal_umum dibuat");
  },

  async down(queryInterface) {
    await queryInterface.dropTable("jurnal_umum").catch(() => {});
  },
};
