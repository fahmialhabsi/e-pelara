"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable(
      "renstra_tabel_subkegiatan"
    );
    const allTables = await queryInterface.showAllTables();

    const columns = {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      program_id: { type: Sequelize.INTEGER, allowNull: false },
      kegiatan_id: { type: Sequelize.INTEGER, allowNull: false },
      subkegiatan_id: { type: Sequelize.INTEGER, allowNull: false },
      indikator_manual: { type: Sequelize.STRING(255), allowNull: true },
      baseline: { type: Sequelize.FLOAT, allowNull: true },
      satuan_target: { type: Sequelize.STRING(255), allowNull: true },
      kode_subkegiatan: { type: Sequelize.STRING(255), allowNull: true },
      nama_subkegiatan: { type: Sequelize.STRING(255), allowNull: true },
      sub_bidang_penanggung_jawab: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      lokasi: { type: Sequelize.STRING(255), allowNull: true },
      target_akhir_renstra: { type: Sequelize.DECIMAL(10, 0), allowNull: true },
      pagu_akhir_renstra: { type: Sequelize.DECIMAL(20, 2), allowNull: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal(
          "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
        ),
      },
    };

    // target_tahun_1 s/d target_tahun_6
    for (let i = 1; i <= 6; i++) {
      columns[`target_tahun_${i}`] = { type: Sequelize.FLOAT, allowNull: true };
      columns[`pagu_tahun_${i}`] = {
        type: Sequelize.DECIMAL(20, 2),
        allowNull: true,
      };
    }

    // Kolom renstra_opd_id hanya tambahkan FK jika tabel RenstraOPD ada
    if (allTables.includes("RenstraOPD")) {
      columns.renstra_opd_id = {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "RenstraOPD", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      };
    } else {
      columns.renstra_opd_id = {
        type: Sequelize.INTEGER,
        allowNull: true,
      };
    }

    // Tambahkan kolom yang belum ada
    for (const [colName, definition] of Object.entries(columns)) {
      if (!tableDescription[colName]) {
        await queryInterface.addColumn(
          "renstra_tabel_subkegiatan",
          colName,
          definition
        );
      }
    }
  },

  async down(queryInterface, Sequelize) {
    const columns = [
      "id",
      "program_id",
      "kegiatan_id",
      "subkegiatan_id",
      "indikator_manual",
      "baseline",
      "satuan_target",
      "kode_subkegiatan",
      "nama_subkegiatan",
      "sub_bidang_penanggung_jawab",
      "lokasi",
      "target_akhir_renstra",
      "pagu_akhir_renstra",
      "renstra_opd_id",
      "created_at",
      "updated_at",
    ];
    for (let i = 1; i <= 6; i++) {
      columns.push(`target_tahun_${i}`);
      columns.push(`pagu_tahun_${i}`);
    }

    for (const col of columns) {
      try {
        await queryInterface.removeColumn("renstra_tabel_subkegiatan", col);
      } catch {}
    }
  },
};
