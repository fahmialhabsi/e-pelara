/* =============================================================
   LAYER 2 PROCESSOR — ePeLARA RPJMD IMPORT
   MySQL 8.0+  |  Idempotent  |  No raw row deletion
   Depends on: release_1_migration.sql (run first)
   ============================================================= */

SET NAMES utf8mb4;

-- ---------------------------------------------------------------
-- 1. PROCESSOR LOG TABLE
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `rpjmd_import_processor_log` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `batch_id`     VARCHAR(100) NOT NULL,
  `raw_id`       BIGINT UNSIGNED NULL COMMENT 'NULL for batch-level logs',
  `entity_type`  VARCHAR(50)  NULL,
  `target_table` VARCHAR(100) NULL,
  `status`       ENUM('processed','error','skipped','warning') NOT NULL,
  `message`      TEXT NULL,
  `created_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_batch`  (`batch_id`),
  KEY `idx_raw`    (`raw_id`),
  KEY `idx_entity` (`entity_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------
-- 2. EXAMPLE INSERT SQL PER ENTITY TYPE
--    Source: rpjmd_import_raw  |  Status filter: pending
--    These are reference examples; the stored procedure uses
--    the same logic with per-row cursor iteration.
-- ---------------------------------------------------------------

-- 2a. tujuan -> indikatortujuans
-- (no required FK beyond what has defaults)
INSERT INTO `indikatortujuans` (
  `kode_indikator`, `nama_indikator`, `indikator_kinerja`, `jenis`,
  `tipe_indikator`, `jenis_indikator`,
  `tolok_ukur_kinerja`, `target_kinerja`, `definisi_operasional`, `metode_penghitungan`,
  `kriteria_kuantitatif`, `kriteria_kualitatif`, `baseline`,
  `target_tahun_1`, `target_tahun_2`, `target_tahun_3`, `target_tahun_4`, `target_tahun_5`,
  `capaian_tahun_1`, `capaian_tahun_2`, `capaian_tahun_3`, `capaian_tahun_4`, `capaian_tahun_5`,
  `sumber_data`, `satuan`, `jenis_dokumen`, `tahun`, `import_raw_id`
)
SELECT
  r.kode_indikator, r.nama_indikator, r.indikator_kinerja, r.indikator_kinerja,
  COALESCE(r.tipe_indikator, 'Impact'), COALESCE(r.jenis_indikator, 'Kuantitatif'),
  r.tolok_ukur_kinerja, r.target_kinerja, r.definisi_operasional, r.metode_penghitungan,
  r.kriteria_kuantitatif, r.kriteria_kualitatif, r.baseline,
  r.target_tahun_1, r.target_tahun_2, r.target_tahun_3, r.target_tahun_4, r.target_tahun_5,
  r.capaian_tahun_1, r.capaian_tahun_2, r.capaian_tahun_3, r.capaian_tahun_4, r.capaian_tahun_5,
  r.sumber_data, r.satuan, r.jenis_dokumen, r.tahun, r.id
FROM `rpjmd_import_raw` r
WHERE r.entity_type = 'tujuan'
  AND r.status = 'pending'
  AND NOT EXISTS (SELECT 1 FROM indikatortujuans WHERE import_raw_id = r.id);

-- 2b. sasaran -> indikatorsasarans  (sasaran_id NOT NULL — error if unresolved)
INSERT INTO `indikatorsasarans` (
  `indikator_id`, `sasaran_id`, `kode_indikator`, `nama_indikator`, `indikator_kinerja`, `jenis`,
  `tipe_indikator`, `jenis_indikator`,
  `tolok_ukur_kinerja`, `target_kinerja`, `definisi_operasional`, `metode_penghitungan`,
  `kriteria_kuantitatif`, `kriteria_kualitatif`, `baseline`,
  `target_tahun_1`, `target_tahun_2`, `target_tahun_3`, `target_tahun_4`, `target_tahun_5`,
  `capaian_tahun_1`, `capaian_tahun_2`, `capaian_tahun_3`, `capaian_tahun_4`, `capaian_tahun_5`,
  `sumber_data`, `satuan`, `import_raw_id`
)
SELECT
  r.kode_indikator, r.sasaran_id, r.kode_indikator, r.nama_indikator, r.indikator_kinerja, r.indikator_kinerja,
  COALESCE(r.tipe_indikator, 'Outcome'), COALESCE(r.jenis_indikator, 'Kuantitatif'),
  r.tolok_ukur_kinerja, r.target_kinerja, r.definisi_operasional, r.metode_penghitungan,
  r.kriteria_kuantitatif, r.kriteria_kualitatif, r.baseline,
  r.target_tahun_1, r.target_tahun_2, r.target_tahun_3, r.target_tahun_4, r.target_tahun_5,
  r.capaian_tahun_1, r.capaian_tahun_2, r.capaian_tahun_3, r.capaian_tahun_4, r.capaian_tahun_5,
  r.sumber_data, r.satuan, r.id
FROM `rpjmd_import_raw` r
WHERE r.entity_type = 'sasaran'
  AND r.status = 'pending'
  AND r.sasaran_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM indikatorsasarans WHERE import_raw_id = r.id);

-- 2c. strategi -> indikatorstrategis  (periode_id NOT NULL — error if unresolved)
INSERT INTO `indikatorstrategis` (
  `indikator_id`, `periode_id`, `kode_indikator`, `nama_indikator`, `indikator_kinerja`, `jenis`,
  `tipe_indikator`, `jenis_indikator`, `strategi_id`, `sasaran_id`, `tujuan_id`, `misi_id`,
  `tolok_ukur_kinerja`, `target_kinerja`, `definisi_operasional`, `metode_penghitungan`,
  `kriteria_kuantitatif`, `kriteria_kualitatif`, `baseline`,
  `target_tahun_1`, `target_tahun_2`, `target_tahun_3`, `target_tahun_4`, `target_tahun_5`,
  `capaian_tahun_1`, `capaian_tahun_2`, `capaian_tahun_3`, `capaian_tahun_4`, `capaian_tahun_5`,
  `sumber_data`, `satuan`, `jenis_dokumen`, `tahun`, `import_raw_id`
)
SELECT
  r.kode_indikator, r.periode_id, r.kode_indikator, r.nama_indikator, r.indikator_kinerja, r.indikator_kinerja,
  r.tipe_indikator, r.jenis_indikator, r.strategi_id, r.sasaran_id, r.tujuan_id, r.misi_id,
  r.tolok_ukur_kinerja, r.target_kinerja, r.definisi_operasional, r.metode_penghitungan,
  r.kriteria_kuantitatif, r.kriteria_kualitatif, r.baseline,
  r.target_tahun_1, r.target_tahun_2, r.target_tahun_3, r.target_tahun_4, r.target_tahun_5,
  r.capaian_tahun_1, r.capaian_tahun_2, r.capaian_tahun_3, r.capaian_tahun_4, r.capaian_tahun_5,
  r.sumber_data, r.satuan, r.jenis_dokumen, r.tahun, r.id
FROM `rpjmd_import_raw` r
WHERE r.entity_type = 'strategi'
  AND r.status = 'pending'
  AND r.periode_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM indikatorstrategis WHERE import_raw_id = r.id);

-- 2d. arah_kebijakan -> indikatorarahkebijakans  (periode_id NOT NULL — error if unresolved)
INSERT INTO `indikatorarahkebijakans` (
  `indikator_id`, `periode_id`, `kode_indikator`, `nama_indikator`, `indikator_kinerja`, `jenis`,
  `tipe_indikator`, `jenis_indikator`, `arah_kebijakan_id`, `strategi_id`, `sasaran_id`, `tujuan_id`, `misi_id`,
  `tolok_ukur_kinerja`, `target_kinerja`, `definisi_operasional`, `metode_penghitungan`,
  `kriteria_kuantitatif`, `kriteria_kualitatif`, `baseline`,
  `target_tahun_1`, `target_tahun_2`, `target_tahun_3`, `target_tahun_4`, `target_tahun_5`,
  `capaian_tahun_1`, `capaian_tahun_2`, `capaian_tahun_3`, `capaian_tahun_4`, `capaian_tahun_5`,
  `sumber_data`, `satuan`, `jenis_dokumen`, `tahun`, `import_raw_id`
)
SELECT
  r.kode_indikator, r.periode_id, r.kode_indikator, r.nama_indikator, r.indikator_kinerja, r.indikator_kinerja,
  r.tipe_indikator, r.jenis_indikator, r.arah_kebijakan_id, r.strategi_id, r.sasaran_id, r.tujuan_id, r.misi_id,
  r.tolok_ukur_kinerja, r.target_kinerja, r.definisi_operasional, r.metode_penghitungan,
  r.kriteria_kuantitatif, r.kriteria_kualitatif, r.baseline,
  r.target_tahun_1, r.target_tahun_2, r.target_tahun_3, r.target_tahun_4, r.target_tahun_5,
  r.capaian_tahun_1, r.capaian_tahun_2, r.capaian_tahun_3, r.capaian_tahun_4, r.capaian_tahun_5,
  r.sumber_data, r.satuan, r.jenis_dokumen, r.tahun, r.id
FROM `rpjmd_import_raw` r
WHERE r.entity_type = 'arah_kebijakan'
  AND r.status = 'pending'
  AND r.periode_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM indikatorarahkebijakans WHERE import_raw_id = r.id);

-- 2e. program -> indikatorprograms  (periode_id optional/nullable)
INSERT INTO `indikatorprograms` (
  `kode_indikator`, `nama_indikator`, `indikator_kinerja`, `jenis`,
  `tipe_indikator`, `jenis_indikator`, `program_id`, `sasaran_id`, `periode_id`,
  `tolok_ukur_kinerja`, `target_kinerja`, `definisi_operasional`, `metode_penghitungan`,
  `kriteria_kuantitatif`, `kriteria_kualitatif`, `baseline`,
  `target_tahun_1`, `target_tahun_2`, `target_tahun_3`, `target_tahun_4`, `target_tahun_5`,
  `capaian_tahun_1`, `capaian_tahun_2`, `capaian_tahun_3`, `capaian_tahun_4`, `capaian_tahun_5`,
  `sumber_data`, `satuan`, `import_raw_id`
)
SELECT
  r.kode_indikator, r.nama_indikator, r.indikator_kinerja, r.indikator_kinerja,
  COALESCE(r.tipe_indikator, 'Output'), COALESCE(r.jenis_indikator, 'Kuantitatif'),
  r.program_id, r.sasaran_id, r.periode_id,
  r.tolok_ukur_kinerja, r.target_kinerja, r.definisi_operasional, r.metode_penghitungan,
  r.kriteria_kuantitatif, r.kriteria_kualitatif, r.baseline,
  r.target_tahun_1, r.target_tahun_2, r.target_tahun_3, r.target_tahun_4, r.target_tahun_5,
  r.capaian_tahun_1, r.capaian_tahun_2, r.capaian_tahun_3, r.capaian_tahun_4, r.capaian_tahun_5,
  r.sumber_data, r.satuan, r.id
FROM `rpjmd_import_raw` r
WHERE r.entity_type = 'program'
  AND r.status = 'pending'
  AND NOT EXISTS (SELECT 1 FROM indikatorprograms WHERE import_raw_id = r.id);

-- 2f. kegiatan -> indikatorkegiatans  (periode_id optional/nullable)
INSERT INTO `indikatorkegiatans` (
  `kode_indikator`, `nama_indikator`, `indikator_kinerja`, `jenis`,
  `tipe_indikator`, `jenis_indikator`, `program_id`, `sasaran_id`, `periode_id`,
  `tolok_ukur_kinerja`, `target_kinerja`, `definisi_operasional`, `metode_penghitungan`,
  `kriteria_kuantitatif`, `kriteria_kualitatif`, `baseline`,
  `target_tahun_1`, `target_tahun_2`, `target_tahun_3`, `target_tahun_4`, `target_tahun_5`,
  `capaian_tahun_1`, `capaian_tahun_2`, `capaian_tahun_3`, `capaian_tahun_4`, `capaian_tahun_5`,
  `sumber_data`, `satuan`, `import_raw_id`
)
SELECT
  r.kode_indikator, r.nama_indikator, r.indikator_kinerja, r.indikator_kinerja,
  COALESCE(r.tipe_indikator, 'Proses'), COALESCE(r.jenis_indikator, 'Kuantitatif'),
  r.program_id, r.sasaran_id, r.periode_id,
  r.tolok_ukur_kinerja, r.target_kinerja, r.definisi_operasional, r.metode_penghitungan,
  r.kriteria_kuantitatif, r.kriteria_kualitatif, r.baseline,
  r.target_tahun_1, r.target_tahun_2, r.target_tahun_3, r.target_tahun_4, r.target_tahun_5,
  r.capaian_tahun_1, r.capaian_tahun_2, r.capaian_tahun_3, r.capaian_tahun_4, r.capaian_tahun_5,
  r.sumber_data, r.satuan, r.id
FROM `rpjmd_import_raw` r
WHERE r.entity_type = 'kegiatan'
  AND r.status = 'pending'
  AND NOT EXISTS (SELECT 1 FROM indikatorkegiatans WHERE import_raw_id = r.id);

-- 2g. sub_kegiatan -> indikatorsubkegiatans  (periode_id NOT NULL — error if unresolved)
INSERT INTO `indikatorsubkegiatans` (
  `indikator_id`, `periode_id`, `kode_indikator`, `nama_indikator`, `indikator_kinerja`, `jenis`,
  `tipe_indikator`, `jenis_indikator`,
  `sub_kegiatan_id`, `kegiatan_id`, `program_id`, `sasaran_id`, `tujuan_id`, `misi_id`,
  `tolok_ukur_kinerja`, `target_kinerja`, `definisi_operasional`, `metode_penghitungan`,
  `kriteria_kuantitatif`, `kriteria_kualitatif`, `baseline`,
  `target_tahun_1`, `target_tahun_2`, `target_tahun_3`, `target_tahun_4`, `target_tahun_5`,
  `capaian_tahun_1`, `capaian_tahun_2`, `capaian_tahun_3`, `capaian_tahun_4`, `capaian_tahun_5`,
  `sumber_data`, `satuan`, `jenis_dokumen`, `tahun`, `import_raw_id`
)
SELECT
  r.kode_indikator, r.periode_id, r.kode_indikator, r.nama_indikator, r.indikator_kinerja, r.indikator_kinerja,
  r.tipe_indikator, r.jenis_indikator,
  r.sub_kegiatan_id, r.kegiatan_id, r.program_id, r.sasaran_id, r.tujuan_id, r.misi_id,
  r.tolok_ukur_kinerja, r.target_kinerja, r.definisi_operasional, r.metode_penghitungan,
  r.kriteria_kuantitatif, r.kriteria_kualitatif, r.baseline,
  r.target_tahun_1, r.target_tahun_2, r.target_tahun_3, r.target_tahun_4, r.target_tahun_5,
  r.capaian_tahun_1, r.capaian_tahun_2, r.capaian_tahun_3, r.capaian_tahun_4, r.capaian_tahun_5,
  r.sumber_data, r.satuan, r.jenis_dokumen, r.tahun, r.id
FROM `rpjmd_import_raw` r
WHERE r.entity_type = 'sub_kegiatan'
  AND r.status = 'pending'
  AND r.periode_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM indikatorsubkegiatans WHERE import_raw_id = r.id);

-- ---------------------------------------------------------------
-- 3. MASTER BATCH PROCESSOR STORED PROCEDURE
-- ---------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_process_rpjmd_batch`;

DELIMITER $$

CREATE PROCEDURE `sp_process_rpjmd_batch`(IN p_batch_id VARCHAR(100))
  COMMENT 'Idempotent RPJMD batch processor. Processes pending rows per entity_type.'
BEGIN
  DECLARE v_raw_id       BIGINT UNSIGNED;
  DECLARE v_entity_type  VARCHAR(50);
  DECLARE v_done         INT DEFAULT 0;
  DECLARE v_err_msg      TEXT DEFAULT NULL;
  DECLARE v_processed    INT DEFAULT 0;
  DECLARE v_skipped      INT DEFAULT 0;
  DECLARE v_errors       INT DEFAULT 0;

  DECLARE cur CURSOR FOR
    SELECT id, entity_type
    FROM rpjmd_import_raw
    WHERE batch_id = p_batch_id
      AND status   = 'pending'
    ORDER BY entity_type, id;

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;
  DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
  BEGIN
    GET DIAGNOSTICS CONDITION 1 v_err_msg = MESSAGE_TEXT;
    SET v_errors = v_errors + 1;

    UPDATE rpjmd_import_raw
    SET status = 'error', error_detail = v_err_msg
    WHERE id = v_raw_id;

    INSERT INTO rpjmd_import_processor_log
      (batch_id, raw_id, entity_type, target_table, status, message)
    VALUES
      (p_batch_id, v_raw_id, v_entity_type, NULL, 'error', v_err_msg);
  END;

  OPEN cur;

  row_loop: LOOP
    FETCH cur INTO v_raw_id, v_entity_type;
    IF v_done THEN LEAVE row_loop; END IF;

    SET v_err_msg = NULL;

    -- ---- tujuan ----
    IF v_entity_type = 'tujuan' THEN
      IF EXISTS (SELECT 1 FROM indikatortujuans WHERE import_raw_id = v_raw_id) THEN
        UPDATE rpjmd_import_raw SET status = 'processed' WHERE id = v_raw_id;
        INSERT INTO rpjmd_import_processor_log (batch_id, raw_id, entity_type, target_table, status, message)
          VALUES (p_batch_id, v_raw_id, 'tujuan', 'indikatortujuans', 'warning', 'duplicate: already imported');
        SET v_processed = v_processed + 1;
      ELSE
        INSERT INTO indikatortujuans (
          kode_indikator, nama_indikator, indikator_kinerja, jenis,
          tipe_indikator, jenis_indikator,
          tolok_ukur_kinerja, target_kinerja, definisi_operasional, metode_penghitungan,
          kriteria_kuantitatif, kriteria_kualitatif, baseline,
          target_tahun_1, target_tahun_2, target_tahun_3, target_tahun_4, target_tahun_5,
          capaian_tahun_1, capaian_tahun_2, capaian_tahun_3, capaian_tahun_4, capaian_tahun_5,
          sumber_data, satuan, jenis_dokumen, tahun, import_raw_id
        )
        SELECT kode_indikator, nama_indikator, indikator_kinerja, indikator_kinerja,
          COALESCE(tipe_indikator,'Impact'), COALESCE(jenis_indikator,'Kuantitatif'),
          tolok_ukur_kinerja, target_kinerja, definisi_operasional, metode_penghitungan,
          kriteria_kuantitatif, kriteria_kualitatif, baseline,
          target_tahun_1, target_tahun_2, target_tahun_3, target_tahun_4, target_tahun_5,
          capaian_tahun_1, capaian_tahun_2, capaian_tahun_3, capaian_tahun_4, capaian_tahun_5,
          sumber_data, satuan, jenis_dokumen, tahun, id
        FROM rpjmd_import_raw WHERE id = v_raw_id;

        UPDATE rpjmd_import_raw SET status = 'processed' WHERE id = v_raw_id;
        INSERT INTO rpjmd_import_processor_log (batch_id, raw_id, entity_type, target_table, status, message)
          VALUES (p_batch_id, v_raw_id, 'tujuan', 'indikatortujuans', 'processed', NULL);
        SET v_processed = v_processed + 1;
      END IF;

    -- ---- sasaran — requires sasaran_id ----
    ELSEIF v_entity_type = 'sasaran' THEN
      IF EXISTS (SELECT 1 FROM indikatorsasarans WHERE import_raw_id = v_raw_id) THEN
        UPDATE rpjmd_import_raw SET status = 'processed' WHERE id = v_raw_id;
        INSERT INTO rpjmd_import_processor_log (batch_id, raw_id, entity_type, target_table, status, message)
          VALUES (p_batch_id, v_raw_id, 'sasaran', 'indikatorsasarans', 'warning', 'duplicate: already imported');
        SET v_processed = v_processed + 1;
      ELSEIF (SELECT sasaran_id FROM rpjmd_import_raw WHERE id = v_raw_id) IS NULL THEN
        UPDATE rpjmd_import_raw SET status = 'error', error_detail = 'sasaran_id not resolved' WHERE id = v_raw_id;
        INSERT INTO rpjmd_import_processor_log (batch_id, raw_id, entity_type, target_table, status, message)
          VALUES (p_batch_id, v_raw_id, 'sasaran', 'indikatorsasarans', 'error', 'sasaran_id not resolved');
        SET v_errors = v_errors + 1;
      ELSE
        INSERT INTO indikatorsasarans (
          indikator_id, sasaran_id, kode_indikator, nama_indikator, indikator_kinerja, jenis,
          tipe_indikator, jenis_indikator,
          tolok_ukur_kinerja, target_kinerja, definisi_operasional, metode_penghitungan,
          kriteria_kuantitatif, kriteria_kualitatif, baseline,
          target_tahun_1, target_tahun_2, target_tahun_3, target_tahun_4, target_tahun_5,
          capaian_tahun_1, capaian_tahun_2, capaian_tahun_3, capaian_tahun_4, capaian_tahun_5,
          sumber_data, satuan, import_raw_id
        )
        SELECT kode_indikator, sasaran_id, kode_indikator, nama_indikator, indikator_kinerja, indikator_kinerja,
          COALESCE(tipe_indikator,'Outcome'), COALESCE(jenis_indikator,'Kuantitatif'),
          tolok_ukur_kinerja, target_kinerja, definisi_operasional, metode_penghitungan,
          kriteria_kuantitatif, kriteria_kualitatif, baseline,
          target_tahun_1, target_tahun_2, target_tahun_3, target_tahun_4, target_tahun_5,
          capaian_tahun_1, capaian_tahun_2, capaian_tahun_3, capaian_tahun_4, capaian_tahun_5,
          sumber_data, satuan, id
        FROM rpjmd_import_raw WHERE id = v_raw_id;

        UPDATE rpjmd_import_raw SET status = 'processed' WHERE id = v_raw_id;
        INSERT INTO rpjmd_import_processor_log (batch_id, raw_id, entity_type, target_table, status, message)
          VALUES (p_batch_id, v_raw_id, 'sasaran', 'indikatorsasarans', 'processed', NULL);
        SET v_processed = v_processed + 1;
      END IF;

    -- ---- strategi — requires periode_id ----
    ELSEIF v_entity_type = 'strategi' THEN
      IF EXISTS (SELECT 1 FROM indikatorstrategis WHERE import_raw_id = v_raw_id) THEN
        UPDATE rpjmd_import_raw SET status = 'processed' WHERE id = v_raw_id;
        INSERT INTO rpjmd_import_processor_log (batch_id, raw_id, entity_type, target_table, status, message)
          VALUES (p_batch_id, v_raw_id, 'strategi', 'indikatorstrategis', 'warning', 'duplicate: already imported');
        SET v_processed = v_processed + 1;
      ELSEIF (SELECT periode_id FROM rpjmd_import_raw WHERE id = v_raw_id) IS NULL THEN
        UPDATE rpjmd_import_raw SET status = 'error', error_detail = 'periode_id not resolved' WHERE id = v_raw_id;
        INSERT INTO rpjmd_import_processor_log (batch_id, raw_id, entity_type, target_table, status, message)
          VALUES (p_batch_id, v_raw_id, 'strategi', 'indikatorstrategis', 'error', 'periode_id not resolved');
        SET v_errors = v_errors + 1;
      ELSE
        INSERT INTO indikatorstrategis (
          indikator_id, periode_id, kode_indikator, nama_indikator, indikator_kinerja, jenis,
          tipe_indikator, jenis_indikator, strategi_id, sasaran_id, tujuan_id, misi_id,
          tolok_ukur_kinerja, target_kinerja, definisi_operasional, metode_penghitungan,
          kriteria_kuantitatif, kriteria_kualitatif, baseline,
          target_tahun_1, target_tahun_2, target_tahun_3, target_tahun_4, target_tahun_5,
          capaian_tahun_1, capaian_tahun_2, capaian_tahun_3, capaian_tahun_4, capaian_tahun_5,
          sumber_data, satuan, jenis_dokumen, tahun, import_raw_id
        )
        SELECT kode_indikator, periode_id, kode_indikator, nama_indikator, indikator_kinerja, indikator_kinerja,
          tipe_indikator, jenis_indikator, strategi_id, sasaran_id, tujuan_id, misi_id,
          tolok_ukur_kinerja, target_kinerja, definisi_operasional, metode_penghitungan,
          kriteria_kuantitatif, kriteria_kualitatif, baseline,
          target_tahun_1, target_tahun_2, target_tahun_3, target_tahun_4, target_tahun_5,
          capaian_tahun_1, capaian_tahun_2, capaian_tahun_3, capaian_tahun_4, capaian_tahun_5,
          sumber_data, satuan, jenis_dokumen, tahun, id
        FROM rpjmd_import_raw WHERE id = v_raw_id;

        UPDATE rpjmd_import_raw SET status = 'processed' WHERE id = v_raw_id;
        INSERT INTO rpjmd_import_processor_log (batch_id, raw_id, entity_type, target_table, status, message)
          VALUES (p_batch_id, v_raw_id, 'strategi', 'indikatorstrategis', 'processed', NULL);
        SET v_processed = v_processed + 1;
      END IF;

    -- ---- arah_kebijakan — requires periode_id ----
    ELSEIF v_entity_type = 'arah_kebijakan' THEN
      IF EXISTS (SELECT 1 FROM indikatorarahkebijakans WHERE import_raw_id = v_raw_id) THEN
        UPDATE rpjmd_import_raw SET status = 'processed' WHERE id = v_raw_id;
        INSERT INTO rpjmd_import_processor_log (batch_id, raw_id, entity_type, target_table, status, message)
          VALUES (p_batch_id, v_raw_id, 'arah_kebijakan', 'indikatorarahkebijakans', 'warning', 'duplicate: already imported');
        SET v_processed = v_processed + 1;
      ELSEIF (SELECT periode_id FROM rpjmd_import_raw WHERE id = v_raw_id) IS NULL THEN
        UPDATE rpjmd_import_raw SET status = 'error', error_detail = 'periode_id not resolved' WHERE id = v_raw_id;
        INSERT INTO rpjmd_import_processor_log (batch_id, raw_id, entity_type, target_table, status, message)
          VALUES (p_batch_id, v_raw_id, 'arah_kebijakan', 'indikatorarahkebijakans', 'error', 'periode_id not resolved');
        SET v_errors = v_errors + 1;
      ELSE
        INSERT INTO indikatorarahkebijakans (
          indikator_id, periode_id, kode_indikator, nama_indikator, indikator_kinerja, jenis,
          tipe_indikator, jenis_indikator, arah_kebijakan_id, strategi_id, sasaran_id, tujuan_id, misi_id,
          tolok_ukur_kinerja, target_kinerja, definisi_operasional, metode_penghitungan,
          kriteria_kuantitatif, kriteria_kualitatif, baseline,
          target_tahun_1, target_tahun_2, target_tahun_3, target_tahun_4, target_tahun_5,
          capaian_tahun_1, capaian_tahun_2, capaian_tahun_3, capaian_tahun_4, capaian_tahun_5,
          sumber_data, satuan, jenis_dokumen, tahun, import_raw_id
        )
        SELECT kode_indikator, periode_id, kode_indikator, nama_indikator, indikator_kinerja, indikator_kinerja,
          tipe_indikator, jenis_indikator, arah_kebijakan_id, strategi_id, sasaran_id, tujuan_id, misi_id,
          tolok_ukur_kinerja, target_kinerja, definisi_operasional, metode_penghitungan,
          kriteria_kuantitatif, kriteria_kualitatif, baseline,
          target_tahun_1, target_tahun_2, target_tahun_3, target_tahun_4, target_tahun_5,
          capaian_tahun_1, capaian_tahun_2, capaian_tahun_3, capaian_tahun_4, capaian_tahun_5,
          sumber_data, satuan, jenis_dokumen, tahun, id
        FROM rpjmd_import_raw WHERE id = v_raw_id;

        UPDATE rpjmd_import_raw SET status = 'processed' WHERE id = v_raw_id;
        INSERT INTO rpjmd_import_processor_log (batch_id, raw_id, entity_type, target_table, status, message)
          VALUES (p_batch_id, v_raw_id, 'arah_kebijakan', 'indikatorarahkebijakans', 'processed', NULL);
        SET v_processed = v_processed + 1;
      END IF;

    -- ---- program — periode_id optional ----
    ELSEIF v_entity_type = 'program' THEN
      IF EXISTS (SELECT 1 FROM indikatorprograms WHERE import_raw_id = v_raw_id) THEN
        UPDATE rpjmd_import_raw SET status = 'processed' WHERE id = v_raw_id;
        INSERT INTO rpjmd_import_processor_log (batch_id, raw_id, entity_type, target_table, status, message)
          VALUES (p_batch_id, v_raw_id, 'program', 'indikatorprograms', 'warning', 'duplicate: already imported');
        SET v_processed = v_processed + 1;
      ELSE
        INSERT INTO indikatorprograms (
          kode_indikator, nama_indikator, indikator_kinerja, jenis,
          tipe_indikator, jenis_indikator, program_id, sasaran_id, periode_id,
          tolok_ukur_kinerja, target_kinerja, definisi_operasional, metode_penghitungan,
          kriteria_kuantitatif, kriteria_kualitatif, baseline,
          target_tahun_1, target_tahun_2, target_tahun_3, target_tahun_4, target_tahun_5,
          capaian_tahun_1, capaian_tahun_2, capaian_tahun_3, capaian_tahun_4, capaian_tahun_5,
          sumber_data, satuan, import_raw_id
        )
        SELECT kode_indikator, nama_indikator, indikator_kinerja, indikator_kinerja,
          COALESCE(tipe_indikator,'Output'), COALESCE(jenis_indikator,'Kuantitatif'),
          program_id, sasaran_id, periode_id,
          tolok_ukur_kinerja, target_kinerja, definisi_operasional, metode_penghitungan,
          kriteria_kuantitatif, kriteria_kualitatif, baseline,
          target_tahun_1, target_tahun_2, target_tahun_3, target_tahun_4, target_tahun_5,
          capaian_tahun_1, capaian_tahun_2, capaian_tahun_3, capaian_tahun_4, capaian_tahun_5,
          sumber_data, satuan, id
        FROM rpjmd_import_raw WHERE id = v_raw_id;

        UPDATE rpjmd_import_raw SET status = 'processed' WHERE id = v_raw_id;
        INSERT INTO rpjmd_import_processor_log (batch_id, raw_id, entity_type, target_table, status, message)
          VALUES (p_batch_id, v_raw_id, 'program', 'indikatorprograms', 'processed', NULL);
        SET v_processed = v_processed + 1;
      END IF;

    -- ---- kegiatan — periode_id optional ----
    ELSEIF v_entity_type = 'kegiatan' THEN
      IF EXISTS (SELECT 1 FROM indikatorkegiatans WHERE import_raw_id = v_raw_id) THEN
        UPDATE rpjmd_import_raw SET status = 'processed' WHERE id = v_raw_id;
        INSERT INTO rpjmd_import_processor_log (batch_id, raw_id, entity_type, target_table, status, message)
          VALUES (p_batch_id, v_raw_id, 'kegiatan', 'indikatorkegiatans', 'warning', 'duplicate: already imported');
        SET v_processed = v_processed + 1;
      ELSE
        INSERT INTO indikatorkegiatans (
          kode_indikator, nama_indikator, indikator_kinerja, jenis,
          tipe_indikator, jenis_indikator, program_id, sasaran_id, periode_id,
          tolok_ukur_kinerja, target_kinerja, definisi_operasional, metode_penghitungan,
          kriteria_kuantitatif, kriteria_kualitatif, baseline,
          target_tahun_1, target_tahun_2, target_tahun_3, target_tahun_4, target_tahun_5,
          capaian_tahun_1, capaian_tahun_2, capaian_tahun_3, capaian_tahun_4, capaian_tahun_5,
          sumber_data, satuan, import_raw_id
        )
        SELECT kode_indikator, nama_indikator, indikator_kinerja, indikator_kinerja,
          COALESCE(tipe_indikator,'Proses'), COALESCE(jenis_indikator,'Kuantitatif'),
          program_id, sasaran_id, periode_id,
          tolok_ukur_kinerja, target_kinerja, definisi_operasional, metode_penghitungan,
          kriteria_kuantitatif, kriteria_kualitatif, baseline,
          target_tahun_1, target_tahun_2, target_tahun_3, target_tahun_4, target_tahun_5,
          capaian_tahun_1, capaian_tahun_2, capaian_tahun_3, capaian_tahun_4, capaian_tahun_5,
          sumber_data, satuan, id
        FROM rpjmd_import_raw WHERE id = v_raw_id;

        UPDATE rpjmd_import_raw SET status = 'processed' WHERE id = v_raw_id;
        INSERT INTO rpjmd_import_processor_log (batch_id, raw_id, entity_type, target_table, status, message)
          VALUES (p_batch_id, v_raw_id, 'kegiatan', 'indikatorkegiatans', 'processed', NULL);
        SET v_processed = v_processed + 1;
      END IF;

    -- ---- sub_kegiatan — requires periode_id ----
    ELSEIF v_entity_type = 'sub_kegiatan' THEN
      IF EXISTS (SELECT 1 FROM indikatorsubkegiatans WHERE import_raw_id = v_raw_id) THEN
        UPDATE rpjmd_import_raw SET status = 'processed' WHERE id = v_raw_id;
        INSERT INTO rpjmd_import_processor_log (batch_id, raw_id, entity_type, target_table, status, message)
          VALUES (p_batch_id, v_raw_id, 'sub_kegiatan', 'indikatorsubkegiatans', 'warning', 'duplicate: already imported');
        SET v_processed = v_processed + 1;
      ELSEIF (SELECT periode_id FROM rpjmd_import_raw WHERE id = v_raw_id) IS NULL THEN
        UPDATE rpjmd_import_raw SET status = 'error', error_detail = 'periode_id not resolved' WHERE id = v_raw_id;
        INSERT INTO rpjmd_import_processor_log (batch_id, raw_id, entity_type, target_table, status, message)
          VALUES (p_batch_id, v_raw_id, 'sub_kegiatan', 'indikatorsubkegiatans', 'error', 'periode_id not resolved');
        SET v_errors = v_errors + 1;
      ELSE
        INSERT INTO indikatorsubkegiatans (
          indikator_id, periode_id, kode_indikator, nama_indikator, indikator_kinerja, jenis,
          tipe_indikator, jenis_indikator,
          sub_kegiatan_id, kegiatan_id, program_id, sasaran_id, tujuan_id, misi_id,
          tolok_ukur_kinerja, target_kinerja, definisi_operasional, metode_penghitungan,
          kriteria_kuantitatif, kriteria_kualitatif, baseline,
          target_tahun_1, target_tahun_2, target_tahun_3, target_tahun_4, target_tahun_5,
          capaian_tahun_1, capaian_tahun_2, capaian_tahun_3, capaian_tahun_4, capaian_tahun_5,
          sumber_data, satuan, jenis_dokumen, tahun, import_raw_id
        )
        SELECT kode_indikator, periode_id, kode_indikator, nama_indikator, indikator_kinerja, indikator_kinerja,
          tipe_indikator, jenis_indikator,
          sub_kegiatan_id, kegiatan_id, program_id, sasaran_id, tujuan_id, misi_id,
          tolok_ukur_kinerja, target_kinerja, definisi_operasional, metode_penghitungan,
          kriteria_kuantitatif, kriteria_kualitatif, baseline,
          target_tahun_1, target_tahun_2, target_tahun_3, target_tahun_4, target_tahun_5,
          capaian_tahun_1, capaian_tahun_2, capaian_tahun_3, capaian_tahun_4, capaian_tahun_5,
          sumber_data, satuan, jenis_dokumen, tahun, id
        FROM rpjmd_import_raw WHERE id = v_raw_id;

        UPDATE rpjmd_import_raw SET status = 'processed' WHERE id = v_raw_id;
        INSERT INTO rpjmd_import_processor_log (batch_id, raw_id, entity_type, target_table, status, message)
          VALUES (p_batch_id, v_raw_id, 'sub_kegiatan', 'indikatorsubkegiatans', 'processed', NULL);
        SET v_processed = v_processed + 1;
      END IF;

    ELSE
      -- unknown entity_type
      UPDATE rpjmd_import_raw SET status = 'skipped', error_detail = 'unknown entity_type' WHERE id = v_raw_id;
      INSERT INTO rpjmd_import_processor_log (batch_id, raw_id, entity_type, target_table, status, message)
        VALUES (p_batch_id, v_raw_id, v_entity_type, NULL, 'skipped', 'unknown entity_type');
      SET v_skipped = v_skipped + 1;
    END IF;

  END LOOP;

  CLOSE cur;

  -- batch-level summary log
  INSERT INTO rpjmd_import_processor_log (batch_id, raw_id, entity_type, target_table, status, message)
  VALUES (
    p_batch_id, NULL, 'batch', NULL, 'processed',
    CONCAT('processed=', v_processed, ' skipped=', v_skipped, ' errors=', v_errors)
  );

END$$

DELIMITER ;

-- ---------------------------------------------------------------
-- USAGE EXAMPLE
--   CALL sp_process_rpjmd_batch('BATCH-2026-04-19-001');
--
-- MONITORING
--   SELECT * FROM rpjmd_import_processor_log WHERE batch_id = 'BATCH-2026-04-19-001';
--   SELECT status, COUNT(*) FROM rpjmd_import_raw WHERE batch_id = 'BATCH-2026-04-19-001' GROUP BY status;
-- ---------------------------------------------------------------
