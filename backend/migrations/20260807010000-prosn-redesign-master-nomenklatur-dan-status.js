'use strict';

/**
 * Redesain ProSN Ketahanan Pangan — Fase 1: Master Indikator, Regulatory
 * Mapping ke nomenklatur SIPD (Kepmendagri 900.1-861/2026), dan perluasan
 * status/tipe_form aditif (tidak menghapus nilai lama, hanya menambah).
 *
 * Referensi: Kepmendagri 700.1.1.4-180/2026 (format & indikator ProSN Provinsi
 * Ketahanan Pangan B.1.1-B.1.4) dan Kepmendagri 900.1-861/2026 (nomenklatur
 * Urusan Pangan Provinsi hlm. 378-387, sudah ter-import di master_sub_kegiatan
 * dataset_key='kepmendagri_provinsi_900_2026' — dicek langsung ke DB, 9/9 kode
 * di seed mapping cocok persis termasuk teks indikator & satuan).
 *
 * `prosnp_indikator.tipe_form` DITAMBAH 4 nilai baru (penugasan_kdh dkk),
 * TIDAK menghapus 3 nilai lama (dukungan_program dkk) — non-breaking, sesuai
 * mandat "jangan merusak fitur lain". Reklasifikasi data existing dilakukan
 * di migration data terpisah (bukan di sini), supaya migration skema murni
 * additive dan gampang di-rollback tanpa kehilangan histori.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Master Indikator ProSN — katalog independen-periode (bobot, kriteria skor resmi)
    await queryInterface.createTable('prosnp_master_indikator', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      kode: { type: Sequelize.STRING(32), allowNull: false, unique: true },
      nama_indikator: { type: Sequelize.TEXT, allowNull: false },
      objek_kertas_kerja: { type: Sequelize.STRING(255), allowNull: true },
      tipe_form: {
        type: Sequelize.ENUM(
          'dukungan_program', 'target_capaian_rasio', 'distribusi_status',
          'penugasan_kdh', 'koordinasi_forkopimda', 'cadangan_pangan_beras', 'inovasi_dan_perkada',
        ),
        allowNull: false,
      },
      bobot_maksimal: { type: Sequelize.DECIMAL(4, 2), allowNull: false },
      kriteria_skor: {
        type: Sequelize.JSON, allowNull: false,
        comment: 'Rubrik skor resmi: array {skor, syarat} — dipakai untuk tampilan alasan skor, BUKAN sumber logika rule engine (logika tetap di kode utk determinisme & auditability).',
      },
      urutan: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      aktif: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    // 2. Master Komoditas — minimal, khusus dipakai validasi B.1.3 (hanya BERAS masuk capaian)
    await queryInterface.createTable('prosnp_komoditas', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      kode: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      nama: { type: Sequelize.STRING(150), allowNull: false },
      kategori: { type: Sequelize.STRING(100), allowNull: true },
      flag_beras: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      satuan_dasar: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'Ton' },
      aktif: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    // 3. Regulatory Mapping — FK ke master_sub_kegiatan (Kepmendagri 900.1-861/2026),
    // TIDAK menduplikasi master SIPD; kode/nama didenormalisasi murni utk tampilan cepat
    // (pola sama seperti dpa.kode_sub_kegiatan/dpa.sub_kegiatan yang sudah ada di repo).
    await queryInterface.createTable('prosnp_nomenklatur_mapping', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      master_indikator_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'prosnp_master_indikator', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      master_sub_kegiatan_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'master_sub_kegiatan', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
        comment: 'FK ke master resmi (dataset_key=kepmendagri_provinsi_900_2026) — sumber kebenaran, kolom kode/nama di bawah cuma salinan tampilan.',
      },
      kode_program: { type: Sequelize.STRING(50), allowNull: true },
      nama_program: { type: Sequelize.STRING(255), allowNull: true },
      kode_kegiatan: { type: Sequelize.STRING(50), allowNull: true },
      nama_kegiatan: { type: Sequelize.STRING(255), allowNull: true },
      kode_sub_kegiatan: { type: Sequelize.STRING(50), allowNull: false },
      nama_sub_kegiatan: { type: Sequelize.STRING(255), allowNull: false },
      indikator_sub_kegiatan: { type: Sequelize.TEXT, allowNull: true },
      satuan: { type: Sequelize.STRING(50), allowNull: true },
      status_relevansi: {
        type: Sequelize.ENUM('core', 'direct_conditional', 'supporting', 'context_only', 'excluded'),
        allowNull: false,
      },
      jenis_kontribusi: {
        type: Sequelize.ENUM(
          'policy_support', 'delivery', 'budget', 'output', 'outcome',
          'evidence', 'infrastructure', 'coordination', 'innovation',
        ),
        allowNull: false,
      },
      komoditas_wajib: { type: Sequelize.STRING(50), allowNull: true },
      berlaku_mulai: { type: Sequelize.DATEONLY, allowNull: true },
      berlaku_sampai: { type: Sequelize.DATEONLY, allowNull: true },
      dasar_pemetaan: { type: Sequelize.TEXT, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('prosnp_nomenklatur_mapping', ['master_indikator_id', 'status_relevansi'], { name: 'idx_prosnp_mapping_indikator_relevansi' });
    await queryInterface.addIndex('prosnp_nomenklatur_mapping', ['kode_sub_kegiatan'], { name: 'idx_prosnp_mapping_kode_sub_kegiatan' });

    // 4. Perluasan aditif prosnp_indikator: tautan ke master + bobot + kriteria + tipe_form baru
    await queryInterface.changeColumn('prosnp_indikator', 'tipe_form', {
      type: Sequelize.ENUM(
        'dukungan_program', 'target_capaian_rasio', 'distribusi_status',
        'penugasan_kdh', 'koordinasi_forkopimda', 'cadangan_pangan_beras', 'inovasi_dan_perkada',
      ),
      allowNull: false,
    });
    await queryInterface.addColumn('prosnp_indikator', 'master_indikator_id', {
      type: Sequelize.INTEGER, allowNull: true,
      references: { model: 'prosnp_master_indikator', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
    });
    await queryInterface.addColumn('prosnp_indikator', 'bobot_maksimal', { type: Sequelize.DECIMAL(4, 2), allowNull: true });

    // 5. Perluasan aditif prosnp_periode: status siap_diekspor + tanggal cutoff/tenggat internal
    await queryInterface.changeColumn('prosnp_periode', 'status', {
      type: Sequelize.ENUM('draft', 'aktif', 'terkunci', 'siap_diekspor', 'diarsipkan'),
      allowNull: false, defaultValue: 'draft',
    });
    await queryInterface.addColumn('prosnp_periode', 'tanggal_cutoff', { type: Sequelize.DATEONLY, allowNull: true });
    await queryInterface.addColumn('prosnp_periode', 'tenggat_internal', { type: Sequelize.DATEONLY, allowNull: true });
    await queryInterface.addColumn('prosnp_periode', 'tenggat_pelaporan', { type: Sequelize.DATEONLY, allowNull: true });

    // 6. Perluasan aditif prosnp_pengisian: skor indikatif internal (backend-authoritative) + status baru + legacy marker
    await queryInterface.changeColumn('prosnp_pengisian', 'status', {
      type: Sequelize.ENUM(
        'belum_diisi', 'dalam_pengisian', 'lengkap', 'perlu_perbaikan',
        'diperiksa', 'siap_diinput_prosn', 'diinput_manual', 'siap_diekspor', 'diarsipkan',
      ),
      allowNull: false, defaultValue: 'belum_diisi',
    });
    await queryInterface.addColumn('prosnp_pengisian', 'skor_indikatif_internal', { type: Sequelize.DECIMAL(4, 2), allowNull: true });
    await queryInterface.addColumn('prosnp_pengisian', 'skor_alasan', { type: Sequelize.TEXT, allowNull: true });
    await queryInterface.addColumn('prosnp_pengisian', 'skor_detail', {
      type: Sequelize.JSON, allowNull: true,
      comment: 'Rincian perhitungan rule engine (mis. interval surat per bulan, jumlah rapat sah per bulan, komponen neraca) — untuk dashboard & audit, dihasilkan ulang tiap kali rule engine jalan.',
    });
    await queryInterface.addColumn('prosnp_pengisian', 'skor_dihitung_at', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn('prosnp_pengisian', 'legacy_status', {
      type: Sequelize.ENUM('needs_review'), allowNull: true,
      comment: 'Ditandai needs_review bila data_form lama (struktur generik sebelum redesain) tidak sesuai tipe_form baru dan perlu diisi ulang via form spesifik — lihat legacy_data_form utk data lama yang diarsipkan (bukan dihapus).',
    });
    await queryInterface.addColumn('prosnp_pengisian', 'legacy_data_form', { type: Sequelize.JSON, allowNull: true });

    // 7. Perluasan aditif prosnp_bukti_dukung: kategori + status verifikasi konten (terpisah dari `status` versioning yg sudah ada)
    await queryInterface.addColumn('prosnp_bukti_dukung', 'kategori', {
      type: Sequelize.ENUM(
        'surat_penugasan', 'keputusan_kdh', 'undangan', 'daftar_hadir', 'notulen', 'dokumentasi',
        'berita_acara', 'kartu_stok', 'dokumen_pengadaan', 'dokumen_penyaluran', 'rekonsiliasi',
        'perkada', 'bukti_implementasi', 'bukti_hasil', 'dpa', 'renja', 'rkpd', 'lainnya',
      ),
      allowNull: true,
    });
    await queryInterface.addColumn('prosnp_bukti_dukung', 'status_verifikasi', {
      type: Sequelize.ENUM('uploaded', 'valid', 'invalid', 'needs_clarification', 'duplicate', 'expired'),
      allowNull: false, defaultValue: 'uploaded',
    });
    await queryInterface.addColumn('prosnp_bukti_dukung', 'nomor_dokumen', { type: Sequelize.STRING(150), allowNull: true });
    await queryInterface.addColumn('prosnp_bukti_dukung', 'tanggal_dokumen', { type: Sequelize.DATEONLY, allowNull: true });
    await queryInterface.addColumn('prosnp_bukti_dukung', 'sumber', { type: Sequelize.STRING(150), allowNull: true });
    await queryInterface.addColumn('prosnp_bukti_dukung', 'catatan_pemeriksa', { type: Sequelize.TEXT, allowNull: true });
    await queryInterface.addColumn('prosnp_bukti_dukung', 'diperiksa_oleh', {
      type: Sequelize.INTEGER, allowNull: true,
      references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
    });
    await queryInterface.addColumn('prosnp_bukti_dukung', 'diperiksa_at', { type: Sequelize.DATE, allowNull: true });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('prosnp_bukti_dukung', 'diperiksa_at');
    await queryInterface.removeColumn('prosnp_bukti_dukung', 'diperiksa_oleh');
    await queryInterface.removeColumn('prosnp_bukti_dukung', 'catatan_pemeriksa');
    await queryInterface.removeColumn('prosnp_bukti_dukung', 'sumber');
    await queryInterface.removeColumn('prosnp_bukti_dukung', 'tanggal_dokumen');
    await queryInterface.removeColumn('prosnp_bukti_dukung', 'nomor_dokumen');
    await queryInterface.removeColumn('prosnp_bukti_dukung', 'status_verifikasi');
    await queryInterface.removeColumn('prosnp_bukti_dukung', 'kategori');

    await queryInterface.removeColumn('prosnp_pengisian', 'legacy_data_form');
    await queryInterface.removeColumn('prosnp_pengisian', 'legacy_status');
    await queryInterface.removeColumn('prosnp_pengisian', 'skor_dihitung_at');
    await queryInterface.removeColumn('prosnp_pengisian', 'skor_detail');
    await queryInterface.removeColumn('prosnp_pengisian', 'skor_alasan');
    await queryInterface.removeColumn('prosnp_pengisian', 'skor_indikatif_internal');
    await queryInterface.changeColumn('prosnp_pengisian', 'status', {
      type: Sequelize.ENUM('belum_diisi', 'dalam_pengisian', 'lengkap', 'perlu_perbaikan', 'siap_diinput_prosn', 'diinput_manual', 'diarsipkan'),
      allowNull: false, defaultValue: 'belum_diisi',
    });

    await queryInterface.removeColumn('prosnp_periode', 'tenggat_pelaporan');
    await queryInterface.removeColumn('prosnp_periode', 'tenggat_internal');
    await queryInterface.removeColumn('prosnp_periode', 'tanggal_cutoff');
    await queryInterface.changeColumn('prosnp_periode', 'status', {
      type: Sequelize.ENUM('draft', 'aktif', 'terkunci', 'diarsipkan'), allowNull: false, defaultValue: 'draft',
    });

    await queryInterface.removeColumn('prosnp_indikator', 'bobot_maksimal');
    await queryInterface.removeColumn('prosnp_indikator', 'master_indikator_id');
    await queryInterface.changeColumn('prosnp_indikator', 'tipe_form', {
      type: Sequelize.ENUM('dukungan_program', 'target_capaian_rasio', 'distribusi_status'), allowNull: false,
    });

    await queryInterface.dropTable('prosnp_nomenklatur_mapping');
    await queryInterface.dropTable('prosnp_komoditas');
    await queryInterface.dropTable('prosnp_master_indikator');
  },
};
