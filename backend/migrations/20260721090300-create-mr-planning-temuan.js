"use strict";

/**
 * Modul TLHP — Temuan (audit finding) di bawah satu LHP.
 * Approval workflow (draft/verifikasi/approved/ditolak) berbasis history,
 * lihat mr_planning_temuan_history.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("mr_planning_temuan", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      mr_planning_lhp_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "mr_planning_lhp",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },

      context_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      opd_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      nama_opd: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },

      entitas_pemeriksa_ref_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      entitas_pemeriksa: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },

      nomor_temuan: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },

      kode_temuan: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },

      judul_temuan: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },

      uraian_temuan: {
        type: Sequelize.TEXT,
        allowNull: false,
      },

      kondisi: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      kriteria: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      sebab: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      akibat: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      nilai_temuan_rupiah: {
        type: Sequelize.DECIMAL(20, 2),
        allowNull: true,
      },

      kategori_temuan_ref_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      kategori_temuan: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },

      unsur_spip_ref_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      unsur_spip: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },

      jumlah_rekomendasi: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      jumlah_rekomendasi_selesai: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      status_rollup: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },

      risk_escalation_status: {
        type: Sequelize.ENUM("none", "risk_created"),
        allowNull: false,
        defaultValue: "none",
      },

      mr_planning_risk_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      cross_system_link_id: {
        type: Sequelize.INTEGER,
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

    await queryInterface.addIndex("mr_planning_temuan", ["mr_planning_lhp_id"]);
    await queryInterface.addIndex("mr_planning_temuan", ["context_id"]);
    await queryInterface.addIndex("mr_planning_temuan", ["opd_id"]);
    await queryInterface.addIndex("mr_planning_temuan", ["kategori_temuan_ref_id"]);
    await queryInterface.addIndex("mr_planning_temuan", ["mr_planning_risk_id"]);
    await queryInterface.addIndex("mr_planning_temuan", ["status_revisi"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("mr_planning_temuan");
  },
};
