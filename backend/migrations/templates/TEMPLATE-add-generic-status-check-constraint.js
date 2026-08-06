"use strict";

/**
 * TEMPLATE migration — Tahap 2 schema constraint, sesuai spec 32a §5.
 *
 * BUKAN migration final siap-jalan. Ini adalah template untuk modul BARU
 * berikutnya yang memakai pola generik 4-state (DRAFT/SUBMITTED/APPROVED/
 * REJECTED) dan kolom status-nya BELUM dideklarasikan sebagai Sequelize ENUM
 * saat CREATE TABLE (mis. jika awalnya dibuat sebagai STRING lalu diperbaiki).
 *
 * Kapan dipakai:
 *   - Modul baru (bukan retrofit tabel existing — lihat batas §5.3 spec 32a
 *     dan ADR-0005 §3 butir 6, non-retroaktif).
 *   - Kolom status modul tsb SUDAH lolos workflowComplianceValidationSelfTest.js
 *     (criterion 2, tanpa perlu whitelist) — constraint ini lapisan kedua
 *     yang menegakkan ulang di level data apa yang sudah benar di level kode.
 *
 * Kapan TIDAK dipakai:
 *   - Modul existing (dpa, rka, lakip, renja, rkpd, renstra) — approval_status
 *     mereka sudah ENUM sejak migration 20260407-001 / 20260409-003, dan
 *     retrofit constraint tambahan ke tabel existing di luar scope Tahap 2.
 *   - Modul dengan documented exception di workflowComplianceExceptions.json
 *     (mis. ProSN-P — lihat entri prosnpPeriodeModel.js dkk, status
 *     domainnya lifecycle pengisian bukan approval linear).
 *   - Modul di luar cakupan ADR-0002 yang belum didisposisikan (BMD, TLHP,
 *     MR, LK, Penatausahaan/BKU) — jangan diberi constraint generik tanpa
 *     ADR/blueprint terpisah yang eksplisit memasukkan modul tsb.
 *
 * Cara pakai: copy file ini ke migrations/<timestamp>-add-status-check-<nama_tabel>.js,
 * ganti TABLE_NAME dan STATUS_COLUMN, lalu jalankan `npx sequelize-cli db:migrate`.
 */

const TABLE_NAME = "__GANTI_NAMA_TABEL__";
const STATUS_COLUMN = "status"; // atau "approval_status" sesuai konvensi modul

module.exports = {
  async up(queryInterface, Sequelize) {
    // Jika kolom belum ENUM (masih STRING bebas), konversi dulu ke ENUM
    // generik. changeColumn ke ENUM di MySQL sekaligus menegakkan domain
    // nilai di level tipe kolom.
    await queryInterface.changeColumn(TABLE_NAME, STATUS_COLUMN, {
      type: Sequelize.ENUM("DRAFT", "SUBMITTED", "APPROVED", "REJECTED"),
      allowNull: false,
      defaultValue: "DRAFT",
    });

    // Lapis tambahan eksplisit (CHECK constraint) — redundant secara teknis
    // dengan ENUM MySQL 8+, tapi dicatat sesuai §5.2 spec 32a agar intent
    // eksplisit dan portable jika suatu saat kolom diubah jadi VARCHAR.
    await queryInterface.sequelize.query(`
      ALTER TABLE \`${TABLE_NAME}\`
      ADD CONSTRAINT \`chk_${TABLE_NAME}_${STATUS_COLUMN}\`
      CHECK (\`${STATUS_COLUMN}\` IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'));
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE \`${TABLE_NAME}\`
      DROP CONSTRAINT \`chk_${TABLE_NAME}_${STATUS_COLUMN}\`;
    `).catch(() => {
      // MySQL < 8.0.16 tidak mendukung CHECK constraint sama sekali (silently
      // ignored saat up, jadi drop juga boleh gagal diam-diam saat down).
    });
  },
};
