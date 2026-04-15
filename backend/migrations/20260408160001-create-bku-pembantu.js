"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const existing = new Set(tables.map((t) => String(t).toLowerCase()));
    if (existing.has("bku_up")) {
      console.log("[migration] ⏭️  bku_up / bku_objek sudah ada");
      return;
    }

    await queryInterface.createTable("bku_up", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      tahun_anggaran: { type: Sequelize.INTEGER, allowNull: false },
      jenis: {
        type: Sequelize.ENUM("UP", "GU", "TUP"),
        allowNull: false,
      },
      tanggal: { type: Sequelize.DATEONLY, allowNull: false },
      nominal: { type: Sequelize.DECIMAL(18, 2), allowNull: false },
      sisa_up: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 },
      status: {
        type: Sequelize.ENUM(
          "AKTIF",
          "GU_PENDING",
          "LUNAS",
          "SETOR_KEMBALI",
        ),
        defaultValue: "AKTIF",
      },
      sigap_up_id: { type: Sequelize.INTEGER, allowNull: true },
      keterangan: { type: Sequelize.TEXT, allowNull: true },
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

    await queryInterface.createTable("bku_objek", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      bku_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "bku", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      kode_akun: { type: Sequelize.STRING(30), allowNull: false },
      nama_akun: { type: Sequelize.STRING(255), allowNull: true },
      jumlah: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 },
      keterangan: { type: Sequelize.TEXT, allowNull: true },
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

    await queryInterface.addIndex("bku_up", ["tahun_anggaran", "jenis"], {
      name: "idx_bku_up_tahun_jenis",
    });
    await queryInterface.addIndex("bku_objek", ["bku_id"], {
      name: "idx_bku_objek_bku",
    });
    await queryInterface.addIndex("bku_objek", ["kode_akun"], {
      name: "idx_bku_objek_kode",
    });
    console.log("[migration] ✅ bku_up + bku_objek dibuat");
  },

  async down(queryInterface) {
    await queryInterface.dropTable("bku_objek").catch(() => {});
    await queryInterface.dropTable("bku_up").catch(() => {});
  },
};
