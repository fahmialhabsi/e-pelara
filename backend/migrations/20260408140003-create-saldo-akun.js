"use strict";

/**
 * Saldo per akun per periode.
 * bulan: 0 = rekap tahunan; 1–12 = per bulan (menghindari UNIQUE+NULL di MySQL).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const existing = new Set(tables.map((t) => String(t).toLowerCase()));
    if (existing.has("saldo_akun")) {
      console.log("[migration] ⏭️  saldo_akun sudah ada");
      return;
    }

    await queryInterface.createTable("saldo_akun", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      kode_akun: {
        type: Sequelize.STRING(30),
        allowNull: false,
      },
      nama_akun: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      tahun_anggaran: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      bulan: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "0 = saldo tahunan; 1–12 = bulan",
      },
      saldo_awal: {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
      },
      total_debit: {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
      },
      total_kredit: {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
      },
      saldo_akhir: {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
        comment:
          "Per DEBIT-normal: saldo_awal + total_debit - total_kredit; KREDIT-normal: saldo_awal - total_debit + total_kredit",
      },
      terakhir_diperbarui: {
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

    await queryInterface.addConstraint("saldo_akun", {
      fields: ["kode_akun", "tahun_anggaran", "bulan"],
      type: "unique",
      name: "unique_saldo_per_akun_periode",
    });
    await queryInterface.addIndex("saldo_akun", ["tahun_anggaran", "bulan"], {
      name: "idx_saldo_akun_tahun_bulan",
    });
    await queryInterface.addIndex("saldo_akun", ["kode_akun"], {
      name: "idx_saldo_akun_kode",
    });
    console.log("[migration] ✅ saldo_akun dibuat");
  },

  async down(queryInterface) {
    await queryInterface.dropTable("saldo_akun").catch(() => {});
  },
};
