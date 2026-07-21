"use strict";

/**
 * Modul TLHP — Laporan Hasil Pemeriksaan (LHP)
 *
 * Entitas kepala/header dari hierarki SIPTL: LHP -> Temuan -> Rekomendasi -> Tindak Lanjut.
 * Satu LHP mewakili satu dokumen hasil pemeriksaan/pengawasan dari BPK/BPKP/Inspektorat.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("mr_planning_lhp", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      context_id: {
        type: Sequelize.INTEGER,
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

      jenis_pemeriksaan_ref_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      jenis_pemeriksaan: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },

      nomor_lhp: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },

      judul_lhp: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },

      tanggal_lhp: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },

      tahun_lhp: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      tahun: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      ringkasan_lhp: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      periode_pemeriksaan_awal: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },

      periode_pemeriksaan_akhir: {
        type: Sequelize.DATEONLY,
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

      surat_tugas_nomor: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },

      surat_tugas_tanggal: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },

      tanggal_terima_lhp: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },

      batas_waktu_tindak_lanjut: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },

      jumlah_temuan: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      jumlah_rekomendasi: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      // =====================================================
      // METADATA DOKUMEN (LHP = 1 berkas per record)
      // =====================================================
      file_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },

      original_file_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },

      file_path: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },

      file_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },

      mime_type: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },

      file_size: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      storage_provider: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: "local",
      },

      checksum: {
        type: Sequelize.STRING(128),
        allowNull: true,
      },

      status_dokumen: {
        type: Sequelize.ENUM("draft", "aktif", "diarsipkan"),
        allowNull: false,
        defaultValue: "draft",
      },

      is_locked: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      locked_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      locked_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

      alasan_revisi: {
        type: Sequelize.TEXT,
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

    await queryInterface.addIndex("mr_planning_lhp", ["context_id"]);
    await queryInterface.addIndex("mr_planning_lhp", ["entitas_pemeriksa_ref_id"]);
    await queryInterface.addIndex("mr_planning_lhp", ["jenis_pemeriksaan_ref_id"]);
    await queryInterface.addIndex("mr_planning_lhp", ["opd_id"]);
    await queryInterface.addIndex("mr_planning_lhp", ["tahun"]);
    await queryInterface.addIndex("mr_planning_lhp", ["status_dokumen"]);
    await queryInterface.addIndex("mr_planning_lhp", ["is_active"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("mr_planning_lhp");
  },
};
