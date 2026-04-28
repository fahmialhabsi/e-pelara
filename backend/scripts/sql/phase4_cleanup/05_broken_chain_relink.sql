/*
  Phase 4 — Broken Chain Relink (SAFE by default)
  Fokus: memperbaiki mismatch lintas RPJMD ↔ Renstra yang tidak bisa diselesaikan hanya dengan FK.

  Kasus yang ditangani:
  1) mismatch_renstra_sasaran_vs_tujuan_rpjmd
     renstra_sasaran.tujuan_id (RenstraTujuan) harus konsisten dengan parent tujuan_id dari sasaran RPJMD.
  2) mismatch_renstra_strategi_vs_sasaran_rpjmd
     renstra_strategi.sasaran_id (RenstraSasaran) harus konsisten dengan parent sasaran_id dari strategi RPJMD.

  Prinsip aman:
  - Default read-only: DML (UPDATE/INSERT) dikomentari.
  - Auto-relink hanya jika kandidat parent unik (candidate_count = 1).
  - Jika kandidat tidak ada / ambigu, hasilkan list untuk mapping manual.
*/

/* ============================================================
   0) REPORT mismatch counts (harus 0 setelah fix)
============================================================ */
SELECT COUNT(*) AS mismatch_renstra_sasaran_vs_tujuan_rpjmd
FROM renstra_sasaran rs
JOIN renstra_tujuan rt ON rt.id = rs.tujuan_id
JOIN sasaran s ON s.id = rs.rpjmd_sasaran_id
WHERE CAST(rt.rpjmd_tujuan_id AS CHAR) REGEXP '^[0-9]+$'
  AND s.tujuan_id IS NOT NULL
  AND s.tujuan_id <> CAST(rt.rpjmd_tujuan_id AS UNSIGNED);

SELECT COUNT(*) AS mismatch_renstra_strategi_vs_sasaran_rpjmd
FROM renstra_strategi rstr
JOIN renstra_sasaran rs ON rs.id = rstr.sasaran_id
JOIN strategi st ON st.id = rstr.rpjmd_strategi_id
WHERE rs.rpjmd_sasaran_id IS NOT NULL
  AND st.sasaran_id IS NOT NULL
  AND st.sasaran_id <> rs.rpjmd_sasaran_id;

/* ============================================================
   1) DETAIL report — mismatch Renstra Sasaran
============================================================ */
SELECT
  rs.id AS renstra_sasaran_id,
  rs.renstra_id,
  rs.tujuan_id AS renstra_tujuan_id,
  rt.rpjmd_tujuan_id AS rpjmd_tujuan_dari_renstra_tujuan,
  rs.rpjmd_sasaran_id,
  s.tujuan_id AS tujuan_id_dari_sasaran_rpjmd
FROM renstra_sasaran rs
JOIN renstra_tujuan rt ON rt.id = rs.tujuan_id
JOIN sasaran s ON s.id = rs.rpjmd_sasaran_id
WHERE CAST(rt.rpjmd_tujuan_id AS CHAR) REGEXP '^[0-9]+$'
  AND s.tujuan_id IS NOT NULL
  AND s.tujuan_id <> CAST(rt.rpjmd_tujuan_id AS UNSIGNED)
ORDER BY rs.renstra_id, rs.id
LIMIT 200;

/* ============================================================
   2) AUTO-RELINK — Renstra Sasaran: cari RenstraTujuan yang benar
   Kunci: (rs.renstra_id, sasaran.tujuan_id) harus match ke renstra_tujuan.(renstra_id, rpjmd_tujuan_id)
============================================================ */
DROP TEMPORARY TABLE IF EXISTS tmp_fix_rs_tujuan;
CREATE TEMPORARY TABLE tmp_fix_rs_tujuan AS
SELECT
  rs.id AS renstra_sasaran_id,
  rs.renstra_id,
  rs.tujuan_id AS old_renstra_tujuan_id,
  s.tujuan_id AS expected_rpjmd_tujuan_id,
  MIN(rt2.id) AS new_renstra_tujuan_id,
  COUNT(DISTINCT rt2.id) AS candidate_count
FROM renstra_sasaran rs
JOIN renstra_tujuan rt ON rt.id = rs.tujuan_id
JOIN sasaran s ON s.id = rs.rpjmd_sasaran_id
LEFT JOIN renstra_tujuan rt2
  ON rt2.renstra_id = rs.renstra_id
 AND CAST(rt2.rpjmd_tujuan_id AS CHAR) REGEXP '^[0-9]+$'
 AND CAST(rt2.rpjmd_tujuan_id AS UNSIGNED) = s.tujuan_id
WHERE CAST(rt.rpjmd_tujuan_id AS CHAR) REGEXP '^[0-9]+$'
  AND s.tujuan_id IS NOT NULL
  AND s.tujuan_id <> CAST(rt.rpjmd_tujuan_id AS UNSIGNED)
GROUP BY rs.id, rs.renstra_id, rs.tujuan_id, s.tujuan_id;

/* Kandidat unik yang bisa auto-relink */
SELECT COUNT(*) AS rs_auto_relink_ready
FROM tmp_fix_rs_tujuan
WHERE candidate_count = 1
  AND new_renstra_tujuan_id IS NOT NULL
  AND new_renstra_tujuan_id <> old_renstra_tujuan_id;

/* Unresolved: kandidat 0 (RenstraTujuan target belum ada) atau ambigu */
SELECT *
FROM tmp_fix_rs_tujuan
WHERE candidate_count <> 1
   OR new_renstra_tujuan_id IS NULL
ORDER BY renstra_id, renstra_sasaran_id
LIMIT 200;

/* APPLY (jalankan dalam transaksi; default dikomentari) */
-- START TRANSACTION;
-- UPDATE renstra_sasaran rs
-- JOIN tmp_fix_rs_tujuan m ON m.renstra_sasaran_id = rs.id
-- SET rs.tujuan_id = m.new_renstra_tujuan_id
-- WHERE m.candidate_count = 1
--   AND m.new_renstra_tujuan_id IS NOT NULL
--   AND m.new_renstra_tujuan_id <> m.old_renstra_tujuan_id;
-- COMMIT;

/* ============================================================
   2b) ALTERNATIVE FIX (deterministik) — Perbaiki renstra_tujuan.rpjmd_tujuan_id
   Jika sebuah RenstraTujuan dipakai oleh banyak RenstraSasaran namun SEMUA rpjmd_sasaran_id-nya
   menunjuk ke 1 tujuan RPJMD yang sama, maka rpjmd_tujuan_id pada RenstraTujuan kemungkinan salah
   dan bisa dibetulkan tanpa membuat RenstraTujuan baru.

   Catatan:
   - Ini tidak mengubah link rs.tujuan_id; hanya memperbaiki "label" rpjmd_tujuan_id pada RenstraTujuan.
============================================================ */
DROP TEMPORARY TABLE IF EXISTS tmp_fix_rt_rpjmd_tujuan_id;
CREATE TEMPORARY TABLE tmp_fix_rt_rpjmd_tujuan_id AS
SELECT
  rt.id AS renstra_tujuan_id,
  rt.renstra_id,
  CAST(rt.rpjmd_tujuan_id AS CHAR) AS old_rpjmd_tujuan_id_raw,
  MIN(s.tujuan_id) AS expected_rpjmd_tujuan_id,
  COUNT(DISTINCT s.tujuan_id) AS expected_distinct_count,
  SUM(
    CASE
      WHEN rs.rpjmd_sasaran_id IS NULL OR s.id IS NULL OR s.tujuan_id IS NULL THEN 1
      ELSE 0
    END
  ) AS incomplete_rows
FROM renstra_tujuan rt
JOIN renstra_sasaran rs ON rs.tujuan_id = rt.id
LEFT JOIN sasaran s ON s.id = rs.rpjmd_sasaran_id
GROUP BY rt.id, rt.renstra_id, CAST(rt.rpjmd_tujuan_id AS CHAR);

/* Kandidat yang aman: expected_distinct_count = 1 dan old numerik tapi beda */
SELECT
  renstra_tujuan_id,
  renstra_id,
  old_rpjmd_tujuan_id_raw,
  expected_rpjmd_tujuan_id,
  expected_distinct_count,
  incomplete_rows
FROM tmp_fix_rt_rpjmd_tujuan_id
WHERE expected_distinct_count = 1
  AND CAST(old_rpjmd_tujuan_id_raw AS CHAR) REGEXP '^[0-9]+$'
  AND CAST(old_rpjmd_tujuan_id_raw AS UNSIGNED) <> expected_rpjmd_tujuan_id
ORDER BY renstra_id, renstra_tujuan_id
LIMIT 200;

/* APPLY (jalankan dalam transaksi; default dikomentari) */
-- START TRANSACTION;
-- UPDATE renstra_tujuan rt
-- JOIN tmp_fix_rt_rpjmd_tujuan_id m ON m.renstra_tujuan_id = rt.id
-- SET rt.rpjmd_tujuan_id = m.expected_rpjmd_tujuan_id
-- WHERE m.expected_distinct_count = 1
--   AND m.old_rpjmd_tujuan_id_raw REGEXP '^[0-9]+$'
--   AND CAST(m.old_rpjmd_tujuan_id_raw AS UNSIGNED) <> m.expected_rpjmd_tujuan_id;
-- COMMIT;

/* ============================================================
   3) DETAIL report — mismatch Renstra Strategi
============================================================ */
SELECT
  rstr.id AS renstra_strategi_id,
  rstr.renstra_id,
  rstr.sasaran_id AS renstra_sasaran_id,
  rs.rpjmd_sasaran_id AS rpjmd_sasaran_dari_renstra_sasaran,
  rstr.rpjmd_strategi_id,
  st.sasaran_id AS sasaran_id_dari_strategi_rpjmd
FROM renstra_strategi rstr
JOIN renstra_sasaran rs ON rs.id = rstr.sasaran_id
JOIN strategi st ON st.id = rstr.rpjmd_strategi_id
WHERE rs.rpjmd_sasaran_id IS NOT NULL
  AND st.sasaran_id IS NOT NULL
  AND st.sasaran_id <> rs.rpjmd_sasaran_id
ORDER BY rstr.renstra_id, rstr.id
LIMIT 200;

/* ============================================================
   4) AUTO-RELINK — Renstra Strategi: pindahkan ke RenstraSasaran yang benar
   Kunci: (rstr.renstra_id, strategi.sasaran_id) harus match ke renstra_sasaran.(renstra_id, rpjmd_sasaran_id)
============================================================ */
DROP TEMPORARY TABLE IF EXISTS tmp_fix_rstr_sasaran;
CREATE TEMPORARY TABLE tmp_fix_rstr_sasaran AS
SELECT
  rstr.id AS renstra_strategi_id,
  rstr.renstra_id,
  rstr.sasaran_id AS old_renstra_sasaran_id,
  st.sasaran_id AS expected_rpjmd_sasaran_id,
  MIN(rs2.id) AS new_renstra_sasaran_id,
  COUNT(DISTINCT rs2.id) AS candidate_count
FROM renstra_strategi rstr
JOIN renstra_sasaran rs ON rs.id = rstr.sasaran_id
JOIN strategi st ON st.id = rstr.rpjmd_strategi_id
LEFT JOIN renstra_sasaran rs2
  ON rs2.renstra_id = rstr.renstra_id
 AND rs2.rpjmd_sasaran_id = st.sasaran_id
WHERE rs.rpjmd_sasaran_id IS NOT NULL
  AND st.sasaran_id IS NOT NULL
  AND st.sasaran_id <> rs.rpjmd_sasaran_id
GROUP BY rstr.id, rstr.renstra_id, rstr.sasaran_id, st.sasaran_id;

SELECT COUNT(*) AS rstr_auto_relink_ready
FROM tmp_fix_rstr_sasaran
WHERE candidate_count = 1
  AND new_renstra_sasaran_id IS NOT NULL
  AND new_renstra_sasaran_id <> old_renstra_sasaran_id;

/* Unresolved: RenstraSasaran target belum ada / ambigu */
SELECT *
FROM tmp_fix_rstr_sasaran
WHERE candidate_count <> 1
   OR new_renstra_sasaran_id IS NULL
ORDER BY renstra_id, renstra_strategi_id
LIMIT 200;

/* APPLY (jalankan dalam transaksi; default dikomentari) */
-- START TRANSACTION;
-- UPDATE renstra_strategi rstr
-- JOIN tmp_fix_rstr_sasaran m ON m.renstra_strategi_id = rstr.id
-- SET rstr.sasaran_id = m.new_renstra_sasaran_id
-- WHERE m.candidate_count = 1
--   AND m.new_renstra_sasaran_id IS NOT NULL
--   AND m.new_renstra_sasaran_id <> m.old_renstra_sasaran_id;
-- COMMIT;

/* ============================================================
   5) REPORT ulang (target: 0)
============================================================ */
SELECT COUNT(*) AS mismatch_renstra_sasaran_vs_tujuan_rpjmd_after
FROM renstra_sasaran rs
JOIN renstra_tujuan rt ON rt.id = rs.tujuan_id
JOIN sasaran s ON s.id = rs.rpjmd_sasaran_id
WHERE CAST(rt.rpjmd_tujuan_id AS CHAR) REGEXP '^[0-9]+$'
  AND s.tujuan_id IS NOT NULL
  AND s.tujuan_id <> CAST(rt.rpjmd_tujuan_id AS UNSIGNED);

SELECT COUNT(*) AS mismatch_renstra_strategi_vs_sasaran_rpjmd_after
FROM renstra_strategi rstr
JOIN renstra_sasaran rs ON rs.id = rstr.sasaran_id
JOIN strategi st ON st.id = rstr.rpjmd_strategi_id
WHERE rs.rpjmd_sasaran_id IS NOT NULL
  AND st.sasaran_id IS NOT NULL
  AND st.sasaran_id <> rs.rpjmd_sasaran_id;
