'use strict';

/**
 * ProSN Indicator Foundation (spek 34) §3.1-3.2 — kolom baru prosnp_master_indikator
 * (kelompok_tematik, default_responsible_opd_id, evidence_requirement_provenance),
 * ekstensi ENUM tipe_form (master_indikator DAN indikator) utk 4 tipe baru MBG,
 * kolom ownership baru prosnp_indikator (responsible_opd_id/data_owner_opd_id/
 * evidence_coordinator_user_id), tabel kontributor many-to-many.
 *
 * Backfill (koreksi #6 spek): 4 baris master_indikator Ketahanan Pangan existing
 * diset evidence_requirement_provenance='internal_control' (default kolom sudah
 * 'internal_control' jadi backfill implisit, tapi tetap dieksplisitkan di sini
 * sesuai instruksi spek — jangan andalkan default diam-diam).
 *
 * Backfill responsible_opd_id 4 indikator existing (periode id 1 & 2) = Dinas
 * Pangan (perangkat_daerah_id periode masing2), EKSPLISIT bukan implisit,
 * sesuai prinsip §1.4 spek (ownership harus dinyatakan, bukan diasumsikan).
 */
const TIPE_FORM_LENGKAP = [
  'dukungan_program', 'target_capaian_rasio', 'distribusi_status',
  'penugasan_kdh', 'koordinasi_forkopimda', 'cadangan_pangan_beras', 'inovasi_dan_perkada',
  'status_bertingkat_evidence', 'checklist_proporsional_evidence',
  'pelaporan_berkala_evidence', 'capaian_persentase_bertingkat',
];
const TIPE_FORM_LAMA = [
  'dukungan_program', 'target_capaian_rasio', 'distribusi_status',
  'penugasan_kdh', 'koordinasi_forkopimda', 'cadangan_pangan_beras', 'inovasi_dan_perkada',
];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('prosnp_master_indikator', 'kelompok_tematik', {
      type: Sequelize.ENUM('ketahanan_pangan', 'mbg'), allowNull: false, defaultValue: 'ketahanan_pangan',
    });
    await queryInterface.addColumn('prosnp_master_indikator', 'default_responsible_opd_id', {
      type: Sequelize.INTEGER, allowNull: true,
      references: { model: 'perangkat_daerah', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
      comment: 'Saran/default nullable saja — TIDAK diisi otomatis Dinas Pangan utk indikator non-Ketahanan-Pangan (spek 34 D4).',
    });
    await queryInterface.addColumn('prosnp_master_indikator', 'evidence_requirement_provenance', {
      type: Sequelize.ENUM('regulatory_requirement', 'internal_control'), allowNull: false, defaultValue: 'internal_control',
      comment: 'Koreksi wajib #6 (CEA): kategori bukti yg diwajibkan adalah derivasi konservatif ePeLARA, BUKAN nama dokumen literal Kepmendagri, kecuali diset regulatory_requirement secara eksplisit.',
    });
    await queryInterface.changeColumn('prosnp_master_indikator', 'tipe_form', {
      type: Sequelize.ENUM(...TIPE_FORM_LENGKAP), allowNull: false,
    });
    await queryInterface.changeColumn('prosnp_indikator', 'tipe_form', {
      type: Sequelize.ENUM(...TIPE_FORM_LENGKAP), allowNull: false,
    });

    await queryInterface.addColumn('prosnp_indikator', 'responsible_opd_id', {
      type: Sequelize.INTEGER, allowNull: true,
      references: { model: 'perangkat_daerah', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
      comment: 'OPD penanggung jawab substantif indikator ini pada periode ini — TIDAK boleh default Dinas Pangan utk indikator non-Ketahanan-Pangan.',
    });
    await queryInterface.addColumn('prosnp_indikator', 'data_owner_opd_id', {
      type: Sequelize.INTEGER, allowNull: true,
      references: { model: 'perangkat_daerah', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
      comment: 'OPD pemilik sumber data asli (mis. Dinas Kesehatan utk data ibu hamil/balita MBG 2.4/2.5).',
    });
    await queryInterface.addColumn('prosnp_indikator', 'evidence_coordinator_user_id', {
      type: Sequelize.INTEGER, allowNull: true,
      references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
      comment: 'Individu yang mengoordinasi pengumpulan bukti utk indikator ini pada periode ini.',
    });

    await queryInterface.createTable('prosnp_indikator_kontributor', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      tenant_id: {
        type: Sequelize.INTEGER.UNSIGNED, allowNull: false,
        references: { model: 'tenants', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      indikator_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'prosnp_indikator', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      opd_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'perangkat_daerah', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      peran: { type: Sequelize.ENUM('kontributor_data', 'kontributor_bukti', 'koordinator_teknis'), allowNull: false },
      catatan: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('prosnp_indikator_kontributor', ['indikator_id', 'opd_id', 'peran'], { unique: true, name: 'uq_indikator_opd_peran' });

    // Backfill eksplisit (bukan default diam-diam) — sesuai prinsip §1.4 spek 34.
    await queryInterface.sequelize.query(
      `UPDATE prosnp_master_indikator SET evidence_requirement_provenance = 'internal_control'`,
    );
    await queryInterface.sequelize.query(`
      UPDATE prosnp_indikator i
      JOIN prosnp_periode p ON p.id = i.periode_id
      SET i.responsible_opd_id = p.perangkat_daerah_id
      WHERE i.responsible_opd_id IS NULL
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('prosnp_indikator_kontributor');
    await queryInterface.removeColumn('prosnp_indikator', 'evidence_coordinator_user_id');
    await queryInterface.removeColumn('prosnp_indikator', 'data_owner_opd_id');
    await queryInterface.removeColumn('prosnp_indikator', 'responsible_opd_id');
    await queryInterface.changeColumn('prosnp_indikator', 'tipe_form', { type: Sequelize.ENUM(...TIPE_FORM_LAMA), allowNull: false });
    await queryInterface.changeColumn('prosnp_master_indikator', 'tipe_form', { type: Sequelize.ENUM(...TIPE_FORM_LAMA), allowNull: false });
    await queryInterface.removeColumn('prosnp_master_indikator', 'evidence_requirement_provenance');
    await queryInterface.removeColumn('prosnp_master_indikator', 'default_responsible_opd_id');
    await queryInterface.removeColumn('prosnp_master_indikator', 'kelompok_tematik');
  },
};
