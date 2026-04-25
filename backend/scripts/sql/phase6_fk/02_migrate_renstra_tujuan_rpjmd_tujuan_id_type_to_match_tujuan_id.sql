/*
  Phase 6 — Migration: samakan tipe kolom
    renstra_tujuan.rpjmd_tujuan_id  -> match tujuan.id (INT UNSIGNED, dll)

  Safety gate:
  - hanya jalan jika data sudah siap (non_numeric/blank=0, missing parent=0)
  - hanya jalan jika masih ada type mismatch

  Catatan:
  - Migration ini TIDAK mengaktifkan NOT NULL (hardening NOT NULL tetap di fase lain).
  - Jalankan `01_preflight_phase6_fk_renstra_tujuan_rpjmd_tujuan_id.sql` dulu.
*/

SET @db := DATABASE();

/* Pastikan string-literal pakai double quote tetap kompatibel jika sql_mode mengandung ANSI_QUOTES */
SET @phase6_orig_sql_mode := @@SESSION.sql_mode;
SET SESSION sql_mode = REPLACE(@@SESSION.sql_mode, 'ANSI_QUOTES', '');

SET @target_coltype := (
  SELECT p.column_type
  FROM information_schema.columns p
  WHERE p.table_schema = @db AND p.table_name = 'tujuan' AND p.column_name = 'id'
  LIMIT 1
);

SET @child_is_nullable := (
  SELECT c.is_nullable
  FROM information_schema.columns c
  WHERE c.table_schema = @db AND c.table_name = 'renstra_tujuan' AND c.column_name = 'rpjmd_tujuan_id'
  LIMIT 1
);
SET @null_clause := IF(@child_is_nullable = 'NO', 'NOT NULL', 'NULL');

/* data readiness */
SET @invalid_format := (
  SELECT COUNT(*)
  FROM renstra_tujuan
  WHERE rpjmd_tujuan_id IS NOT NULL
    AND (
      TRIM(CAST(rpjmd_tujuan_id AS CHAR)) = ''
      OR CAST(rpjmd_tujuan_id AS CHAR) NOT REGEXP '^[0-9]+$'
    )
);

SET @missing_parent := (
  SELECT COUNT(*)
  FROM renstra_tujuan rt
  LEFT JOIN tujuan t ON t.id = CAST(rt.rpjmd_tujuan_id AS UNSIGNED)
  WHERE rt.rpjmd_tujuan_id IS NOT NULL
    AND TRIM(CAST(rt.rpjmd_tujuan_id AS CHAR)) <> ''
    AND CAST(rt.rpjmd_tujuan_id AS CHAR) REGEXP '^[0-9]+$'
    AND t.id IS NULL
);

/* type mismatch flag */
SET @type_mismatch := (
  SELECT CASE
    WHEN @target_coltype IS NULL THEN 1
    WHEN NOT EXISTS(
      SELECT 1
      FROM information_schema.columns c
      WHERE c.table_schema = @db AND c.table_name = 'renstra_tujuan' AND c.column_name = 'rpjmd_tujuan_id'
    ) THEN 1
    WHEN EXISTS(
      SELECT 1
      FROM information_schema.columns c
      JOIN information_schema.columns p
        ON p.table_schema = c.table_schema AND p.table_name = 'tujuan' AND p.column_name = 'id'
      WHERE c.table_schema = @db
        AND c.table_name = 'renstra_tujuan' AND c.column_name = 'rpjmd_tujuan_id'
        AND (
          c.data_type <> p.data_type
          OR (LOCATE('unsigned', c.column_type) > 0) <> (LOCATE('unsigned', p.column_type) > 0)
        )
    ) THEN 1
    ELSE 0
  END
);

SELECT
  @invalid_format AS invalid_format_count,
  @missing_parent AS missing_parent_count,
  @type_mismatch AS type_mismatch,
  @target_coltype AS target_column_type_from_tujuan_id,
  @null_clause AS target_nullability;

SET @sql := (
  SELECT IF(
    @type_mismatch = 0,
    "SELECT 'SKIP: type already matches tujuan.id' AS msg",
    IF(
      @target_coltype IS NULL,
      "SELECT 'BLOCK: cannot determine tujuan.id column_type (missing tujuan.id?)' AS msg",
      IF(
      @invalid_format > 0 OR @missing_parent > 0,
      "SELECT 'BLOCK: data not ready (invalid_format/missing_parent must be 0). Fix data, then retry.' AS msg",
      CONCAT(
        "ALTER TABLE renstra_tujuan MODIFY COLUMN rpjmd_tujuan_id ",
        @target_coltype,
        " ",
        @null_clause
      )
    )
    )
  )
);

PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* Restore sql_mode */
SET SESSION sql_mode = @phase6_orig_sql_mode;
