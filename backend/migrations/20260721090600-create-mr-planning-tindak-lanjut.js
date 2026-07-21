"use strict";

/**
 * Modul TLHP — Tindak Lanjut: realisasi pemantauan periodik atas satu
 * Rekomendasi. Satu Rekomendasi bisa punya banyak entri Tindak Lanjut seiring
 * waktu (is_latest menandai entri terkini).
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("mr_planning_tindak_lanjut", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      mr_planning_temuan_rekomendasi_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "mr_planning_temuan_rekomendasi",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },

      mr_planning_temuan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      mr_planning_lhp_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      context_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      periode_pemantauan_type: {
        type: Sequelize.ENUM("bulanan", "triwulan", "semester", "tahunan", "adhoc"),
        allowNull: false,
        defaultValue: "adhoc",
      },

      periode_pemantauan_label: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },

      tanggal_pemantauan: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },

      status_tindak_lanjut_ref_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      status_tindak_lanjut: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },

      uraian_tindak_lanjut: {
        type: Sequelize.TEXT,
        allowNull: false,
      },

      persentase_penyelesaian: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },

      nilai_setoran_rupiah: {
        type: Sequelize.DECIMAL(20, 2),
        allowNull: true,
      },

      nomor_bukti_setoran: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },

      tanggal_setoran: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },

      kendala: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      alasan_tidak_dapat_ditindaklanjuti: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      rencana_tindak_lanjut_berikutnya: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      target_waktu_berikutnya: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },

      pic_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      pic_nama: {
        type: Sequelize.STRING(255),
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

      alasan_revisi: {
        type: Sequelize.TEXT,
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

      dibuat_oleh: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      diverifikasi_oleh: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      disetujui_oleh: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      ditolak_oleh: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      dibuat_pada: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      diverifikasi_pada: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      disetujui_pada: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      ditolak_pada: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      is_latest: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    await queryInterface.addIndex("mr_planning_tindak_lanjut", ["mr_planning_temuan_rekomendasi_id"]);
    await queryInterface.addIndex("mr_planning_tindak_lanjut", ["mr_planning_temuan_id"]);
    await queryInterface.addIndex("mr_planning_tindak_lanjut", ["mr_planning_lhp_id"]);
    await queryInterface.addIndex("mr_planning_tindak_lanjut", ["context_id"]);
    await queryInterface.addIndex("mr_planning_tindak_lanjut", ["status_tindak_lanjut_ref_id"]);
    await queryInterface.addIndex("mr_planning_tindak_lanjut", ["status_revisi"]);
    await queryInterface.addIndex("mr_planning_tindak_lanjut", ["is_active"]);
    await queryInterface.addIndex("mr_planning_tindak_lanjut", ["is_latest"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("mr_planning_tindak_lanjut");
  },
};
