/* =============================================================
   RELEASE 1 MIGRATION — ePeLARA RPJMD IMPORT
   MySQL 8.0+  |  Incremental, non-destructive
   Safety: no DROP COLUMN, no forced tahun->periode_id
   ============================================================= */

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- ---------------------------------------------------------------
-- 1. ADD indikator_kinerja + import_raw_id TO ALL 7 TABLES
-- ---------------------------------------------------------------

ALTER TABLE `indikatortujuans`
  ADD COLUMN IF NOT EXISTS `indikator_kinerja` TEXT COLLATE utf8mb4_unicode_ci NULL AFTER `jenis`,
  ADD COLUMN IF NOT EXISTS `import_raw_id`     BIGINT UNSIGNED NULL AFTER `indikator_kinerja`;

ALTER TABLE `indikatorsasarans`
  ADD COLUMN IF NOT EXISTS `indikator_kinerja` TEXT COLLATE utf8mb4_unicode_ci NULL AFTER `jenis`,
  ADD COLUMN IF NOT EXISTS `import_raw_id`     BIGINT UNSIGNED NULL AFTER `indikator_kinerja`;

ALTER TABLE `indikatorstrategis`
  ADD COLUMN IF NOT EXISTS `indikator_kinerja` TEXT COLLATE utf8mb4_unicode_ci NULL AFTER `jenis`,
  ADD COLUMN IF NOT EXISTS `import_raw_id`     BIGINT UNSIGNED NULL AFTER `indikator_kinerja`;

ALTER TABLE `indikatorarahkebijakans`
  ADD COLUMN IF NOT EXISTS `indikator_kinerja` TEXT COLLATE utf8mb4_unicode_ci NULL AFTER `jenis`,
  ADD COLUMN IF NOT EXISTS `import_raw_id`     BIGINT UNSIGNED NULL AFTER `indikator_kinerja`;

ALTER TABLE `indikatorprograms`
  ADD COLUMN IF NOT EXISTS `indikator_kinerja` TEXT COLLATE utf8mb4_unicode_ci NULL AFTER `jenis`,
  ADD COLUMN IF NOT EXISTS `import_raw_id`     BIGINT UNSIGNED NULL AFTER `indikator_kinerja`;

ALTER TABLE `indikatorkegiatans`
  ADD COLUMN IF NOT EXISTS `indikator_kinerja` TEXT COLLATE utf8mb4_unicode_ci NULL AFTER `jenis`,
  ADD COLUMN IF NOT EXISTS `import_raw_id`     BIGINT UNSIGNED NULL AFTER `indikator_kinerja`;

ALTER TABLE `indikatorsubkegiatans`
  ADD COLUMN IF NOT EXISTS `indikator_kinerja` TEXT COLLATE utf8mb4_unicode_ci NULL AFTER `jenis`,
  ADD COLUMN IF NOT EXISTS `import_raw_id`     BIGINT UNSIGNED NULL AFTER `indikator_kinerja`;

-- ---------------------------------------------------------------
-- 2. CREATE rpjmd_import_raw  (relation-free ingestion table)
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `rpjmd_import_raw` (
  `id`                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `batch_id`              VARCHAR(100) NOT NULL,
  `entity_type`           VARCHAR(50)  NOT NULL COMMENT 'tujuan|sasaran|strategi|arah_kebijakan|program|kegiatan|sub_kegiatan',
  `status`                ENUM('pending','processed','error','skipped') NOT NULL DEFAULT 'pending',
  `error_detail`          TEXT NULL,

  -- pre-resolved relation IDs (operator must supply; never auto-derived from tahun)
  `parent_kode`           VARCHAR(100) NULL,
  `sasaran_id`            INT UNSIGNED NULL,
  `periode_id`            INT NULL,
  `tujuan_id`             INT NULL,
  `misi_id`               INT NULL,
  `strategi_id`           INT NULL,
  `arah_kebijakan_id`     INT NULL,
  `program_id`            INT UNSIGNED NULL,
  `kegiatan_id`           INT NULL,
  `sub_kegiatan_id`       INT NULL,

  -- indikator payload
  `kode_indikator`        VARCHAR(100) NOT NULL,
  `nama_indikator`        TEXT NOT NULL,
  `indikator_kinerja`     TEXT NULL,
  `tipe_indikator`        VARCHAR(50)  NULL,
  `jenis_indikator`       VARCHAR(50)  NULL,
  `jenis_dokumen`         VARCHAR(50)  NOT NULL DEFAULT 'RPJMD',
  `tahun`                 VARCHAR(10)  NOT NULL DEFAULT '2025',
  `tolok_ukur_kinerja`    TEXT NULL,
  `target_kinerja`        TEXT NULL,
  `definisi_operasional`  TEXT NULL,
  `metode_penghitungan`   TEXT NULL,
  `kriteria_kuantitatif`  TEXT NULL,
  `kriteria_kualitatif`   TEXT NULL,
  `baseline`              TEXT NULL,
  `target_tahun_1`        VARCHAR(100) NULL,
  `target_tahun_2`        VARCHAR(100) NULL,
  `target_tahun_3`        VARCHAR(100) NULL,
  `target_tahun_4`        VARCHAR(100) NULL,
  `target_tahun_5`        VARCHAR(100) NULL,
  `capaian_tahun_1`       VARCHAR(100) NULL,
  `capaian_tahun_2`       VARCHAR(100) NULL,
  `capaian_tahun_3`       VARCHAR(100) NULL,
  `capaian_tahun_4`       VARCHAR(100) NULL,
  `capaian_tahun_5`       VARCHAR(100) NULL,
  `sumber_data`           TEXT NULL,
  `satuan`                VARCHAR(100) NULL,

  `created_at`            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_batch`    (`batch_id`),
  KEY `idx_entity`   (`entity_type`),
  KEY `idx_status`   (`status`),
  KEY `idx_batch_entity_status` (`batch_id`, `entity_type`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------
-- 3. BACKFILL indikator_kinerja FROM jenis  (one-way, safe)
--    Only fills NULLs; never overwrites existing values.
-- ---------------------------------------------------------------

UPDATE `indikatortujuans`
SET `indikator_kinerja` = `jenis`
WHERE `indikator_kinerja` IS NULL AND `jenis` IS NOT NULL AND `jenis` != '';

UPDATE `indikatorsasarans`
SET `indikator_kinerja` = `jenis`
WHERE `indikator_kinerja` IS NULL AND `jenis` IS NOT NULL AND `jenis` != '';

UPDATE `indikatorstrategis`
SET `indikator_kinerja` = `jenis`
WHERE `indikator_kinerja` IS NULL AND `jenis` IS NOT NULL AND `jenis` != '';

UPDATE `indikatorarahkebijakans`
SET `indikator_kinerja` = `jenis`
WHERE `indikator_kinerja` IS NULL AND `jenis` IS NOT NULL AND `jenis` != '';

UPDATE `indikatorprograms`
SET `indikator_kinerja` = `jenis`
WHERE `indikator_kinerja` IS NULL AND `jenis` IS NOT NULL AND `jenis` != '';

UPDATE `indikatorkegiatans`
SET `indikator_kinerja` = `jenis`
WHERE `indikator_kinerja` IS NULL AND `jenis` IS NOT NULL AND `jenis` != '';

UPDATE `indikatorsubkegiatans`
SET `indikator_kinerja` = `jenis`
WHERE `indikator_kinerja` IS NULL AND `jenis` IS NOT NULL AND `jenis` != '';

-- ---------------------------------------------------------------
-- 4. AUDIT / INSPECTION QUERIES  (run manually as needed)
-- ---------------------------------------------------------------

-- 4a. Column presence check (MySQL 8.0)
SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN (
    'indikatortujuans','indikatorsasarans','indikatorstrategis',
    'indikatorarahkebijakans','indikatorprograms','indikatorkegiatans',
    'indikatorsubkegiatans'
  )
  AND COLUMN_NAME IN ('indikator_kinerja','import_raw_id')
ORDER BY TABLE_NAME, COLUMN_NAME;

-- 4b. Row counts per table with new columns populated
SELECT 'indikatortujuans'     AS tbl, COUNT(*) AS total, SUM(indikator_kinerja IS NOT NULL) AS ik_filled, SUM(import_raw_id IS NOT NULL) AS raw_linked FROM indikatortujuans
UNION ALL
SELECT 'indikatorsasarans',        COUNT(*), SUM(indikator_kinerja IS NOT NULL), SUM(import_raw_id IS NOT NULL) FROM indikatorsasarans
UNION ALL
SELECT 'indikatorstrategis',       COUNT(*), SUM(indikator_kinerja IS NOT NULL), SUM(import_raw_id IS NOT NULL) FROM indikatorstrategis
UNION ALL
SELECT 'indikatorarahkebijakans',  COUNT(*), SUM(indikator_kinerja IS NOT NULL), SUM(import_raw_id IS NOT NULL) FROM indikatorarahkebijakans
UNION ALL
SELECT 'indikatorprograms',        COUNT(*), SUM(indikator_kinerja IS NOT NULL), SUM(import_raw_id IS NOT NULL) FROM indikatorprograms
UNION ALL
SELECT 'indikatorkegiatans',       COUNT(*), SUM(indikator_kinerja IS NOT NULL), SUM(import_raw_id IS NOT NULL) FROM indikatorkegiatans
UNION ALL
SELECT 'indikatorsubkegiatans',    COUNT(*), SUM(indikator_kinerja IS NOT NULL), SUM(import_raw_id IS NOT NULL) FROM indikatorsubkegiatans;

-- 4c. Backfill verification — rows with jenis but indikator_kinerja still null
SELECT 'indikatortujuans' AS tbl, COUNT(*) AS gap FROM indikatortujuans    WHERE jenis IS NOT NULL AND jenis != '' AND indikator_kinerja IS NULL
UNION ALL
SELECT 'indikatorsasarans',        COUNT(*) FROM indikatorsasarans       WHERE jenis IS NOT NULL AND jenis != '' AND indikator_kinerja IS NULL
UNION ALL
SELECT 'indikatorstrategis',       COUNT(*) FROM indikatorstrategis      WHERE jenis IS NOT NULL AND jenis != '' AND indikator_kinerja IS NULL
UNION ALL
SELECT 'indikatorarahkebijakans',  COUNT(*) FROM indikatorarahkebijakans WHERE jenis IS NOT NULL AND jenis != '' AND indikator_kinerja IS NULL
UNION ALL
SELECT 'indikatorprograms',        COUNT(*) FROM indikatorprograms       WHERE jenis IS NOT NULL AND jenis != '' AND indikator_kinerja IS NULL
UNION ALL
SELECT 'indikatorkegiatans',       COUNT(*) FROM indikatorkegiatans      WHERE jenis IS NOT NULL AND jenis != '' AND indikator_kinerja IS NULL
UNION ALL
SELECT 'indikatorsubkegiatans',    COUNT(*) FROM indikatorsubkegiatans   WHERE jenis IS NOT NULL AND jenis != '' AND indikator_kinerja IS NULL;
