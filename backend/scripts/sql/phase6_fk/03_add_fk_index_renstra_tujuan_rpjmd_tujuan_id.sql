/*
  Phase 6 — Add FK Index
    idx_fk_renstra_tujuan__rpjmd_tujuan_id on renstra_tujuan(rpjmd_tujuan_id)

  Idempotent:
  - Jika sudah ada index leftmost pada kolom tsb, akan SKIP.
*/

SET @db := DATABASE();

/* Pastikan string-literal pakai double quote tetap kompatibel jika sql_mode mengandung ANSI_QUOTES */
SET @phase6_orig_sql_mode := @@SESSION.sql_mode;
SET SESSION sql_mode = REPLACE(@@SESSION.sql_mode, 'ANSI_QUOTES', '');

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = @db
        AND table_name = 'renstra_tujuan'
        AND column_name = 'rpjmd_tujuan_id'
        AND seq_in_index = 1
    ),
    "SELECT 'SKIP idx renstra_tujuan.rpjmd_tujuan_id (already indexed)' AS msg",
    "CREATE INDEX idx_fk_renstra_tujuan__rpjmd_tujuan_id ON renstra_tujuan (rpjmd_tujuan_id)"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* Restore sql_mode */
SET SESSION sql_mode = @phase6_orig_sql_mode;

