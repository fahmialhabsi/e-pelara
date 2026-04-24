/*
  Phase 4 — Renstra (legacy) chain cleanup

  Target utama:
  - Pastikan semua `renstra_*` mengarah ke parent yang ada:
    renstra_tujuan/renstra_sasaran/renstra_strategi/renstra_kebijakan/renstra_program/renstra_kegiatan -> renstra_opd
  - Pastikan relasi internal renstra:
    renstra_kegiatan.program_id -> renstra_program
    renstra_subkegiatan.renstra_program_id -> renstra_program
    renstra_subkegiatan.kegiatan_id -> renstra_kegiatan
    renstra_subkegiatan.sub_kegiatan_id -> sub_kegiatan

  Catatan besar:
  - Orphan `renstra_id` biasanya terjadi karena renstra_opd lama dihapus/diganti id.
    Solusi aman: map old_renstra_id -> new_renstra_id (manual, tapi terkontrol).
*/

/* ============================================================
   0) REPORT orphan renstra_id (missing renstra_opd)
============================================================ */
SELECT COUNT(*) AS orphan_renstra_tujuan_no_opd
FROM renstra_tujuan rt
LEFT JOIN renstra_opd ro ON ro.id = rt.renstra_id
WHERE rt.renstra_id IS NOT NULL AND ro.id IS NULL;

SELECT COUNT(*) AS orphan_renstra_sasaran_no_opd
FROM renstra_sasaran rs
LEFT JOIN renstra_opd ro ON ro.id = rs.renstra_id
WHERE rs.renstra_id IS NOT NULL AND ro.id IS NULL;

SELECT COUNT(*) AS orphan_renstra_strategi_no_opd
FROM renstra_strategi rstr
LEFT JOIN renstra_opd ro ON ro.id = rstr.renstra_id
WHERE rstr.renstra_id IS NOT NULL AND ro.id IS NULL;

SELECT COUNT(*) AS orphan_renstra_kebijakan_no_opd
FROM renstra_kebijakan rk
LEFT JOIN renstra_opd ro ON ro.id = rk.renstra_id
WHERE rk.renstra_id IS NOT NULL AND ro.id IS NULL;

SELECT COUNT(*) AS orphan_renstra_program_no_opd
FROM renstra_program rp
LEFT JOIN renstra_opd ro ON ro.id = rp.renstra_id
WHERE rp.renstra_id IS NOT NULL AND ro.id IS NULL;

SELECT COUNT(*) AS orphan_renstra_kegiatan_no_opd
FROM renstra_kegiatan rk
LEFT JOIN renstra_opd ro ON ro.id = rk.renstra_id
WHERE rk.renstra_id IS NOT NULL AND ro.id IS NULL;

/* ============================================================
   1) SUGGEST candidates untuk mapping renstra_id
   Output: daftar old_renstra_id + "label OPD" best-effort
============================================================ */
SELECT
  x.old_renstra_id,
  x.program_rows,
  x.kegiatan_rows,
  x.subkegiatan_rows,
  x.opd_label_guess
FROM (
  SELECT
    old.renstra_id AS old_renstra_id,
    SUM(old.is_program) AS program_rows,
    SUM(old.is_kegiatan) AS kegiatan_rows,
    SUM(old.is_subkegiatan) AS subkegiatan_rows,
    COALESCE(
      MAX(NULLIF(TRIM(old.nama_opd), '')),
      MAX(NULLIF(TRIM(old.opd_penanggung_jawab), ''))
    ) AS opd_label_guess
  FROM (
    SELECT rp.renstra_id, 1 AS is_program, 0 AS is_kegiatan, 0 AS is_subkegiatan,
           NULL AS nama_opd,
           rp.opd_penanggung_jawab
    FROM renstra_program rp
    LEFT JOIN renstra_opd ro ON ro.id = rp.renstra_id
    WHERE rp.renstra_id IS NOT NULL AND ro.id IS NULL

    UNION ALL

    SELECT rk.renstra_id, 0, 1, 0,
           NULL,
           NULL
    FROM renstra_kegiatan rk
    LEFT JOIN renstra_opd ro ON ro.id = rk.renstra_id
    WHERE rk.renstra_id IS NOT NULL AND ro.id IS NULL

    UNION ALL

    SELECT rp.renstra_id, 0, 0, 1,
           rsk.nama_opd,
           NULL
    FROM renstra_subkegiatan rsk
    JOIN renstra_program rp ON rp.id = rsk.renstra_program_id
    LEFT JOIN renstra_opd ro ON ro.id = rp.renstra_id
    WHERE rp.renstra_id IS NOT NULL AND ro.id IS NULL
  ) old
  GROUP BY old.renstra_id
) x
ORDER BY x.old_renstra_id;

/* ============================================================
   2) TEMPLATE mapping old_renstra_id -> new_renstra_id
============================================================ */
/*
CREATE TABLE IF NOT EXISTS phase4_map_renstra_id (
  old_renstra_id INT PRIMARY KEY,
  new_renstra_id INT NOT NULL,
  note VARCHAR(255) NULL
);

-- Isi mapping berdasarkan kandidat renstra_opd yang benar (lihat tabel renstra_opd).
-- INSERT INTO phase4_map_renstra_id (old_renstra_id, new_renstra_id, note) VALUES
-- (999, 123, 'OPD sama, periode sama; id lama hilang setelah import ulang');

-- Validasi referensi:
SELECT m.*
FROM phase4_map_renstra_id m
LEFT JOIN renstra_opd ro ON ro.id = m.new_renstra_id
WHERE ro.id IS NULL;

-- APPLY (jalankan dalam transaksi):
START TRANSACTION;
UPDATE renstra_program rp JOIN phase4_map_renstra_id m ON m.old_renstra_id = rp.renstra_id
SET rp.renstra_id = m.new_renstra_id;
UPDATE renstra_kegiatan rk JOIN phase4_map_renstra_id m ON m.old_renstra_id = rk.renstra_id
SET rk.renstra_id = m.new_renstra_id;
UPDATE renstra_tujuan rt JOIN phase4_map_renstra_id m ON m.old_renstra_id = rt.renstra_id
SET rt.renstra_id = m.new_renstra_id;
UPDATE renstra_sasaran rs JOIN phase4_map_renstra_id m ON m.old_renstra_id = rs.renstra_id
SET rs.renstra_id = m.new_renstra_id;
UPDATE renstra_strategi rstr JOIN phase4_map_renstra_id m ON m.old_renstra_id = rstr.renstra_id
SET rstr.renstra_id = m.new_renstra_id;
UPDATE renstra_kebijakan rk JOIN phase4_map_renstra_id m ON m.old_renstra_id = rk.renstra_id
SET rk.renstra_id = m.new_renstra_id;
COMMIT;
*/

/* ============================================================
   3) AUTO-RELINK renstra_kegiatan.program_id (renstra_program) via rpjmd_kegiatan_id -> kegiatan.program_id
============================================================ */
-- report orphan renstra_kegiatan.program_id
SELECT COUNT(*) AS orphan_renstra_kegiatan_no_program_renstra
FROM renstra_kegiatan rk
LEFT JOIN renstra_program rp ON rp.id = rk.program_id
WHERE rk.program_id IS NOT NULL AND rp.id IS NULL;

DROP TEMPORARY TABLE IF EXISTS tmp_relink_renstra_kegiatan_program;
CREATE TEMPORARY TABLE tmp_relink_renstra_kegiatan_program AS
SELECT
  rk.id AS renstra_kegiatan_id,
  MIN(rp.id) AS new_renstra_program_id,
  COUNT(DISTINCT rp.id) AS candidate_count
FROM renstra_kegiatan rk
JOIN kegiatan k ON k.id = rk.rpjmd_kegiatan_id
JOIN renstra_program rp ON rp.renstra_id = rk.renstra_id
  AND rp.rpjmd_program_id = k.program_id
LEFT JOIN renstra_program rp_old ON rp_old.id = rk.program_id
WHERE rk.program_id IS NOT NULL
  AND rp_old.id IS NULL
GROUP BY rk.id
HAVING candidate_count = 1;

SELECT COUNT(*) AS renstra_kegiatan_auto_relink_count FROM tmp_relink_renstra_kegiatan_program;

-- START TRANSACTION;
-- UPDATE renstra_kegiatan rk
-- JOIN tmp_relink_renstra_kegiatan_program m ON m.renstra_kegiatan_id = rk.id
-- SET rk.program_id = m.new_renstra_program_id;
-- COMMIT;

/* ============================================================
   4) AUTO-RELINK renstra_subkegiatan (dua sisi)
   4a) Perbaiki kegiatan_id (renstra_kegiatan) jika renstra_program_id valid
============================================================ */
SELECT COUNT(*) AS orphan_renstra_subkegiatan_no_kegiatan_renstra
FROM renstra_subkegiatan rsk
LEFT JOIN renstra_kegiatan rk ON rk.id = rsk.kegiatan_id
WHERE rsk.kegiatan_id IS NOT NULL AND rk.id IS NULL;

DROP TEMPORARY TABLE IF EXISTS tmp_relink_renstra_subkegiatan_kegiatan;
CREATE TEMPORARY TABLE tmp_relink_renstra_subkegiatan_kegiatan AS
SELECT
  rsk.id AS renstra_subkegiatan_id,
  MIN(rk.id) AS new_renstra_kegiatan_id,
  COUNT(DISTINCT rk.id) AS candidate_count
FROM renstra_subkegiatan rsk
JOIN renstra_program rp ON rp.id = rsk.renstra_program_id
JOIN sub_kegiatan sk ON sk.id = rsk.sub_kegiatan_id
JOIN kegiatan k ON k.id = sk.kegiatan_id
JOIN renstra_kegiatan rk ON rk.renstra_id = rp.renstra_id
  AND rk.rpjmd_kegiatan_id = k.id
LEFT JOIN renstra_kegiatan rk_old ON rk_old.id = rsk.kegiatan_id
WHERE rsk.kegiatan_id IS NOT NULL
  AND rk_old.id IS NULL
GROUP BY rsk.id
HAVING candidate_count = 1;

SELECT COUNT(*) AS renstra_subkegiatan_kegiatan_auto_relink_count FROM tmp_relink_renstra_subkegiatan_kegiatan;

-- START TRANSACTION;
-- UPDATE renstra_subkegiatan rsk
-- JOIN tmp_relink_renstra_subkegiatan_kegiatan m ON m.renstra_subkegiatan_id = rsk.id
-- SET rsk.kegiatan_id = m.new_renstra_kegiatan_id;
-- COMMIT;

/* ============================================================
   4b) Perbaiki renstra_program_id jika kegiatan_id valid
============================================================ */
SELECT COUNT(*) AS orphan_renstra_subkegiatan_no_program_renstra
FROM renstra_subkegiatan rsk
LEFT JOIN renstra_program rp ON rp.id = rsk.renstra_program_id
WHERE rsk.renstra_program_id IS NOT NULL AND rp.id IS NULL;

DROP TEMPORARY TABLE IF EXISTS tmp_relink_renstra_subkegiatan_program;
CREATE TEMPORARY TABLE tmp_relink_renstra_subkegiatan_program AS
SELECT
  rsk.id AS renstra_subkegiatan_id,
  MIN(rp.id) AS new_renstra_program_id,
  COUNT(DISTINCT rp.id) AS candidate_count
FROM renstra_subkegiatan rsk
JOIN renstra_kegiatan rk ON rk.id = rsk.kegiatan_id
JOIN sub_kegiatan sk ON sk.id = rsk.sub_kegiatan_id
JOIN kegiatan k ON k.id = sk.kegiatan_id
JOIN renstra_program rp ON rp.renstra_id = rk.renstra_id
  AND rp.rpjmd_program_id = k.program_id
LEFT JOIN renstra_program rp_old ON rp_old.id = rsk.renstra_program_id
WHERE rsk.renstra_program_id IS NOT NULL
  AND rp_old.id IS NULL
GROUP BY rsk.id
HAVING candidate_count = 1;

SELECT COUNT(*) AS renstra_subkegiatan_program_auto_relink_count FROM tmp_relink_renstra_subkegiatan_program;

-- START TRANSACTION;
-- UPDATE renstra_subkegiatan rsk
-- JOIN tmp_relink_renstra_subkegiatan_program m ON m.renstra_subkegiatan_id = rsk.id
-- SET rsk.renstra_program_id = m.new_renstra_program_id;
-- COMMIT;

/* ============================================================
   5) UNRESOLVED orphan lists (untuk mapping manual / delete terakhir)
============================================================ */
-- renstra_program tanpa parent renstra_opd (setelah mapping, harus 0)
SELECT rp.id, rp.renstra_id, rp.kode_program, rp.nama_program, rp.rpjmd_program_id
FROM renstra_program rp
LEFT JOIN renstra_opd ro ON ro.id = rp.renstra_id
WHERE rp.renstra_id IS NOT NULL AND ro.id IS NULL
ORDER BY rp.id
LIMIT 200;

-- renstra_subkegiatan tanpa master sub_kegiatan
SELECT COUNT(*) AS orphan_renstra_subkegiatan_no_sub_kegiatan_master
FROM renstra_subkegiatan rsk
LEFT JOIN sub_kegiatan sk ON sk.id = rsk.sub_kegiatan_id
WHERE rsk.sub_kegiatan_id IS NOT NULL AND sk.id IS NULL;

SELECT rsk.id, rsk.sub_kegiatan_id, rsk.kode_sub_kegiatan, rsk.nama_sub_kegiatan
FROM renstra_subkegiatan rsk
LEFT JOIN sub_kegiatan sk ON sk.id = rsk.sub_kegiatan_id
WHERE rsk.sub_kegiatan_id IS NOT NULL AND sk.id IS NULL
ORDER BY rsk.id
LIMIT 200;
