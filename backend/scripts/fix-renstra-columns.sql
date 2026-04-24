-- =====================================================================
-- Script Perbaikan: Tambah kolom yang hilang untuk modul Renstra
-- Jalankan: mysql -u root -p db_epelara < fix-renstra-columns.sql
-- Atau jalankan via: npx sequelize-cli db:migrate
-- =====================================================================

-- 1. Tambah kolom nama_opd dan is_aktif ke tabel renstra_opd
-- (jika belum ada)
ALTER TABLE `renstra_opd`
  ADD COLUMN IF NOT EXISTS `nama_opd` VARCHAR(255) NULL AFTER `sub_bidang_opd`,
  ADD COLUMN IF NOT EXISTS `is_aktif` TINYINT(1) NOT NULL DEFAULT 0 AFTER `nama_opd`;

-- 2. Tambah kolom capaian & satuan/pagu ke tabel renstra_target
-- (jika tabel renstra_target sudah ada)
-- Cek dulu apakah tabel ada sebelum ALTER
SET @tableExists = (
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_schema = DATABASE() AND table_name = 'renstra_target'
);

-- Kolom capaian_program
ALTER TABLE `renstra_target`
  ADD COLUMN IF NOT EXISTS `capaian_program` DECIMAL(18,2) NULL,
  ADD COLUMN IF NOT EXISTS `capaian_kegiatan` DECIMAL(18,2) NULL,
  ADD COLUMN IF NOT EXISTS `capaian_subkegiatan` DECIMAL(18,2) NULL,
  ADD COLUMN IF NOT EXISTS `satuan_program` VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS `pagu_program` BIGINT NULL,
  ADD COLUMN IF NOT EXISTS `satuan_kegiatan` VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS `pagu_kegiatan` BIGINT NULL,
  ADD COLUMN IF NOT EXISTS `satuan_subkegiatan` VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS `pagu_subkegiatan` BIGINT NULL;

-- 3. Buat tabel renstra jika belum ada
CREATE TABLE IF NOT EXISTS `renstra` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `periode_awal` INT NOT NULL,
  `periode_akhir` INT NOT NULL,
  `judul` VARCHAR(255) NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'draft',
  `approval_status` ENUM('DRAFT','SUBMITTED','APPROVED','REJECTED') NOT NULL DEFAULT 'DRAFT',
  `epelara_renstra_id` VARCHAR(100) NULL,
  `sinkronisasi_terakhir` DATETIME NULL,
  `sinkronisasi_status` VARCHAR(32) NOT NULL DEFAULT 'belum_sinkron',
  `dokumen_url` VARCHAR(500) NULL,
  `dibuat_oleh` INT NULL,
  `disetujui_oleh` INT NULL,
  `disetujui_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_renstra_periode` (`periode_awal`, `periode_akhir`),
  INDEX `idx_renstra_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 4. Daftarkan migrations ke SequelizeMeta agar tidak dijalankan ulang
INSERT IGNORE INTO `SequelizeMeta` (`name`) VALUES
  ('20260409-001-add-nama-opd-is-aktif-to-renstra-opd.js'),
  ('20260409-002-add-capaian-columns-to-renstra-target.js'),
  ('20260409-003-create-renstra-table.js');

-- Selesai
SELECT 'Perbaikan selesai!' AS status;
