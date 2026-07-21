"use strict";

/**
 * Modul TLHP — Rekomendasi di bawah satu Temuan.
 * Tidak punya history/approval sendiri — mengikuti status approval Temuan
 * induknya (lihat rencana implementasi §0 Judgment Call #4).
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("mr_planning_temuan_rekomendasi", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      mr_planning_temuan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "mr_planning_temuan",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },

      mr_planning_lhp_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      context_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      nomor_rekomendasi: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },

      kode_rekomendasi: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },

      uraian_rekomendasi: {
        type: Sequelize.TEXT,
        allowNull: false,
      },

      pihak_bertanggung_jawab: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },

      target_waktu_penyelesaian: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },

      nilai_rekomendasi_rupiah: {
        type: Sequelize.DECIMAL(20, 2),
        allowNull: true,
      },

      urutan: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      status_tindak_lanjut_ref_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      status_tindak_lanjut: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },

      persentase_penyelesaian: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },

      tindak_lanjut_terakhir_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      tanggal_tindak_lanjut_terakhir: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },

      status_revisi: {
        type: Sequelize.ENUM("draft", "verifikasi", "approved", "ditolak"),
        allowNull: false,
        defaultValue: "draft",
      },

      versi: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },

      is_locked: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      alasan_revisi: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      dibuat_oleh: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      dibuat_pada: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      last_revised_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      last_revised_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      updated_by: {
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

    await queryInterface.addIndex("mr_planning_temuan_rekomendasi", ["mr_planning_temuan_id"]);
    await queryInterface.addIndex("mr_planning_temuan_rekomendasi", ["mr_planning_lhp_id"]);
    await queryInterface.addIndex("mr_planning_temuan_rekomendasi", ["context_id"]);
    await queryInterface.addIndex("mr_planning_temuan_rekomendasi", ["status_tindak_lanjut_ref_id"]);
    await queryInterface.addIndex("mr_planning_temuan_rekomendasi", ["is_active"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("mr_planning_temuan_rekomendasi");
  },
};
