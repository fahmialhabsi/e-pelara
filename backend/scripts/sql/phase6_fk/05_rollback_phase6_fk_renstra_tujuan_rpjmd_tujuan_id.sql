/*
  Phase 6 — Rollback
  - Drop FK: fk_renstra_tujuan__rpjmd_tujuan_id__tujuan
  - Drop index: idx_fk_renstra_tujuan__rpjmd_tujuan_id

  Aman dijalankan berulang: DROP dilakukan hanya jika objek ada.
*/

SET @db := DATABASE();

/* Pastikan string-literal pakai double quote tetap kompatibel jika sql_mode mengandung ANSI_QUOTES */
SET @phase6_orig_sql_mode := @@SESSION.sql_mode;
SET SESSION sql_mode = REPLACE(@@SESSION.sql_mode, 'ANSI_QUOTES', '');

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.referential_constraints
      WHERE constraint_schema = @db
        AND constraint_name = 'fk_renstra_tujuan__rpjmd_tujuan_id__tujuan'
    ),
    "ALTER TABLE renstra_tujuan DROP FOREIGN KEY fk_renstra_tujuan__rpjmd_tujuan_id__tujuan",
    "SELECT 'SKIP drop fk_renstra_tujuan__rpjmd_tujuan_id__tujuan (not found)' AS msg"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = @db
        AND table_name = 'renstra_tujuan'
        AND index_name = 'idx_fk_renstra_tujuan__rpjmd_tujuan_id'
    ),
    "ALTER TABLE renstra_tujuan DROP INDEX idx_fk_renstra_tujuan__rpjmd_tujuan_id",
    "SELECT 'SKIP drop idx_fk_renstra_tujuan__rpjmd_tujuan_id (not found)' AS msg"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* Restore sql_mode */
SET SESSION sql_mode = @phase6_orig_sql_mode;

