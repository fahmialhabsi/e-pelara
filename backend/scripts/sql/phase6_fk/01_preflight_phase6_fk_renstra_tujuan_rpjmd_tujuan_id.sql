/*
  Phase 6 — Preflight FK Activation
  Target FK:
    renstra_tujuan.rpjmd_tujuan_id -> tujuan.id

  Wajib dicek:
  - non_numeric/blank rpjmd_tujuan_id
  - missing parent (tujuan.id)
  - type mismatch (renstra_tujuan.rpjmd_tujuan_id vs tujuan.id)

  Output:
  - summary PASS/FAIL/WARN + final_decision:
    - NOT_READY_PHASE6           (data invalid / missing parent)
    - NEEDS_TYPE_MIGRATION       (data OK, tapi schema type mismatch)
    - READY_FOR_FK_PHASE6        (data OK + type match)
*/

SELECT DATABASE() AS db_name, VERSION() AS mysql_version;

/* Metadata ringkas */
SELECT
  t.table_name,
  t.engine,
  t.table_collation
FROM information_schema.tables t
WHERE t.table_schema = DATABASE()
  AND t.table_name IN ('renstra_tujuan','tujuan')
ORDER BY t.table_name;

SELECT
  c.table_name,
  c.column_name,
  c.data_type,
  c.column_type,
  c.is_nullable
FROM information_schema.columns c
WHERE c.table_schema = DATABASE()
  AND (
    (c.table_name = 'renstra_tujuan' AND c.column_name = 'rpjmd_tujuan_id')
    OR
    (c.table_name = 'tujuan' AND c.column_name = 'id')
  )
ORDER BY c.table_name, c.column_name;

/* ============================================================
   1) Required checks (counts)
============================================================ */

/* 1a) non_numeric/blank (anggap blank = invalid) */
SELECT COUNT(*) AS phase6_non_numeric_renstra_tujuan_rpjmd_tujuan_id
FROM renstra_tujuan
WHERE rpjmd_tujuan_id IS NOT NULL
  AND (
    TRIM(CAST(rpjmd_tujuan_id AS CHAR)) = ''
    OR CAST(rpjmd_tujuan_id AS CHAR) NOT REGEXP '^[0-9]+$'
  );

/* 1b) missing parent (hanya untuk yang numerik) */
SELECT COUNT(*) AS phase6_missing_parent_renstra_tujuan_rpjmd_tujuan_id__tujuan
FROM renstra_tujuan rt
LEFT JOIN tujuan t ON t.id = CAST(rt.rpjmd_tujuan_id AS UNSIGNED)
WHERE rt.rpjmd_tujuan_id IS NOT NULL
  AND TRIM(CAST(rt.rpjmd_tujuan_id AS CHAR)) <> ''
  AND CAST(rt.rpjmd_tujuan_id AS CHAR) REGEXP '^[0-9]+$'
  AND t.id IS NULL;

/* 1c) type mismatch flag (0/1) */
SELECT
  CASE
    WHEN NOT EXISTS(
      SELECT 1
      FROM information_schema.columns c
      WHERE c.table_schema = DATABASE()
        AND c.table_name = 'renstra_tujuan'
        AND c.column_name = 'rpjmd_tujuan_id'
    ) THEN 1
    WHEN NOT EXISTS(
      SELECT 1
      FROM information_schema.columns p
      WHERE p.table_schema = DATABASE()
        AND p.table_name = 'tujuan'
        AND p.column_name = 'id'
    ) THEN 1
    WHEN EXISTS(
      SELECT 1
      FROM information_schema.columns c
      JOIN information_schema.columns p
        ON p.table_schema = c.table_schema
       AND p.table_name = 'tujuan'
       AND p.column_name = 'id'
      WHERE c.table_schema = DATABASE()
        AND c.table_name = 'renstra_tujuan'
        AND c.column_name = 'rpjmd_tujuan_id'
        AND (
          c.data_type <> p.data_type
          OR (LOCATE('unsigned', c.column_type) > 0) <> (LOCATE('unsigned', p.column_type) > 0)
        )
    ) THEN 1
    ELSE 0
  END AS phase6_type_mismatch_renstra_tujuan_rpjmd_tujuan_id__tujuan_id;

/* ============================================================
   2) Prefight summary (gate)
============================================================ */
SELECT
  s.check_group,
  s.check_name,
  s.issue_count,
  CASE WHEN s.issue_count = 0 THEN 'PASS' ELSE s.status_on_issue END AS status,
  s.blocking,
  s.notes
FROM (
  SELECT
    'PHASE6' AS check_group,
    'phase6_non_numeric_renstra_tujuan_rpjmd_tujuan_id' AS check_name,
    CAST((
      SELECT COUNT(*)
      FROM renstra_tujuan
      WHERE rpjmd_tujuan_id IS NOT NULL
        AND (
          TRIM(CAST(rpjmd_tujuan_id AS CHAR)) = ''
          OR CAST(rpjmd_tujuan_id AS CHAR) NOT REGEXP '^[0-9]+$'
        )
    ) AS UNSIGNED) AS issue_count,
    'FAIL' AS status_on_issue,
    'YES' AS blocking,
    'Data baru wajib numerik; blank/UUID/teks harus dibersihkan sebelum migrasi tipe & FK.' AS notes

  UNION ALL

  SELECT
    'PHASE6' AS check_group,
    'phase6_missing_parent_renstra_tujuan_rpjmd_tujuan_id__tujuan' AS check_name,
    CAST((
      SELECT COUNT(*)
      FROM renstra_tujuan rt
      LEFT JOIN tujuan t ON t.id = CAST(rt.rpjmd_tujuan_id AS UNSIGNED)
      WHERE rt.rpjmd_tujuan_id IS NOT NULL
        AND TRIM(CAST(rt.rpjmd_tujuan_id AS CHAR)) <> ''
        AND CAST(rt.rpjmd_tujuan_id AS CHAR) REGEXP '^[0-9]+$'
        AND t.id IS NULL
    ) AS UNSIGNED) AS issue_count,
    'FAIL' AS status_on_issue,
    'YES' AS blocking,
    'Semua rpjmd_tujuan_id numerik harus punya parent di tujuan.id sebelum FK dibuat.' AS notes

  UNION ALL

  SELECT
    'PHASE6' AS check_group,
    'phase6_type_mismatch_renstra_tujuan_rpjmd_tujuan_id__tujuan' AS check_name,
    CAST((
      SELECT
        CASE
          WHEN NOT EXISTS(
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = DATABASE() AND table_name = 'renstra_tujuan' AND column_name = 'rpjmd_tujuan_id'
          ) THEN 1
          WHEN NOT EXISTS(
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = DATABASE() AND table_name = 'tujuan' AND column_name = 'id'
          ) THEN 1
          WHEN EXISTS(
            SELECT 1
            FROM information_schema.columns c
            JOIN information_schema.columns p
              ON p.table_schema = c.table_schema AND p.table_name = 'tujuan' AND p.column_name = 'id'
            WHERE c.table_schema = DATABASE()
              AND c.table_name = 'renstra_tujuan' AND c.column_name = 'rpjmd_tujuan_id'
              AND (
                c.data_type <> p.data_type
                OR (LOCATE('unsigned', c.column_type) > 0) <> (LOCATE('unsigned', p.column_type) > 0)
              )
          ) THEN 1
          ELSE 0
        END
    ) AS UNSIGNED) AS issue_count,
    'WARN' AS status_on_issue,
    'YES' AS blocking,
    'Jika mismatch=1, jalankan migrasi tipe (Phase 6 step 2) agar sama persis dengan tujuan.id.' AS notes
) s
ORDER BY s.check_group, s.check_name;

/* ============================================================
   3) Final decision
============================================================ */
SELECT
  CASE
    WHEN (
      (SELECT COUNT(*) FROM renstra_tujuan
       WHERE rpjmd_tujuan_id IS NOT NULL
         AND (
           TRIM(CAST(rpjmd_tujuan_id AS CHAR)) = ''
           OR CAST(rpjmd_tujuan_id AS CHAR) NOT REGEXP '^[0-9]+$'
         )
      )
      +
      (SELECT COUNT(*)
       FROM renstra_tujuan rt
       LEFT JOIN tujuan t ON t.id = CAST(rt.rpjmd_tujuan_id AS UNSIGNED)
       WHERE rt.rpjmd_tujuan_id IS NOT NULL
         AND TRIM(CAST(rt.rpjmd_tujuan_id AS CHAR)) <> ''
         AND CAST(rt.rpjmd_tujuan_id AS CHAR) REGEXP '^[0-9]+$'
         AND t.id IS NULL
      )
    ) > 0 THEN 'NOT_READY_PHASE6'
    WHEN (
      SELECT
        CASE
          WHEN EXISTS(
            SELECT 1
            FROM information_schema.columns c
            JOIN information_schema.columns p
              ON p.table_schema = c.table_schema AND p.table_name = 'tujuan' AND p.column_name = 'id'
            WHERE c.table_schema = DATABASE()
              AND c.table_name = 'renstra_tujuan' AND c.column_name = 'rpjmd_tujuan_id'
              AND (
                c.data_type <> p.data_type
                OR (LOCATE('unsigned', c.column_type) > 0) <> (LOCATE('unsigned', p.column_type) > 0)
              )
          ) THEN 1
          ELSE 0
        END
    ) = 1 THEN 'NEEDS_TYPE_MIGRATION'
    ELSE 'READY_FOR_FK_PHASE6'
  END AS final_decision;

