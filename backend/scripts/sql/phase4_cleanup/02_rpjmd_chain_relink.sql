/*
  Phase 4 — RPJMD Chain Cleanup (relink-first)

  Target:
  - sasaran -> tujuan
  - strategi -> sasaran
  - arah_kebijakan -> strategi
  - program -> sasaran
  - kegiatan -> program
  - sub_kegiatan -> kegiatan

  Pola:
  1) REPORT orphan
  2) AUTO-RELINK yang deterministik (berbasis cascading / master_* / pivot)
  3) LIST unresolved -> siapkan mapping manual

  Catatan:
  - Banyak kolom legacy NOT NULL, jadi fallback "set NULL" sering tidak bisa.
  - Untuk update, jalankan dalam transaksi.
*/

/* ============================================================
   0) REPORT orphan inti (RPJMD chain)
============================================================ */
SELECT COUNT(*) AS orphan_sasaran_no_tujuan
FROM sasaran s
LEFT JOIN tujuan t ON t.id = s.tujuan_id
WHERE s.tujuan_id IS NOT NULL AND t.id IS NULL;

SELECT COUNT(*) AS orphan_strategi_no_sasaran
FROM strategi st
LEFT JOIN sasaran s ON s.id = st.sasaran_id
WHERE st.sasaran_id IS NOT NULL AND s.id IS NULL;

SELECT COUNT(*) AS orphan_arah_no_strategi
FROM arah_kebijakan a
LEFT JOIN strategi st ON st.id = a.strategi_id
WHERE a.strategi_id IS NOT NULL AND st.id IS NULL;

SELECT COUNT(*) AS orphan_program_no_sasaran
FROM program p
LEFT JOIN sasaran s ON s.id = p.sasaran_id
WHERE p.sasaran_id IS NOT NULL AND s.id IS NULL;

SELECT COUNT(*) AS orphan_kegiatan_no_program
FROM kegiatan k
LEFT JOIN program p ON p.id = k.program_id
WHERE k.program_id IS NOT NULL AND p.id IS NULL;

SELECT COUNT(*) AS orphan_subkegiatan_no_kegiatan
FROM sub_kegiatan sk
LEFT JOIN kegiatan k ON k.id = sk.kegiatan_id
WHERE sk.kegiatan_id IS NOT NULL AND k.id IS NULL;

/* ============================================================
   1) AUTO-RELINK (deterministik)
   1a) sasaran.tujuan_id dari tabel `cascading` (jika unik)
============================================================ */
DROP TEMPORARY TABLE IF EXISTS tmp_relink_sasaran_tujuan;
CREATE TEMPORARY TABLE tmp_relink_sasaran_tujuan AS
SELECT
  s.id AS sasaran_id,
  MIN(c.tujuan_id) AS new_tujuan_id,
  COUNT(DISTINCT c.tujuan_id) AS candidate_count
FROM sasaran s
JOIN cascading c ON c.sasaran_id = s.id
JOIN tujuan t ON t.id = c.tujuan_id
LEFT JOIN tujuan t_old ON t_old.id = s.tujuan_id
WHERE s.tujuan_id IS NOT NULL
  AND t_old.id IS NULL
GROUP BY s.id
HAVING candidate_count = 1;

SELECT COUNT(*) AS sasaran_auto_relink_count FROM tmp_relink_sasaran_tujuan;

-- START TRANSACTION;
-- UPDATE sasaran s
-- JOIN tmp_relink_sasaran_tujuan m ON m.sasaran_id = s.id
-- SET s.tujuan_id = m.new_tujuan_id;
-- COMMIT;

/* ============================================================
   1b) strategi.sasaran_id dari cascading_strategi -> cascading.sasaran_id (jika unik)
============================================================ */
DROP TEMPORARY TABLE IF EXISTS tmp_relink_strategi_sasaran;
CREATE TEMPORARY TABLE tmp_relink_strategi_sasaran AS
SELECT
  st.id AS strategi_id,
  MIN(c.sasaran_id) AS new_sasaran_id,
  COUNT(DISTINCT c.sasaran_id) AS candidate_count
FROM strategi st
JOIN cascading_strategi cs ON cs.strategi_id = st.id
JOIN cascading c ON c.id = cs.cascading_id
JOIN sasaran s ON s.id = c.sasaran_id
LEFT JOIN sasaran s_old ON s_old.id = st.sasaran_id
WHERE st.sasaran_id IS NOT NULL
  AND s_old.id IS NULL
GROUP BY st.id
HAVING candidate_count = 1;

SELECT COUNT(*) AS strategi_auto_relink_count FROM tmp_relink_strategi_sasaran;

-- START TRANSACTION;
-- UPDATE strategi st
-- JOIN tmp_relink_strategi_sasaran m ON m.strategi_id = st.id
-- SET st.sasaran_id = m.new_sasaran_id;
-- COMMIT;

/* ============================================================
   1c) arah_kebijakan.strategi_id via cascading_arah_kebijakan -> cascading_strategi (jika unik)
============================================================ */
DROP TEMPORARY TABLE IF EXISTS tmp_relink_arah_strategi;
CREATE TEMPORARY TABLE tmp_relink_arah_strategi AS
SELECT
  a.id AS arah_id,
  MIN(cs.strategi_id) AS new_strategi_id,
  COUNT(DISTINCT cs.strategi_id) AS candidate_count
FROM arah_kebijakan a
JOIN cascading_arah_kebijakan ca ON ca.arah_kebijakan_id = a.id
JOIN cascading_strategi cs ON cs.cascading_id = ca.cascading_id
JOIN strategi st ON st.id = cs.strategi_id
LEFT JOIN strategi st_old ON st_old.id = a.strategi_id
WHERE a.strategi_id IS NOT NULL
  AND st_old.id IS NULL
GROUP BY a.id
HAVING candidate_count = 1;

SELECT COUNT(*) AS arah_auto_relink_count FROM tmp_relink_arah_strategi;

-- START TRANSACTION;
-- UPDATE arah_kebijakan a
-- JOIN tmp_relink_arah_strategi m ON m.arah_id = a.id
-- SET a.strategi_id = m.new_strategi_id;
-- COMMIT;

/* ============================================================
   1d) program.sasaran_id dari `cascading` (jika unik)
============================================================ */
DROP TEMPORARY TABLE IF EXISTS tmp_relink_program_sasaran;
CREATE TEMPORARY TABLE tmp_relink_program_sasaran AS
SELECT
  p.id AS program_id,
  MIN(c.sasaran_id) AS new_sasaran_id,
  COUNT(DISTINCT c.sasaran_id) AS candidate_count
FROM program p
JOIN cascading c ON c.program_id = p.id
JOIN sasaran s ON s.id = c.sasaran_id
LEFT JOIN sasaran s_old ON s_old.id = p.sasaran_id
WHERE p.sasaran_id IS NOT NULL
  AND s_old.id IS NULL
GROUP BY p.id
HAVING candidate_count = 1;

SELECT COUNT(*) AS program_auto_relink_count FROM tmp_relink_program_sasaran;

-- START TRANSACTION;
-- UPDATE program p
-- JOIN tmp_relink_program_sasaran m ON m.program_id = p.id
-- SET p.sasaran_id = m.new_sasaran_id;
-- COMMIT;

/* ============================================================
   1e) kegiatan.program_id via master_kegiatan -> master_program -> program.master_program_id (jika unik)
   Syarat: kegiatan.master_kegiatan_id terisi dan program.master_program_id ter-backfill.
============================================================ */
DROP TEMPORARY TABLE IF EXISTS tmp_relink_kegiatan_program;
CREATE TEMPORARY TABLE tmp_relink_kegiatan_program AS
SELECT
  k.id AS kegiatan_id,
  MIN(p.id) AS new_program_id,
  COUNT(DISTINCT p.id) AS candidate_count
FROM kegiatan k
JOIN master_kegiatan mk ON mk.id = k.master_kegiatan_id
JOIN program p ON p.master_program_id = mk.master_program_id
  AND p.periode_id = k.periode_id
LEFT JOIN program p_old ON p_old.id = k.program_id
WHERE k.program_id IS NOT NULL
  AND p_old.id IS NULL
GROUP BY k.id
HAVING candidate_count = 1;

SELECT COUNT(*) AS kegiatan_auto_relink_count FROM tmp_relink_kegiatan_program;

-- START TRANSACTION;
-- UPDATE kegiatan k
-- JOIN tmp_relink_kegiatan_program m ON m.kegiatan_id = k.id
-- SET k.program_id = m.new_program_id;
-- COMMIT;

/* ============================================================
   1f) sub_kegiatan.kegiatan_id via master_sub_kegiatan -> master_kegiatan -> kegiatan.master_kegiatan_id (jika unik)
============================================================ */
DROP TEMPORARY TABLE IF EXISTS tmp_relink_subkegiatan_kegiatan;
CREATE TEMPORARY TABLE tmp_relink_subkegiatan_kegiatan AS
SELECT
  sk.id AS sub_kegiatan_id,
  MIN(k2.id) AS new_kegiatan_id,
  COUNT(DISTINCT k2.id) AS candidate_count
FROM sub_kegiatan sk
JOIN master_sub_kegiatan msk ON msk.id = sk.master_sub_kegiatan_id
JOIN kegiatan k2 ON k2.master_kegiatan_id = msk.master_kegiatan_id
  AND k2.periode_id = sk.periode_id
  AND k2.jenis_dokumen = sk.jenis_dokumen
LEFT JOIN kegiatan k_old ON k_old.id = sk.kegiatan_id
WHERE sk.kegiatan_id IS NOT NULL
  AND k_old.id IS NULL
GROUP BY sk.id
HAVING candidate_count = 1;

SELECT COUNT(*) AS subkegiatan_auto_relink_count FROM tmp_relink_subkegiatan_kegiatan;

-- START TRANSACTION;
-- UPDATE sub_kegiatan sk
-- JOIN tmp_relink_subkegiatan_kegiatan m ON m.sub_kegiatan_id = sk.id
-- SET sk.kegiatan_id = m.new_kegiatan_id;
-- COMMIT;

/* ============================================================
   2) UNRESOLVED lists (untuk mapping manual / keputusan null/delete)
============================================================ */
-- Sasaran masih orphan
SELECT s.id, s.tujuan_id, s.nomor, s.isi_sasaran, s.tahun, s.jenis_dokumen, s.periode_id
FROM sasaran s
LEFT JOIN tujuan t ON t.id = s.tujuan_id
WHERE s.tujuan_id IS NOT NULL AND t.id IS NULL
ORDER BY s.id
LIMIT 200;

-- Strategi masih orphan
SELECT st.id, st.sasaran_id, st.kode_strategi, st.deskripsi, st.tahun, st.jenis_dokumen, st.periode_id
FROM strategi st
LEFT JOIN sasaran s ON s.id = st.sasaran_id
WHERE st.sasaran_id IS NOT NULL AND s.id IS NULL
ORDER BY st.id
LIMIT 200;

-- Arah kebijakan masih orphan
SELECT a.id, a.strategi_id, a.kode_arah, a.deskripsi, a.tahun, a.jenis_dokumen, a.periode_id
FROM arah_kebijakan a
LEFT JOIN strategi st ON st.id = a.strategi_id
WHERE a.strategi_id IS NOT NULL AND st.id IS NULL
ORDER BY a.id
LIMIT 200;

-- Program masih orphan
SELECT p.id, p.sasaran_id, p.kode_program, p.nama_program, p.periode_id
FROM program p
LEFT JOIN sasaran s ON s.id = p.sasaran_id
WHERE p.sasaran_id IS NOT NULL AND s.id IS NULL
ORDER BY p.id
LIMIT 200;

-- Kegiatan masih orphan
SELECT k.id, k.program_id, k.kode_kegiatan, k.nama_kegiatan, k.periode_id, k.jenis_dokumen, k.master_kegiatan_id
FROM kegiatan k
LEFT JOIN program p ON p.id = k.program_id
WHERE k.program_id IS NOT NULL AND p.id IS NULL
ORDER BY k.id
LIMIT 200;

-- Subkegiatan masih orphan
SELECT sk.id, sk.kegiatan_id, sk.kode_sub_kegiatan, sk.nama_sub_kegiatan, sk.periode_id, sk.jenis_dokumen, sk.master_sub_kegiatan_id
FROM sub_kegiatan sk
LEFT JOIN kegiatan k ON k.id = sk.kegiatan_id
WHERE sk.kegiatan_id IS NOT NULL AND k.id IS NULL
ORDER BY sk.id
LIMIT 200;

/* ============================================================
   3) TEMPLATE mapping manual (isi sendiri)
============================================================ */
/*
  Contoh pola mapping manual:

  CREATE TABLE IF NOT EXISTS phase4_map_program_sasaran (
    program_id INT PRIMARY KEY,
    new_sasaran_id INT NOT NULL,
    note VARCHAR(255) NULL
  );

  -- Isi baris mapping (hasil keputusan relink)
  INSERT INTO phase4_map_program_sasaran (program_id, new_sasaran_id, note) VALUES
  (123, 45, 'relink berdasarkan dokumen RPJMD 2021-2026');

  -- Validasi referensi:
  SELECT m.* FROM phase4_map_program_sasaran m
  LEFT JOIN program p ON p.id = m.program_id
  LEFT JOIN sasaran s ON s.id = m.new_sasaran_id
  WHERE p.id IS NULL OR s.id IS NULL;

  -- Apply:
  START TRANSACTION;
  UPDATE program p
  JOIN phase4_map_program_sasaran m ON m.program_id = p.id
  SET p.sasaran_id = m.new_sasaran_id;
  COMMIT;
*/
