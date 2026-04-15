"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const existing = new Set(tables.map((t) => String(t).toLowerCase()));
    if (existing.has("jurnal_detail")) {
      console.log("[migration] ⏭️  jurnal_detail sudah ada");
      return;
    }

    await queryInterface.createTable("jurnal_detail", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      jurnal_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "jurnal_umum",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      kode_akun: {
        type: Sequelize.STRING(30),
        allowNull: false,
        comment: "Referensi ke kode_akun_bas.kode",
      },
      nama_akun: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: "Snapshot nama saat jurnal dibuat",
      },
      uraian: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      debit: {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
      },
      kredit: {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
      },
      urutan: {
        type: Sequelize.INTEGER,
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

    await queryInterface.addIndex("jurnal_detail", ["jurnal_id"], {
      name: "idx_jurnal_detail_jurnal_id",
    });
    await queryInterface.addIndex("jurnal_detail", ["kode_akun"], {
      name: "idx_jurnal_detail_kode_akun",
    });
    console.log("[migration] ✅ jurnal_detail dibuat");
  },

  async down(queryInterface) {
    await queryInterface.dropTable("jurnal_detail").catch(() => {});
  },
};
