-- =============================================================
-- MIGRATION: fix_sp_process_rpjmd_batch
-- Engine:    MySQL 8.0+  (verified against db_epelara 8.0.30)
-- Purpose:
--   1. Redeploy sp_process_rpjmd_batch so indikator_kinerja is
--      written to all 7 final tables on import.
--   2. Backfill indikator_kinerja from jenis for rows that were
--      inserted before this column existed.
-- Run order: AFTER release_1_migration.sql
-- Idempotent: yes — DROP IF EXISTS + WHERE IS NULL guards
-- =============================================================

-- ---------------------------------------------------------------
-- STEP 1: Backfill indikator_kinerja for pre-migration rows
--         Safe: only updates rows where column is still NULL
-- ---------------------------------------------------------------

UPDATE `indikatortujuans`
SET  `indikator_kinerja` = `jenis`
WHERE `indikator_kinerja` IS NULL
  AND `jenis` IS NOT NULL AND `jenis` != '';

UPDATE `indikatorsasarans`
SET  `indikator_kinerja` = `jenis`
WHERE `indikator_kinerja` IS NULL
  AND `jenis` IS NOT NULL AND `jenis` != '';

UPDATE `indikatorstrategis`
SET  `indikator_kinerja` = `jenis`
WHERE `indikator_kinerja` IS NULL
  AND `jenis` IS NOT NULL AND `jenis` != '';

UPDATE `indikatorarahkebijakans`
SET  `indikator_kinerja` = `jenis`
WHERE `indikator_kinerja` IS NULL
  AND `jenis` IS NOT NULL AND `jenis` != '';

UPDATE `indikatorprograms`
SET  `indikator_kinerja` = `jenis`
WHERE `indikator_kinerja` IS NULL
  AND `jenis` IS NOT NULL AND `jenis` != '';

UPDATE `indikatorkegiatans`
SET  `indikator_kinerja` = `jenis`
WHERE `indikator_kinerja` IS NULL
  AND `jenis` IS NOT NULL AND `jenis` != '';

UPDATE `indikatorsubkegiatans`
SET  `indikator_kinerja` = `jenis`
WHERE `indikator_kinerja` IS NULL
  AND `jenis` IS NOT NULL AND `jenis` != '';

-- ---------------------------------------------------------------
-- STEP 2: Redeploy stored procedure
--         Ensures indikator_kinerja is mapped on every fresh
--         environment (CI, staging, new developer machine).
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

    -- ---- sasaran ----
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

    -- ---- strategi ----
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

    -- ---- arah_kebijakan ----
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

    -- ---- program ----
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

    -- ---- kegiatan ----
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

    -- ---- sub_kegiatan ----
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
      UPDATE rpjmd_import_raw SET status = 'skipped', error_detail = 'unknown entity_type' WHERE id = v_raw_id;
      INSERT INTO rpjmd_import_processor_log (batch_id, raw_id, entity_type, target_table, status, message)
        VALUES (p_batch_id, v_raw_id, v_entity_type, NULL, 'skipped', 'unknown entity_type');
      SET v_skipped = v_skipped + 1;
    END IF;

  END LOOP;

  CLOSE cur;

  INSERT INTO rpjmd_import_processor_log (batch_id, raw_id, entity_type, target_table, status, message)
  VALUES (
    p_batch_id, NULL, 'batch', NULL, 'processed',
    CONCAT('processed=', v_processed, ' skipped=', v_skipped, ' errors=', v_errors)
  );

END$$

DELIMITER ;
