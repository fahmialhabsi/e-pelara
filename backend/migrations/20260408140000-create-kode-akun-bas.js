"use strict";

/**
 * Tabel kode_akun_bas — Bagan Akun Standar untuk LK OPD (SAP).
 * Opsi 1A: terpisah dari kode_rekening (Permendagri 90) agar tidak bentrok skema & bisa isi normal_balance / digunakan_di.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const existing = new Set(tables.map((t) => String(t).toLowerCase()));
    if (existing.has("kode_akun_bas")) {
      console.log("[migration] ⏭️  kode_akun_bas sudah ada");
      return;
    }

    await queryInterface.createTable("kode_akun_bas", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      kode: {
        type: Sequelize.STRING(30),
        allowNull: false,
        unique: true,
        comment: "Kode akun SAP, contoh: 5.1.02.01.01.0001",
      },
      nama: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      level: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: "1=kelompok, 2=jenis, 3=obyek, 4=rincian, 5=sub-rincian",
      },
      kode_induk: {
        type: Sequelize.STRING(30),
        allowNull: true,
        comment: "Kode akun parent (null jika level 1)",
      },
      jenis: {
        type: Sequelize.ENUM(
          "PENDAPATAN",
          "BELANJA",
          "BEBAN",
          "ASET",
          "KEWAJIBAN",
          "EKUITAS",
          "PEMBIAYAAN",
        ),
        allowNull: false,
      },
      normal_balance: {
        type: Sequelize.ENUM("DEBIT", "KREDIT"),
        allowNull: false,
        comment:
          "Saldo normal: DEBIT untuk aset/beban/belanja; KREDIT untuk kewajiban/ekuitas/pendapatan (kecuali contra)",
      },
      digunakan_di: {
        type: Sequelize.ENUM("LRA", "LO", "NERACA", "SEMUA"),
        allowNull: false,
        defaultValue: "SEMUA",
      },
      kode_rekening_ref: {
        type: Sequelize.STRING(30),
        allowNull: true,
        comment: "Padanan kode_rekening.kode_rekening jika ada",
      },
      aktif: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      keterangan: {
        type: Sequelize.TEXT,
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

    await queryInterface.addIndex("kode_akun_bas", ["jenis"], {
      name: "idx_kode_akun_bas_jenis",
    });
    await queryInterface.addIndex("kode_akun_bas", ["level"], {
      name: "idx_kode_akun_bas_level",
    });
    await queryInterface.addIndex("kode_akun_bas", ["aktif"], {
      name: "idx_kode_akun_bas_aktif",
    });
    console.log("[migration] ✅ kode_akun_bas dibuat");
  },

  async down(queryInterface) {
    await queryInterface.dropTable("kode_akun_bas").catch(() => {});
  },
};
