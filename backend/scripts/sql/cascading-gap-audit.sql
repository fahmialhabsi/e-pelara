/*
  Cascading Gap Audit — ePelara (RPJMD → Renstra OPD)
  Scope:
  - orphan RPJMD chain
  - orphan Renstra chain
  - program tanpa arah kebijakan
  - pivot invalid
  - target tahunan tidak lengkap
  - duplikasi target detail
  - mismatch rpjmd_tujuan_id (renstra_tujuan)

  Catatan:
  - File ini hanya READ-ONLY audit. Tidak mengubah data dan tidak menambah FK.
  - Beberapa instalasi lama bisa memiliki nama tabel RPJMD berbeda: `rpjmd` vs `rpjmds`.
*/

/* ============================================================
   0) Metadata cepat — pastikan tabel ada
============================================================ */
SELECT table_name
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name IN (
    'rpjmd','rpjmds',
    'tujuan','sasaran','strategi','arah_kebijakan','program','kegiatan','sub_kegiatan',
    'program_arah_kebijakan','program_strategi',
    'renstra_opd','renstra_tujuan','renstra_sasaran','renstra_strategi','renstra_kebijakan',
    'indikator_renstra','renstra_target','renstra_target_detail'
  )
ORDER BY table_name;

/* ============================================================
   1) Orphan RPJMD chain (inti)
============================================================ */
-- 1.1 sasaran tanpa tujuan
SELECT COUNT(*) AS orphan_sasaran_no_tujuan
FROM sasaran s
LEFT JOIN tujuan t ON t.id = s.tujuan_id
WHERE s.tujuan_id IS NOT NULL AND t.id IS NULL;

SELECT s.id, s.tujuan_id
FROM sasaran s
LEFT JOIN tujuan t ON t.id = s.tujuan_id
WHERE s.tujuan_id IS NOT NULL AND t.id IS NULL
LIMIT 50;

-- 1.2 strategi tanpa sasaran
SELECT COUNT(*) AS orphan_strategi_no_sasaran
FROM strategi st
LEFT JOIN sasaran s ON s.id = st.sasaran_id
WHERE st.sasaran_id IS NOT NULL AND s.id IS NULL;

SELECT st.id, st.sasaran_id
FROM strategi st
LEFT JOIN sasaran s ON s.id = st.sasaran_id
WHERE st.sasaran_id IS NOT NULL AND s.id IS NULL
LIMIT 50;

-- 1.3 arah_kebijakan tanpa strategi
SELECT COUNT(*) AS orphan_arah_no_strategi
FROM arah_kebijakan a
LEFT JOIN strategi st ON st.id = a.strategi_id
WHERE a.strategi_id IS NOT NULL AND st.id IS NULL;

SELECT a.id, a.strategi_id
FROM arah_kebijakan a
LEFT JOIN strategi st ON st.id = a.strategi_id
WHERE a.strategi_id IS NOT NULL AND st.id IS NULL
LIMIT 50;

-- 1.4 program tanpa sasaran
SELECT COUNT(*) AS orphan_program_no_sasaran
FROM program p
LEFT JOIN sasaran s ON s.id = p.sasaran_id
WHERE p.sasaran_id IS NOT NULL AND s.id IS NULL;

SELECT p.id, p.sasaran_id, p.kode_program, p.nama_program
FROM program p
LEFT JOIN sasaran s ON s.id = p.sasaran_id
WHERE p.sasaran_id IS NOT NULL AND s.id IS NULL
LIMIT 50;

-- 1.5 kegiatan tanpa program
SELECT COUNT(*) AS orphan_kegiatan_no_program
FROM kegiatan k
LEFT JOIN program p ON p.id = k.program_id
WHERE k.program_id IS NOT NULL AND p.id IS NULL;

SELECT k.id, k.program_id, k.kode_kegiatan, k.nama_kegiatan
FROM kegiatan k
LEFT JOIN program p ON p.id = k.program_id
WHERE k.program_id IS NOT NULL AND p.id IS NULL
LIMIT 50;

-- 1.6 sub_kegiatan tanpa kegiatan
SELECT COUNT(*) AS orphan_subkegiatan_no_kegiatan
FROM sub_kegiatan sk
LEFT JOIN kegiatan k ON k.id = sk.kegiatan_id
WHERE sk.kegiatan_id IS NOT NULL AND k.id IS NULL;

SELECT sk.id, sk.kegiatan_id, sk.kode_sub_kegiatan, sk.nama_sub_kegiatan
FROM sub_kegiatan sk
LEFT JOIN kegiatan k ON k.id = sk.kegiatan_id
WHERE sk.kegiatan_id IS NOT NULL AND k.id IS NULL
LIMIT 50;

/* ============================================================
   2) Program tanpa Arah Kebijakan (wajib minimal 1 setelah hardening)
============================================================ */
SELECT COUNT(*) AS program_tanpa_arah_kebijakan
FROM (
  SELECT p.id
  FROM program p
  LEFT JOIN program_arah_kebijakan pak ON pak.program_id = p.id
  GROUP BY p.id
  HAVING COUNT(pak.arah_kebijakan_id) = 0
) x;

SELECT p.id, p.kode_program, p.nama_program
FROM program p
LEFT JOIN program_arah_kebijakan pak ON pak.program_id = p.id
GROUP BY p.id
HAVING COUNT(pak.arah_kebijakan_id) = 0
LIMIT 50;

/* ============================================================
   3) Pivot invalid (FK hilang)
============================================================ */
-- 3.1 pivot program_arah_kebijakan referensi parent hilang
SELECT COUNT(*) AS pivot_program_arah_invalid
FROM program_arah_kebijakan pak
LEFT JOIN program p ON p.id = pak.program_id
LEFT JOIN arah_kebijakan a ON a.id = pak.arah_kebijakan_id
WHERE p.id IS NULL OR a.id IS NULL;

SELECT pak.program_id, pak.arah_kebijakan_id
FROM program_arah_kebijakan pak
LEFT JOIN program p ON p.id = pak.program_id
LEFT JOIN arah_kebijakan a ON a.id = pak.arah_kebijakan_id
WHERE p.id IS NULL OR a.id IS NULL
LIMIT 50;

-- 3.2 pivot program_strategi referensi parent hilang
SELECT COUNT(*) AS pivot_program_strategi_invalid
FROM program_strategi ps
LEFT JOIN program p ON p.id = ps.program_id
LEFT JOIN strategi st ON st.id = ps.strategi_id
WHERE p.id IS NULL OR st.id IS NULL;

SELECT ps.program_id, ps.strategi_id
FROM program_strategi ps
LEFT JOIN program p ON p.id = ps.program_id
LEFT JOIN strategi st ON st.id = ps.strategi_id
WHERE p.id IS NULL OR st.id IS NULL
LIMIT 50;

/* ============================================================
   4) Orphan Renstra chain (normalized)
============================================================ */
-- 4.1 renstra_tujuan tanpa renstra_opd
SELECT COUNT(*) AS orphan_renstra_tujuan_no_opd
FROM renstra_tujuan rt
LEFT JOIN renstra_opd ro ON ro.id = rt.renstra_id
WHERE rt.renstra_id IS NOT NULL AND ro.id IS NULL;

-- 4.1b renstra_program tanpa renstra_opd
SELECT COUNT(*) AS orphan_renstra_program_no_opd
FROM renstra_program rp
LEFT JOIN renstra_opd ro ON ro.id = rp.renstra_id
WHERE rp.renstra_id IS NOT NULL AND ro.id IS NULL;

-- 4.1c renstra_kegiatan tanpa renstra_opd / tanpa renstra_program
SELECT COUNT(*) AS orphan_renstra_kegiatan_no_opd
FROM renstra_kegiatan rk
LEFT JOIN renstra_opd ro ON ro.id = rk.renstra_id
WHERE rk.renstra_id IS NOT NULL AND ro.id IS NULL;

SELECT COUNT(*) AS orphan_renstra_kegiatan_no_program_renstra
FROM renstra_kegiatan rk
LEFT JOIN renstra_program rp ON rp.id = rk.program_id
WHERE rk.program_id IS NOT NULL AND rp.id IS NULL;

-- 4.1d renstra_subkegiatan tanpa renstra_program / tanpa renstra_kegiatan / tanpa sub_kegiatan master
SELECT COUNT(*) AS orphan_renstra_subkegiatan_no_program_renstra
FROM renstra_subkegiatan rsk
LEFT JOIN renstra_program rp ON rp.id = rsk.renstra_program_id
WHERE rsk.renstra_program_id IS NOT NULL AND rp.id IS NULL;

SELECT COUNT(*) AS orphan_renstra_subkegiatan_no_kegiatan_renstra
FROM renstra_subkegiatan rsk
LEFT JOIN renstra_kegiatan rk ON rk.id = rsk.kegiatan_id
WHERE rsk.kegiatan_id IS NOT NULL AND rk.id IS NULL;

SELECT COUNT(*) AS orphan_renstra_subkegiatan_no_sub_kegiatan_master
FROM renstra_subkegiatan rsk
LEFT JOIN sub_kegiatan sk ON sk.id = rsk.sub_kegiatan_id
WHERE rsk.sub_kegiatan_id IS NOT NULL AND sk.id IS NULL;

-- 4.2 renstra_sasaran tanpa renstra_opd / tanpa renstra_tujuan
SELECT COUNT(*) AS orphan_renstra_sasaran_no_opd
FROM renstra_sasaran rs
LEFT JOIN renstra_opd ro ON ro.id = rs.renstra_id
WHERE rs.renstra_id IS NOT NULL AND ro.id IS NULL;

SELECT COUNT(*) AS orphan_renstra_sasaran_no_tujuan_renstra
FROM renstra_sasaran rs
LEFT JOIN renstra_tujuan rt ON rt.id = rs.tujuan_id
WHERE rs.tujuan_id IS NOT NULL AND rt.id IS NULL;

-- 4.3 renstra_strategi tanpa renstra_opd / tanpa renstra_sasaran
SELECT COUNT(*) AS orphan_renstra_strategi_no_opd
FROM renstra_strategi rstr
LEFT JOIN renstra_opd ro ON ro.id = rstr.renstra_id
WHERE rstr.renstra_id IS NOT NULL AND ro.id IS NULL;

SELECT COUNT(*) AS orphan_renstra_strategi_no_sasaran_renstra
FROM renstra_strategi rstr
LEFT JOIN renstra_sasaran rs ON rs.id = rstr.sasaran_id
WHERE rstr.sasaran_id IS NOT NULL AND rs.id IS NULL;

-- 4.4 renstra_kebijakan tanpa renstra_opd / tanpa renstra_strategi
SELECT COUNT(*) AS orphan_renstra_kebijakan_no_opd
FROM renstra_kebijakan rk
LEFT JOIN renstra_opd ro ON ro.id = rk.renstra_id
WHERE rk.renstra_id IS NOT NULL AND ro.id IS NULL;

SELECT COUNT(*) AS orphan_renstra_kebijakan_no_strategi_renstra
FROM renstra_kebijakan rk
LEFT JOIN renstra_strategi rstr ON rstr.id = rk.strategi_id
WHERE rk.strategi_id IS NOT NULL AND rstr.id IS NULL;

/* ============================================================
   4b) Cross-link Renstra Program/Kegiatan/SubKegiatan → RPJMD (best-effort)
============================================================ */
-- rpjmd_program_id sering tersimpan string; audit non-numerik
SELECT COUNT(*) AS renstra_program_rpjmd_program_id_non_numeric
FROM renstra_program
WHERE rpjmd_program_id IS NOT NULL
  AND TRIM(rpjmd_program_id) <> ''
  AND rpjmd_program_id NOT REGEXP '^[0-9]+$';

-- numerik tapi program RPJMD tidak ditemukan
SELECT COUNT(*) AS renstra_program_rpjmd_program_id_missing
FROM renstra_program rp
LEFT JOIN program p ON p.id = CAST(rp.rpjmd_program_id AS UNSIGNED)
WHERE rp.rpjmd_program_id REGEXP '^[0-9]+$'
  AND p.id IS NULL;

/* ============================================================
   5) Consistency Renstra → RPJMD (broken chain lintas dokumen)
============================================================ */
-- 5.1 mismatch renstra_sasaran: sasaran RPJMD bukan child dari tujuan RPJMD pada renstra_tujuan
-- rpjmd_tujuan_id di renstra_tujuan sering disimpan string; audit hanya untuk yang numerik.
SELECT COUNT(*) AS mismatch_renstra_sasaran_vs_tujuan_rpjmd
FROM renstra_sasaran rs
JOIN renstra_tujuan rt ON rt.id = rs.tujuan_id
JOIN sasaran s ON s.id = rs.rpjmd_sasaran_id
WHERE rt.rpjmd_tujuan_id REGEXP '^[0-9]+$'
  AND s.tujuan_id IS NOT NULL
  AND s.tujuan_id <> CAST(rt.rpjmd_tujuan_id AS UNSIGNED);

-- 5.2 mismatch renstra_strategi: strategi RPJMD bukan child dari sasaran RPJMD pada renstra_sasaran
SELECT COUNT(*) AS mismatch_renstra_strategi_vs_sasaran_rpjmd
FROM renstra_strategi rstr
JOIN renstra_sasaran rs ON rs.id = rstr.sasaran_id
JOIN strategi st ON st.id = rstr.rpjmd_strategi_id
WHERE rs.rpjmd_sasaran_id IS NOT NULL
  AND st.sasaran_id IS NOT NULL
  AND st.sasaran_id <> rs.rpjmd_sasaran_id;

-- 5.3 mismatch renstra_kebijakan: arah kebijakan RPJMD bukan child dari strategi RPJMD pada renstra_strategi
SELECT COUNT(*) AS mismatch_renstra_kebijakan_vs_strategi_rpjmd
FROM renstra_kebijakan rk
JOIN renstra_strategi rstr ON rstr.id = rk.strategi_id
JOIN arah_kebijakan a ON a.id = rk.rpjmd_arah_id
WHERE rstr.rpjmd_strategi_id IS NOT NULL
  AND a.strategi_id IS NOT NULL
  AND a.strategi_id <> rstr.rpjmd_strategi_id;

/* ============================================================
   6) Renstra target tahunan — tidak lengkap + duplikasi
============================================================ */
-- 6.1 duplikasi detail (tahun, level) per renstra_target
SELECT COUNT(*) AS dup_renstra_target_detail
FROM (
  SELECT renstra_target_id, tahun, level, COUNT(*) AS c
  FROM renstra_target_detail
  GROUP BY renstra_target_id, tahun, level
  HAVING c > 1
) x;

SELECT renstra_target_id, tahun, level, COUNT(*) AS c
FROM renstra_target_detail
GROUP BY renstra_target_id, tahun, level
HAVING c > 1
LIMIT 50;

-- 6.2 target tidak lengkap dibanding periode renstra_opd (tahun_mulai..tahun_akhir)
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
   7) Mismatch rpjmd_tujuan_id (tipe/isi tidak cocok) — renstra_tujuan
============================================================ */
-- 7.1 rpjmd_tujuan_id non-numerik (indikasi mismatch tipe / UUID)
SELECT COUNT(*) AS renstra_tujuan_rpjmd_tujuan_id_non_numeric
FROM renstra_tujuan
WHERE rpjmd_tujuan_id IS NOT NULL
  AND TRIM(rpjmd_tujuan_id) <> ''
  AND rpjmd_tujuan_id NOT REGEXP '^[0-9]+$';

-- 7.2 numerik tapi tidak ditemukan di tujuan
SELECT COUNT(*) AS renstra_tujuan_rpjmd_tujuan_id_missing
FROM renstra_tujuan rt
LEFT JOIN tujuan t ON t.id = CAST(rt.rpjmd_tujuan_id AS UNSIGNED)
WHERE rt.rpjmd_tujuan_id REGEXP '^[0-9]+$'
  AND t.id IS NULL;
