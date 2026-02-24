"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Hapus kolom lama
    await Promise.all(
      [
        "kode_tujuan",
        "uraian",
        "satuan",
        "target_awal",
        "target_akhir",
        "tahun_awal",
        "tahun_akhir",
      ].map((col) => queryInterface.removeColumn("indikatortujuans", col))
    );

    // 2. Tambah kolom baru sesuai skema
    await queryInterface.addColumn("indikatortujuans", "kode_indikator", {
      type: Sequelize.STRING(100),
      allowNull: false,
    });
    await queryInterface.addColumn("indikatortujuans", "nama_indikator", {
      type: Sequelize.TEXT,
      allowNull: false,
    });
    await queryInterface.addColumn("indikatortujuans", "tipe_indikator", {
      type: Sequelize.ENUM("Impact"),
      allowNull: false,
    });
    await queryInterface.addColumn("indikatortujuans", "jenis_indikator", {
      type: Sequelize.ENUM("Kuantitatif", "Kualitatif"),
      allowNull: false,
    });
    await queryInterface.addColumn("indikatortujuans", "jenis", {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
    await queryInterface.addColumn("indikatortujuans", "tolok_ukur_kinerja", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn("indikatortujuans", "target_kinerja", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn("indikatortujuans", "kriteria_kuantitatif", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn("indikatortujuans", "kriteria_kualitatif", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn("indikatortujuans", "definisi_operasional", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn("indikatortujuans", "metode_penghitungan", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn("indikatortujuans", "baseline", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    for (let i = 1; i <= 5; i++) {
      await queryInterface.addColumn("indikatortujuans", `target_tahun_${i}`, {
        type: Sequelize.STRING(100),
        allowNull: true,
      });
    }
    await queryInterface.addColumn("indikatortujuans", "sumber_data", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn("indikatortujuans", "penanggung_jawab", {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await queryInterface.addColumn("indikatortujuans", "keterangan", {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    // 3. Ubah kolom timestamp ke default CURRENT_TIMESTAMP
    await queryInterface.changeColumn("indikatortujuans", "createdAt", {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    });
    await queryInterface.changeColumn("indikatortujuans", "updatedAt", {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    });
  },

  down: async (queryInterface, Sequelize) => {
    // 1. Hapus semua kolom baru
    const newCols = [
      "kode_indikator",
      "nama_indikator",
      "tipe_indikator",
      "jenis_indikator",
      "jenis",
      "tolok_ukur_kinerja",
      "target_kinerja",
      "kriteria_kuantitatif",
      "kriteria_kualitatif",
      "definisi_operasional",
      "metode_penghitungan",
      "baseline",
      "sumber_data",
      "penanggung_jawab",
      "keterangan",
      "target_tahun_1",
      "target_tahun_2",
      "target_tahun_3",
      "target_tahun_4",
      "target_tahun_5",
    ];
    const table = await queryInterface.describeTable("indikatortujuans");

    for (const col of newCols) {
      if (table[col]) {
        await queryInterface.removeColumn("indikatortujuans", col);
      }
    }

    // 2. Drop ENUM types agar bersih (Postgres)
    // await queryInterface.sequelize.query(
    //   `DROP TYPE IF EXISTS "enum_indikatortujuans_tipe_indikator";`
    // );
    // await queryInterface.sequelize.query(
    //   `DROP TYPE IF EXISTS "enum_indikatortujuans_jenis_indikator";`
    // );

    // 3. Kembalikan timestamp ke definisi tanpa default (optional)
    await queryInterface.changeColumn("indikatortujuans", "createdAt", {
      type: Sequelize.DATE,
      allowNull: false,
    });
    await queryInterface.changeColumn("indikatortujuans", "updatedAt", {
      type: Sequelize.DATE,
      allowNull: false,
    });
  },
};
