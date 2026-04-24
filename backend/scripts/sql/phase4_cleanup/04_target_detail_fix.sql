/*
  Phase 4 — Renstra Target Detail fix
  Target:
  - Dedupe renstra_target_detail per (renstra_target_id, tahun, level)
  - Backfill detail tahunan yang missing (berdasarkan renstra_opd.tahun_mulai..tahun_akhir)

  Catatan:
  - Untuk backfill, default target_value = 0.
  - Level yang di-backfill mengikuti level yang sudah ada per target.
    Jika target belum punya detail sama sekali, dibuat 1 baris per tahun dengan level NULL.
*/

/* ============================================================
   0) REPORT duplicates
============================================================ */
SELECT COUNT(*) AS dup_groups
FROM (
  SELECT renstra_target_id, tahun, level, COUNT(*) AS c
  FROM renstra_target_detail
  GROUP BY renstra_target_id, tahun, level
  HAVING c > 1
) x;

/* ============================================================
   1) APPLY dedupe (keep MIN(id))
   NOTE: asumsi kolom `id` ada (umum untuk table timestamps).
============================================================ */
-- START TRANSACTION;

-- DELETE d
-- FROM renstra_target_detail d
-- JOIN (
--   SELECT MIN(id) AS keep_id, renstra_target_id, tahun, level
--   FROM renstra_target_detail
--   GROUP BY renstra_target_id, tahun, level
--   HAVING COUNT(*) > 1
-- ) g ON g.renstra_target_id = d.renstra_target_id
--    AND g.tahun = d.tahun
--    AND ( (g.level IS NULL AND d.level IS NULL) OR g.level = d.level )
-- WHERE d.id <> g.keep_id;

-- COMMIT;

/* ============================================================
   2) REPORT incomplete (harus turun)
============================================================ */
SELECT COUNT(*) AS renstra_target_details_incomplete
FROM (
  SELECT
    rt.id,
    (ro.tahun_akhir - ro.tahun_mulai + 1) AS expected_years,
    COUNT(DISTINCT d.tahun) AS actual_years
  FROM renstra_target rt
  JOIN indikator_renstra ir ON ir.id = rt.indikator_id
  JOIN renstra_opd ro ON ro.id = ir.renstra_id
  LEFT JOIN renstra_target_detail d ON d.renstra_target_id = rt.id
  GROUP BY rt.id, expected_years
  HAVING expected_years BETWEEN 1 AND 10
     AND actual_years < expected_years
) x;

/* ============================================================
   3) APPLY backfill missing years (max 10 tahun)
   Teknik: tabel angka 0..9 untuk generate tahun.
============================================================ */
-- START TRANSACTION;

-- INSERT INTO renstra_target_detail (renstra_target_id, level, tahun, target_value)
-- SELECT
--   rt.id AS renstra_target_id,
--   lv.level AS level,
--   (ro.tahun_mulai + seq.n) AS tahun,
--   0 AS target_value
-- FROM renstra_target rt
-- JOIN indikator_renstra ir ON ir.id = rt.indikator_id
-- JOIN renstra_opd ro ON ro.id = ir.renstra_id
-- JOIN (
--   SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
--   UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
-- ) seq ON (ro.tahun_mulai + seq.n) <= ro.tahun_akhir
-- LEFT JOIN (
--   SELECT renstra_target_id, level
--   FROM renstra_target_detail
--   GROUP BY renstra_target_id, level
-- ) lv ON lv.renstra_target_id = rt.id
-- LEFT JOIN renstra_target_detail d ON d.renstra_target_id = rt.id
--   AND d.tahun = (ro.tahun_mulai + seq.n)
--   AND ( (d.level IS NULL AND lv.level IS NULL) OR d.level = lv.level )
-- WHERE (ro.tahun_akhir - ro.tahun_mulai) BETWEEN 0 AND 9
--   AND d.renstra_target_id IS NULL;

-- COMMIT;

/* ============================================================
   4) REPORT ulang incomplete (target: 0)
============================================================ */
SELECT COUNT(*) AS renstra_target_details_incomplete_after
FROM (
  SELECT
    rt.id,
    (ro.tahun_akhir - ro.tahun_mulai + 1) AS expected_years,
    COUNT(DISTINCT d.tahun) AS actual_years
  FROM renstra_target rt
  JOIN indikator_renstra ir ON ir.id = rt.indikator_id
  JOIN renstra_opd ro ON ro.id = ir.renstra_id
  LEFT JOIN renstra_target_detail d ON d.renstra_target_id = rt.id
  GROUP BY rt.id, expected_years
  HAVING expected_years BETWEEN 1 AND 10
     AND actual_years < expected_years
) x;
