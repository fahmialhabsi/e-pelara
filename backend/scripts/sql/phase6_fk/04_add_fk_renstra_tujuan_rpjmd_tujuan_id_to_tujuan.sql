/*
  Phase 6 — Add FK Constraint
    fk_renstra_tujuan__rpjmd_tujuan_id__tujuan

  Policy:
  - ON DELETE RESTRICT, ON UPDATE CASCADE

  Idempotent:
  - Jika FK sudah ada, SKIP.
  - Jika engine/type mismatch, SKIP dengan pesan (harus diselesaikan via preflight + migration).
*/

SET @db := DATABASE();

/* Pastikan string-literal pakai double quote tetap kompatibel jika sql_mode mengandung ANSI_QUOTES */
SET @phase6_orig_sql_mode := @@SESSION.sql_mode;
SET SESSION sql_mode = REPLACE(@@SESSION.sql_mode, 'ANSI_QUOTES', '');

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.referential_constraints
      WHERE BINARY constraint_schema = BINARY @db
        AND constraint_name = 'fk_renstra_tujuan__rpjmd_tujuan_id__tujuan'
    ),
    "SELECT 'SKIP fk_renstra_tujuan__rpjmd_tujuan_id__tujuan (exists)' AS msg",
    IF(
      EXISTS(
        SELECT 1 FROM information_schema.key_column_usage
        WHERE BINARY table_schema = BINARY @db
          AND table_name = 'renstra_tujuan'
          AND column_name = 'rpjmd_tujuan_id'
          AND referenced_table_name IS NOT NULL
      ),
      "SELECT 'SKIP fk_renstra_tujuan__rpjmd_tujuan_id__tujuan (already has FK)' AS msg",
      IF(
        EXISTS(
          SELECT 1
          FROM information_schema.tables tc
          JOIN information_schema.tables tp
            ON tp.table_schema = tc.table_schema AND tp.table_name = 'tujuan'
          JOIN information_schema.columns c
            ON c.table_schema = tc.table_schema AND c.table_name = 'renstra_tujuan' AND c.column_name = 'rpjmd_tujuan_id'
          JOIN information_schema.columns p
            ON p.table_schema = tc.table_schema AND p.table_name = 'tujuan' AND p.column_name = 'id'
          WHERE BINARY tc.table_schema = BINARY @db
            AND tc.table_name = 'renstra_tujuan'
            AND tc.engine = 'InnoDB'
            AND tp.engine = 'InnoDB'
            AND c.data_type = p.data_type
            AND (LOCATE('unsigned', c.column_type) > 0) = (LOCATE('unsigned', p.column_type) > 0)
        ),
        "ALTER TABLE renstra_tujuan ADD CONSTRAINT fk_renstra_tujuan__rpjmd_tujuan_id__tujuan FOREIGN KEY (rpjmd_tujuan_id) REFERENCES tujuan(id) ON DELETE RESTRICT ON UPDATE CASCADE",
        "SELECT 'SKIP fk_renstra_tujuan__rpjmd_tujuan_id__tujuan (engine/type mismatch)' AS msg"
      )
    )
  )
);

PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* Restore sql_mode */
SET SESSION sql_mode = @phase6_orig_sql_mode;
