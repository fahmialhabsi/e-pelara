/*
  Phase 5 — Preflight FK Check (MySQL)
  Tujuan:
  - memastikan data & schema siap FK (orphan=0, pivot invalid=0, duplicates=0)
  - audit engine InnoDB + tipe kolom child vs parent
  - mendeteksi mismatch tipe (contoh legacy UUID/string ke INT)

  Jalankan ini sebelum `02_add_fk_indexes.sql` dan `03_add_fk_constraints.sql`.
*/

/* ============================================================
   0) Metadata DB
============================================================ */
SELECT DATABASE() AS db_name, VERSION() AS mysql_version;

/* Engine & collation untuk tabel yang akan di-FK */
SELECT
  table_name,
  engine,
  table_collation
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name IN (
    'tujuan','sasaran','strategi','arah_kebijakan',
    'program','kegiatan','sub_kegiatan',
    'program_arah_kebijakan','program_strategi',
    'renstra_opd','renstra_tujuan','renstra_sasaran','renstra_strategi','renstra_kebijakan',
    'renstra_program','renstra_kegiatan','renstra_subkegiatan',
    'indikator_renstra','renstra_target','renstra_target_detail',
    'rpjmd','rpjmds'
  )
ORDER BY table_name;

/* ============================================================
   1) Quick gate — Orphan counts (harus 0)
============================================================ */
-- RPJMD chain
SELECT COUNT(*) AS orphan_sasaran__tujuan
FROM sasaran s
LEFT JOIN tujuan t ON t.id = s.tujuan_id
WHERE s.tujuan_id IS NOT NULL AND t.id IS NULL;

SELECT COUNT(*) AS orphan_strategi__sasaran
FROM strategi st
LEFT JOIN sasaran s ON s.id = st.sasaran_id
WHERE st.sasaran_id IS NOT NULL AND s.id IS NULL;

SELECT COUNT(*) AS orphan_arah_kebijakan__strategi
FROM arah_kebijakan a
LEFT JOIN strategi st ON st.id = a.strategi_id
WHERE a.strategi_id IS NOT NULL AND st.id IS NULL;

-- program chain
SELECT COUNT(*) AS orphan_program__sasaran
FROM program p
LEFT JOIN sasaran s ON s.id = p.sasaran_id
WHERE p.sasaran_id IS NOT NULL AND s.id IS NULL;

SELECT COUNT(*) AS orphan_kegiatan__program
FROM kegiatan k
LEFT JOIN program p ON p.id = k.program_id
WHERE k.program_id IS NOT NULL AND p.id IS NULL;

SELECT COUNT(*) AS orphan_sub_kegiatan__kegiatan
FROM sub_kegiatan sk
LEFT JOIN kegiatan k ON k.id = sk.kegiatan_id
WHERE sk.kegiatan_id IS NOT NULL AND k.id IS NULL;

-- pivot invalid
SELECT COUNT(*) AS pivot_program_arah_invalid
FROM program_arah_kebijakan pak
LEFT JOIN program p ON p.id = pak.program_id
LEFT JOIN arah_kebijakan a ON a.id = pak.arah_kebijakan_id
WHERE p.id IS NULL OR a.id IS NULL;

SELECT COUNT(*) AS pivot_program_strategi_invalid
FROM program_strategi ps
LEFT JOIN program p ON p.id = ps.program_id
LEFT JOIN strategi st ON st.id = ps.strategi_id
WHERE p.id IS NULL OR st.id IS NULL;

/* Broken RPJMD chain (domain rule) — Program wajib punya >= 1 arah kebijakan */
SELECT COUNT(*) AS program_tanpa_arah_kebijakan
FROM (
  SELECT p.id
  FROM program p
  LEFT JOIN program_arah_kebijakan pak ON pak.program_id = p.id
  GROUP BY p.id
  HAVING COUNT(pak.arah_kebijakan_id) = 0
) x;

-- renstra orphan (renstra_id)
SELECT COUNT(*) AS orphan_renstra_program__renstra_opd
FROM renstra_program rp
LEFT JOIN renstra_opd ro ON ro.id = rp.renstra_id
WHERE rp.renstra_id IS NOT NULL AND ro.id IS NULL;

SELECT COUNT(*) AS orphan_renstra_kegiatan__renstra_opd
FROM renstra_kegiatan rk
LEFT JOIN renstra_opd ro ON ro.id = rk.renstra_id
WHERE rk.renstra_id IS NOT NULL AND ro.id IS NULL;

SELECT COUNT(*) AS orphan_renstra_tujuan__renstra_opd
FROM renstra_tujuan rt
LEFT JOIN renstra_opd ro ON ro.id = rt.renstra_id
WHERE rt.renstra_id IS NOT NULL AND ro.id IS NULL;

SELECT COUNT(*) AS orphan_renstra_sasaran__renstra_opd
FROM renstra_sasaran rs
LEFT JOIN renstra_opd ro ON ro.id = rs.renstra_id
WHERE rs.renstra_id IS NOT NULL AND ro.id IS NULL;

SELECT COUNT(*) AS orphan_renstra_strategi__renstra_opd
FROM renstra_strategi rstr
LEFT JOIN renstra_opd ro ON ro.id = rstr.renstra_id
WHERE rstr.renstra_id IS NOT NULL AND ro.id IS NULL;

SELECT COUNT(*) AS orphan_renstra_kebijakan__renstra_opd
FROM renstra_kebijakan rk
LEFT JOIN renstra_opd ro ON ro.id = rk.renstra_id
WHERE rk.renstra_id IS NOT NULL AND ro.id IS NULL;

-- internal renstra chain
SELECT COUNT(*) AS orphan_renstra_sasaran__renstra_tujuan
FROM renstra_sasaran rs
LEFT JOIN renstra_tujuan rt ON rt.id = rs.tujuan_id
WHERE rs.tujuan_id IS NOT NULL AND rt.id IS NULL;

SELECT COUNT(*) AS orphan_renstra_strategi__renstra_sasaran
FROM renstra_strategi rstr
LEFT JOIN renstra_sasaran rs ON rs.id = rstr.sasaran_id
WHERE rstr.sasaran_id IS NOT NULL AND rs.id IS NULL;

SELECT COUNT(*) AS orphan_renstra_kebijakan__renstra_strategi
FROM renstra_kebijakan rk
LEFT JOIN renstra_strategi rstr ON rstr.id = rk.strategi_id
WHERE rk.strategi_id IS NOT NULL AND rstr.id IS NULL;

SELECT COUNT(*) AS orphan_renstra_kegiatan__renstra_program
FROM renstra_kegiatan rk
LEFT JOIN renstra_program rp ON rp.id = rk.program_id
WHERE rk.program_id IS NOT NULL AND rp.id IS NULL;

SELECT COUNT(*) AS orphan_renstra_subkegiatan__renstra_program
FROM renstra_subkegiatan rsk
LEFT JOIN renstra_program rp ON rp.id = rsk.renstra_program_id
WHERE rsk.renstra_program_id IS NOT NULL AND rp.id IS NULL;

SELECT COUNT(*) AS orphan_renstra_subkegiatan__renstra_kegiatan
FROM renstra_subkegiatan rsk
LEFT JOIN renstra_kegiatan rk ON rk.id = rsk.kegiatan_id
WHERE rsk.kegiatan_id IS NOT NULL AND rk.id IS NULL;

SELECT COUNT(*) AS orphan_renstra_subkegiatan__sub_kegiatan_master
FROM renstra_subkegiatan rsk
LEFT JOIN sub_kegiatan sk ON sk.id = rsk.sub_kegiatan_id
WHERE rsk.sub_kegiatan_id IS NOT NULL AND sk.id IS NULL;

-- renstra -> rpjmd cross-link (yang tipe-nya sering bermasalah di data lama)
SELECT COUNT(*) AS renstra_program_rpjmd_program_id_non_numeric
FROM renstra_program
WHERE rpjmd_program_id IS NOT NULL
  AND TRIM(CAST(rpjmd_program_id AS CHAR)) <> ''
  AND CAST(rpjmd_program_id AS CHAR) NOT REGEXP '^[0-9]+$';

SELECT COUNT(*) AS renstra_tujuan_rpjmd_tujuan_id_non_numeric
FROM renstra_tujuan
WHERE rpjmd_tujuan_id IS NOT NULL
  AND TRIM(CAST(rpjmd_tujuan_id AS CHAR)) <> ''
  AND CAST(rpjmd_tujuan_id AS CHAR) NOT REGEXP '^[0-9]+$';

/* Cross-link numerik tapi parent hilang (harus 0 sebelum FK) */
SELECT COUNT(*) AS renstra_program_rpjmd_program_id_missing
FROM renstra_program rp
LEFT JOIN program p ON p.id = CAST(rp.rpjmd_program_id AS UNSIGNED)
WHERE CAST(rp.rpjmd_program_id AS CHAR) REGEXP '^[0-9]+$'
  AND p.id IS NULL;

SELECT COUNT(*) AS renstra_tujuan_rpjmd_tujuan_id_missing
FROM renstra_tujuan rt
LEFT JOIN tujuan t ON t.id = CAST(rt.rpjmd_tujuan_id AS UNSIGNED)
WHERE CAST(rt.rpjmd_tujuan_id AS CHAR) REGEXP '^[0-9]+$'
  AND t.id IS NULL;

/* Orphan cross-link Renstra -> RPJMD (harus 0 sebelum FK yang ACTIVE) */
SELECT COUNT(*) AS orphan_renstra_sasaran__rpjmd_sasaran
FROM renstra_sasaran rs
LEFT JOIN sasaran s ON s.id = rs.rpjmd_sasaran_id
WHERE rs.rpjmd_sasaran_id IS NOT NULL AND s.id IS NULL;

SELECT COUNT(*) AS orphan_renstra_strategi__rpjmd_strategi
FROM renstra_strategi rstr
LEFT JOIN strategi st ON st.id = rstr.rpjmd_strategi_id
WHERE rstr.rpjmd_strategi_id IS NOT NULL AND st.id IS NULL;

SELECT COUNT(*) AS orphan_renstra_kebijakan__rpjmd_arah
FROM renstra_kebijakan rk
LEFT JOIN arah_kebijakan a ON a.id = rk.rpjmd_arah_id
WHERE rk.rpjmd_arah_id IS NOT NULL AND a.id IS NULL;

SELECT COUNT(*) AS orphan_renstra_kegiatan__rpjmd_kegiatan
FROM renstra_kegiatan rk
LEFT JOIN kegiatan k ON k.id = rk.rpjmd_kegiatan_id
WHERE rk.rpjmd_kegiatan_id IS NOT NULL AND k.id IS NULL;

/* ============================================================
   2) Target tahunan gate — duplicates & FK-readiness
============================================================ */
SELECT COUNT(*) AS dup_renstra_target_detail_groups
FROM (
  SELECT renstra_target_id, tahun, level, COUNT(*) AS c
  FROM renstra_target_detail
  GROUP BY renstra_target_id, tahun, level
  HAVING c > 1
) x;

SELECT COUNT(*) AS orphan_renstra_target__indikator
FROM renstra_target rt
LEFT JOIN indikator_renstra ir ON ir.id = rt.indikator_id
WHERE rt.indikator_id IS NOT NULL AND ir.id IS NULL;

SELECT COUNT(*) AS orphan_renstra_target_detail__renstra_target
FROM renstra_target_detail d
LEFT JOIN renstra_target rt ON rt.id = d.renstra_target_id
WHERE d.renstra_target_id IS NOT NULL AND rt.id IS NULL;

SELECT COUNT(*) AS orphan_indikator_renstra__renstra_opd
FROM indikator_renstra ir
LEFT JOIN renstra_opd ro ON ro.id = ir.renstra_id
WHERE ir.renstra_id IS NOT NULL AND ro.id IS NULL;

/* Broken chain lintas RPJMD↔Renstra (harus 0 sebelum FK kuat) */
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

SELECT COUNT(*) AS mismatch_renstra_kebijakan_vs_strategi_rpjmd
FROM renstra_kebijakan rk
JOIN renstra_strategi rstr ON rstr.id = rk.strategi_id
JOIN arah_kebijakan a ON a.id = rk.rpjmd_arah_id
WHERE rstr.rpjmd_strategi_id IS NOT NULL
  AND a.strategi_id IS NOT NULL
  AND a.strategi_id <> rstr.rpjmd_strategi_id;

/* ============================================================
   3) Tipe kolom (child vs parent) — audit
============================================================ */
SELECT
  c.table_name AS child_table,
  c.column_name AS child_column,
  c.data_type AS child_data_type,
  c.column_type AS child_column_type,
  c.is_nullable AS child_nullable,
  p.table_name AS parent_table,
  p.column_name AS parent_column,
  p.data_type AS parent_data_type,
  p.column_type AS parent_column_type
FROM (
  SELECT 'sasaran' AS table_name, 'tujuan_id' AS column_name, 'tujuan' AS parent_table, 'id' AS parent_column
  UNION ALL SELECT 'strategi','sasaran_id','sasaran','id'
  UNION ALL SELECT 'arah_kebijakan','strategi_id','strategi','id'
  UNION ALL SELECT 'program','sasaran_id','sasaran','id'
  UNION ALL SELECT 'kegiatan','program_id','program','id'
  UNION ALL SELECT 'sub_kegiatan','kegiatan_id','kegiatan','id'
  UNION ALL SELECT 'program_arah_kebijakan','program_id','program','id'
  UNION ALL SELECT 'program_arah_kebijakan','arah_kebijakan_id','arah_kebijakan','id'
  UNION ALL SELECT 'program_strategi','program_id','program','id'
  UNION ALL SELECT 'program_strategi','strategi_id','strategi','id'
  UNION ALL SELECT 'renstra_tujuan','renstra_id','renstra_opd','id'
  UNION ALL SELECT 'renstra_sasaran','renstra_id','renstra_opd','id'
  UNION ALL SELECT 'renstra_sasaran','tujuan_id','renstra_tujuan','id'
  UNION ALL SELECT 'renstra_sasaran','rpjmd_sasaran_id','sasaran','id'
  UNION ALL SELECT 'renstra_strategi','renstra_id','renstra_opd','id'
  UNION ALL SELECT 'renstra_strategi','sasaran_id','renstra_sasaran','id'
  UNION ALL SELECT 'renstra_strategi','rpjmd_strategi_id','strategi','id'
  UNION ALL SELECT 'renstra_kebijakan','renstra_id','renstra_opd','id'
  UNION ALL SELECT 'renstra_kebijakan','strategi_id','renstra_strategi','id'
  UNION ALL SELECT 'renstra_kebijakan','rpjmd_arah_id','arah_kebijakan','id'
  UNION ALL SELECT 'renstra_program','renstra_id','renstra_opd','id'
  UNION ALL SELECT 'renstra_program','rpjmd_program_id','program','id'
  UNION ALL SELECT 'renstra_kegiatan','renstra_id','renstra_opd','id'
  UNION ALL SELECT 'renstra_kegiatan','program_id','renstra_program','id'
  UNION ALL SELECT 'renstra_kegiatan','rpjmd_kegiatan_id','kegiatan','id'
  UNION ALL SELECT 'renstra_subkegiatan','renstra_program_id','renstra_program','id'
  UNION ALL SELECT 'renstra_subkegiatan','kegiatan_id','renstra_kegiatan','id'
  UNION ALL SELECT 'renstra_subkegiatan','sub_kegiatan_id','sub_kegiatan','id'
  UNION ALL SELECT 'indikator_renstra','renstra_id','renstra_opd','id'
  UNION ALL SELECT 'renstra_target','indikator_id','indikator_renstra','id'
  UNION ALL SELECT 'renstra_target_detail','renstra_target_id','renstra_target','id'
) m
JOIN information_schema.columns c
  ON c.table_schema = DATABASE()
 AND c.table_name = m.table_name
 AND c.column_name = m.column_name
JOIN information_schema.columns p
  ON p.table_schema = DATABASE()
 AND p.table_name = m.parent_table
 AND p.column_name = m.parent_column
ORDER BY child_table, child_column;

/* Renstra OPD -> RPJMD parent table detection (rpjmd vs rpjmds) */
SELECT
  CASE
    WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='rpjmd') THEN 'rpjmd'
    WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='rpjmds') THEN 'rpjmds'
    ELSE NULL
  END AS rpjmd_parent_table_detected;

SELECT
  table_name,
  column_name,
  data_type,
  column_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name = 'renstra_opd'
  AND column_name = 'rpjmd_id';

/* ============================================================
   4) Existing FKs (untuk memastikan tidak duplikat)
============================================================ */
SELECT
  rc.constraint_name,
  rc.table_name,
  rc.referenced_table_name
FROM information_schema.referential_constraints rc
WHERE rc.constraint_schema = DATABASE()
ORDER BY rc.table_name, rc.constraint_name;

/* ============================================================
   5) Dynamic preflight helpers (read-only)
   - Menghitung orphan renstra_opd.rpjmd_id tanpa hardcode parent table (rpjmd vs rpjmds).
============================================================ */
SET @phase5_rpjmd_parent := (
  SELECT CASE
    WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'rpjmd') THEN 'rpjmd'
    WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'rpjmds') THEN 'rpjmds'
    ELSE NULL
  END
);
SET @phase5_orphan_renstra_opd_rpjmd := 0;
SET @phase5_sql := IF(
  @phase5_rpjmd_parent = 'rpjmd',
  'SELECT COUNT(*) INTO @phase5_orphan_renstra_opd_rpjmd FROM renstra_opd ro LEFT JOIN rpjmd p ON p.id = ro.rpjmd_id WHERE ro.rpjmd_id IS NOT NULL AND p.id IS NULL',
  IF(
    @phase5_rpjmd_parent = 'rpjmds',
    'SELECT COUNT(*) INTO @phase5_orphan_renstra_opd_rpjmd FROM renstra_opd ro LEFT JOIN rpjmds p ON p.id = ro.rpjmd_id WHERE ro.rpjmd_id IS NOT NULL AND p.id IS NULL',
    'SELECT 0 INTO @phase5_orphan_renstra_opd_rpjmd'
  )
);
PREPARE phase5_stmt FROM @phase5_sql;
EXECUTE phase5_stmt;
DEALLOCATE PREPARE phase5_stmt;

SELECT @phase5_rpjmd_parent AS rpjmd_parent_table_used_for_orphan_check,
       @phase5_orphan_renstra_opd_rpjmd AS orphan_renstra_opd__rpjmd;

/* ============================================================
   6) PREFLIGHT SUMMARY (Gate PASS/FAIL/WARN)
   Format:
   - check_group, check_name, issue_count, status, blocking, notes
============================================================ */
SELECT
  s.check_group,
  s.check_name,
  s.issue_count,
  CASE
    WHEN s.status_override IS NOT NULL THEN s.status_override
    WHEN s.issue_count = 0 THEN 'PASS'
    ELSE 'FAIL'
  END AS status,
  s.blocking,
  s.notes
FROM (
  /* 1) table engine InnoDB */
  SELECT
    'SCHEMA' AS check_group,
    'table_engine_innodb' AS check_name,
    CAST((
      SELECT COUNT(*)
      FROM information_schema.tables t
      WHERE t.table_schema = DATABASE()
        AND t.table_name IN (
          'tujuan','sasaran','strategi','arah_kebijakan',
          'program','kegiatan','sub_kegiatan',
          'program_arah_kebijakan','program_strategi',
          'renstra_opd','renstra_tujuan','renstra_sasaran','renstra_strategi','renstra_kebijakan',
          'renstra_program','renstra_kegiatan','renstra_subkegiatan',
          'indikator_renstra','renstra_target','renstra_target_detail'
          ,'rpjmd','rpjmds'
        )
        AND (t.engine IS NULL OR t.engine <> 'InnoDB')
    ) AS UNSIGNED) AS issue_count,
    NULL AS status_override,
    'YES' AS blocking,
    'Semua tabel yang di-enforce FK wajib engine InnoDB.' AS notes

  UNION ALL

  /* 9) missing parent/child table (atau kolom FK) */
  SELECT
    'SCHEMA' AS check_group,
    'missing_parent_child_table_or_column' AS check_name,
    CAST((
      /* missing required core tables */
      (
        SELECT COUNT(*)
        FROM (
          SELECT 'tujuan' AS table_name UNION ALL
          SELECT 'sasaran' UNION ALL
          SELECT 'strategi' UNION ALL
          SELECT 'arah_kebijakan' UNION ALL
          SELECT 'program' UNION ALL
          SELECT 'kegiatan' UNION ALL
          SELECT 'sub_kegiatan' UNION ALL
          SELECT 'program_arah_kebijakan' UNION ALL
          SELECT 'program_strategi' UNION ALL
          SELECT 'renstra_opd' UNION ALL
          SELECT 'renstra_tujuan' UNION ALL
          SELECT 'renstra_sasaran' UNION ALL
          SELECT 'renstra_strategi' UNION ALL
          SELECT 'renstra_kebijakan' UNION ALL
          SELECT 'renstra_program' UNION ALL
          SELECT 'renstra_kegiatan' UNION ALL
          SELECT 'renstra_subkegiatan' UNION ALL
          SELECT 'indikator_renstra' UNION ALL
          SELECT 'renstra_target' UNION ALL
          SELECT 'renstra_target_detail'
        ) req
        LEFT JOIN information_schema.tables t
          ON t.table_schema = DATABASE() AND t.table_name = req.table_name
        WHERE t.table_name IS NULL
      )
      +
      /* require at least one of (rpjmd,rpjmds) to exist */
      (
        SELECT CASE
          WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='rpjmd') THEN 0
          WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='rpjmds') THEN 0
          ELSE 1
        END
      )
      +
      /* missing FK columns for core mapping (excluding renstra_tujuan.rpjmd_tujuan_id which is deferred Phase 6) */
      (
        SELECT COUNT(*)
        FROM (
          SELECT 'sasaran' AS child_table, 'tujuan_id' AS child_column, 'tujuan' AS parent_table, 'id' AS parent_column
          UNION ALL SELECT 'strategi','sasaran_id','sasaran','id'
          UNION ALL SELECT 'arah_kebijakan','strategi_id','strategi','id'
          UNION ALL SELECT 'program','sasaran_id','sasaran','id'
          UNION ALL SELECT 'kegiatan','program_id','program','id'
          UNION ALL SELECT 'sub_kegiatan','kegiatan_id','kegiatan','id'
          UNION ALL SELECT 'program_arah_kebijakan','program_id','program','id'
          UNION ALL SELECT 'program_arah_kebijakan','arah_kebijakan_id','arah_kebijakan','id'
          UNION ALL SELECT 'program_strategi','program_id','program','id'
          UNION ALL SELECT 'program_strategi','strategi_id','strategi','id'
          UNION ALL SELECT 'renstra_tujuan','renstra_id','renstra_opd','id'
          UNION ALL SELECT 'renstra_sasaran','renstra_id','renstra_opd','id'
          UNION ALL SELECT 'renstra_sasaran','tujuan_id','renstra_tujuan','id'
          UNION ALL SELECT 'renstra_sasaran','rpjmd_sasaran_id','sasaran','id'
          UNION ALL SELECT 'renstra_strategi','renstra_id','renstra_opd','id'
          UNION ALL SELECT 'renstra_strategi','sasaran_id','renstra_sasaran','id'
          UNION ALL SELECT 'renstra_strategi','rpjmd_strategi_id','strategi','id'
          UNION ALL SELECT 'renstra_kebijakan','renstra_id','renstra_opd','id'
          UNION ALL SELECT 'renstra_kebijakan','strategi_id','renstra_strategi','id'
          UNION ALL SELECT 'renstra_kebijakan','rpjmd_arah_id','arah_kebijakan','id'
          UNION ALL SELECT 'renstra_program','renstra_id','renstra_opd','id'
          UNION ALL SELECT 'renstra_program','rpjmd_program_id','program','id'
          UNION ALL SELECT 'renstra_kegiatan','renstra_id','renstra_opd','id'
          UNION ALL SELECT 'renstra_kegiatan','program_id','renstra_program','id'
          UNION ALL SELECT 'renstra_kegiatan','rpjmd_kegiatan_id','kegiatan','id'
          UNION ALL SELECT 'renstra_subkegiatan','renstra_program_id','renstra_program','id'
          UNION ALL SELECT 'renstra_subkegiatan','kegiatan_id','renstra_kegiatan','id'
          UNION ALL SELECT 'renstra_subkegiatan','sub_kegiatan_id','sub_kegiatan','id'
          UNION ALL SELECT 'indikator_renstra','renstra_id','renstra_opd','id'
          UNION ALL SELECT 'renstra_target','indikator_id','indikator_renstra','id'
          UNION ALL SELECT 'renstra_target_detail','renstra_target_id','renstra_target','id'
        ) m
        LEFT JOIN information_schema.columns c
          ON c.table_schema = DATABASE() AND c.table_name = m.child_table AND c.column_name = m.child_column
        LEFT JOIN information_schema.columns p
          ON p.table_schema = DATABASE() AND p.table_name = m.parent_table AND p.column_name = m.parent_column
        WHERE c.column_name IS NULL OR p.column_name IS NULL
      )
      +
      /* missing renstra_opd.rpjmd_id column (FK to rpjmd/rpjmds) */
      (
        SELECT CASE
          WHEN EXISTS(
            SELECT 1 FROM information_schema.columns
            WHERE table_schema=DATABASE() AND table_name='renstra_opd' AND column_name='rpjmd_id'
          ) THEN 0
          ELSE 1
        END
      )
    ) AS UNSIGNED) AS issue_count,
    NULL AS status_override,
    'YES' AS blocking,
    'Ada tabel/kolom yang hilang: Phase 5 tidak aman dijalankan sampai schema lengkap.' AS notes

  UNION ALL

  /* 2) orphan RPJMD chain */
  SELECT
    'DATA' AS check_group,
    'orphan_rpjmd_chain' AS check_name,
    CAST((
      (SELECT COUNT(*) FROM sasaran s LEFT JOIN tujuan t ON t.id=s.tujuan_id WHERE s.tujuan_id IS NOT NULL AND t.id IS NULL) +
      (SELECT COUNT(*) FROM strategi st LEFT JOIN sasaran s ON s.id=st.sasaran_id WHERE st.sasaran_id IS NOT NULL AND s.id IS NULL) +
      (SELECT COUNT(*) FROM arah_kebijakan a LEFT JOIN strategi st ON st.id=a.strategi_id WHERE a.strategi_id IS NOT NULL AND st.id IS NULL) +
      (SELECT COUNT(*) FROM program p LEFT JOIN sasaran s ON s.id=p.sasaran_id WHERE p.sasaran_id IS NOT NULL AND s.id IS NULL) +
      (SELECT COUNT(*) FROM kegiatan k LEFT JOIN program p ON p.id=k.program_id WHERE k.program_id IS NOT NULL AND p.id IS NULL) +
      (SELECT COUNT(*) FROM sub_kegiatan sk LEFT JOIN kegiatan k ON k.id=sk.kegiatan_id WHERE sk.kegiatan_id IS NOT NULL AND k.id IS NULL)
    ) AS UNSIGNED) AS issue_count,
    NULL AS status_override,
    'YES' AS blocking,
    'Orphan FK RPJMD: sasaran->tujuan, strategi->sasaran, arah->strategi, program->sasaran, kegiatan->program, sub_kegiatan->kegiatan.' AS notes

  UNION ALL

  /* 3) orphan Renstra chain */
  SELECT
    'DATA' AS check_group,
    'orphan_renstra_chain' AS check_name,
    CAST((
      /* renstra_* -> renstra_opd */
      (SELECT COUNT(*) FROM renstra_program rp LEFT JOIN renstra_opd ro ON ro.id=rp.renstra_id WHERE rp.renstra_id IS NOT NULL AND ro.id IS NULL) +
      (SELECT COUNT(*) FROM renstra_kegiatan rk LEFT JOIN renstra_opd ro ON ro.id=rk.renstra_id WHERE rk.renstra_id IS NOT NULL AND ro.id IS NULL) +
      (SELECT COUNT(*) FROM renstra_tujuan rt LEFT JOIN renstra_opd ro ON ro.id=rt.renstra_id WHERE rt.renstra_id IS NOT NULL AND ro.id IS NULL) +
      (SELECT COUNT(*) FROM renstra_sasaran rs LEFT JOIN renstra_opd ro ON ro.id=rs.renstra_id WHERE rs.renstra_id IS NOT NULL AND ro.id IS NULL) +
      (SELECT COUNT(*) FROM renstra_strategi rstr LEFT JOIN renstra_opd ro ON ro.id=rstr.renstra_id WHERE rstr.renstra_id IS NOT NULL AND ro.id IS NULL) +
      (SELECT COUNT(*) FROM renstra_kebijakan rk LEFT JOIN renstra_opd ro ON ro.id=rk.renstra_id WHERE rk.renstra_id IS NOT NULL AND ro.id IS NULL) +
      /* internal renstra chain */
      (SELECT COUNT(*) FROM renstra_sasaran rs LEFT JOIN renstra_tujuan rt ON rt.id=rs.tujuan_id WHERE rs.tujuan_id IS NOT NULL AND rt.id IS NULL) +
      (SELECT COUNT(*) FROM renstra_strategi rstr LEFT JOIN renstra_sasaran rs ON rs.id=rstr.sasaran_id WHERE rstr.sasaran_id IS NOT NULL AND rs.id IS NULL) +
      (SELECT COUNT(*) FROM renstra_kebijakan rk LEFT JOIN renstra_strategi rstr ON rstr.id=rk.strategi_id WHERE rk.strategi_id IS NOT NULL AND rstr.id IS NULL) +
      (SELECT COUNT(*) FROM renstra_kegiatan rk LEFT JOIN renstra_program rp ON rp.id=rk.program_id WHERE rk.program_id IS NOT NULL AND rp.id IS NULL) +
      (SELECT COUNT(*) FROM renstra_subkegiatan rsk LEFT JOIN renstra_program rp ON rp.id=rsk.renstra_program_id WHERE rsk.renstra_program_id IS NOT NULL AND rp.id IS NULL) +
      (SELECT COUNT(*) FROM renstra_subkegiatan rsk LEFT JOIN renstra_kegiatan rk ON rk.id=rsk.kegiatan_id WHERE rsk.kegiatan_id IS NOT NULL AND rk.id IS NULL) +
      (SELECT COUNT(*) FROM renstra_subkegiatan rsk LEFT JOIN sub_kegiatan sk ON sk.id=rsk.sub_kegiatan_id WHERE rsk.sub_kegiatan_id IS NOT NULL AND sk.id IS NULL) +
      /* indikator/target chain */
      (SELECT COUNT(*) FROM indikator_renstra ir LEFT JOIN renstra_opd ro ON ro.id=ir.renstra_id WHERE ir.renstra_id IS NOT NULL AND ro.id IS NULL) +
      (SELECT COUNT(*) FROM renstra_target rt LEFT JOIN indikator_renstra ir ON ir.id=rt.indikator_id WHERE rt.indikator_id IS NOT NULL AND ir.id IS NULL) +
      (SELECT COUNT(*) FROM renstra_target_detail d LEFT JOIN renstra_target rt ON rt.id=d.renstra_target_id WHERE d.renstra_target_id IS NOT NULL AND rt.id IS NULL) +
      /* renstra_opd -> (rpjmd|rpjmds) */
      COALESCE(@phase5_orphan_renstra_opd_rpjmd, 0) +
      /* renstra -> rpjmd cross-link (ACTIVE FKs) */
      (SELECT COUNT(*) FROM renstra_program rp LEFT JOIN program p ON p.id = CAST(rp.rpjmd_program_id AS UNSIGNED)
        WHERE CAST(rp.rpjmd_program_id AS CHAR) REGEXP '^[0-9]+$' AND p.id IS NULL
      ) +
      (SELECT COUNT(*) FROM renstra_sasaran rs LEFT JOIN sasaran s ON s.id = rs.rpjmd_sasaran_id
        WHERE rs.rpjmd_sasaran_id IS NOT NULL AND s.id IS NULL
      ) +
      (SELECT COUNT(*) FROM renstra_strategi rstr LEFT JOIN strategi st ON st.id = rstr.rpjmd_strategi_id
        WHERE rstr.rpjmd_strategi_id IS NOT NULL AND st.id IS NULL
      ) +
      (SELECT COUNT(*) FROM renstra_kebijakan rk LEFT JOIN arah_kebijakan a ON a.id = rk.rpjmd_arah_id
        WHERE rk.rpjmd_arah_id IS NOT NULL AND a.id IS NULL
      ) +
      (SELECT COUNT(*) FROM renstra_kegiatan rk LEFT JOIN kegiatan k ON k.id = rk.rpjmd_kegiatan_id
        WHERE rk.rpjmd_kegiatan_id IS NOT NULL AND k.id IS NULL
      )
    ) AS UNSIGNED) AS issue_count,
    NULL AS status_override,
    'YES' AS blocking,
    'Orphan FK Renstra: renstra_* -> renstra_opd + internal renstra chain + indikator/target + renstra_opd->rpjmd + renstra->rpjmd refs.' AS notes

  UNION ALL

  /* 4) broken RPJMD chain */
  SELECT
    'DATA' AS check_group,
    'broken_rpjmd_chain' AS check_name,
    CAST((
      SELECT COUNT(*) FROM (
        SELECT p.id
        FROM program p
        LEFT JOIN program_arah_kebijakan pak ON pak.program_id = p.id
        GROUP BY p.id
        HAVING COUNT(pak.arah_kebijakan_id) = 0
      ) x
    ) AS UNSIGNED) AS issue_count,
    NULL AS status_override,
    'YES' AS blocking,
    'Domain: program wajib punya minimal 1 arah kebijakan (agar cascading tidak putus).' AS notes

  UNION ALL

  /* 5) broken Renstra chain (mismatch lintas RPJMD↔Renstra) */
  SELECT
    'DATA' AS check_group,
    'broken_renstra_chain' AS check_name,
    CAST((
      (SELECT COUNT(*) FROM renstra_sasaran rs
        JOIN renstra_tujuan rt ON rt.id=rs.tujuan_id
        JOIN sasaran s ON s.id=rs.rpjmd_sasaran_id
        WHERE CAST(rt.rpjmd_tujuan_id AS CHAR) REGEXP '^[0-9]+$'
          AND s.tujuan_id IS NOT NULL
          AND s.tujuan_id <> CAST(rt.rpjmd_tujuan_id AS UNSIGNED)
      ) +
      (SELECT COUNT(*) FROM renstra_strategi rstr
        JOIN renstra_sasaran rs ON rs.id=rstr.sasaran_id
        JOIN strategi st ON st.id=rstr.rpjmd_strategi_id
        WHERE rs.rpjmd_sasaran_id IS NOT NULL
          AND st.sasaran_id IS NOT NULL
          AND st.sasaran_id <> rs.rpjmd_sasaran_id
      ) +
      (SELECT COUNT(*) FROM renstra_kebijakan rk
        JOIN renstra_strategi rstr ON rstr.id=rk.strategi_id
        JOIN arah_kebijakan a ON a.id=rk.rpjmd_arah_id
        WHERE rstr.rpjmd_strategi_id IS NOT NULL
          AND a.strategi_id IS NOT NULL
          AND a.strategi_id <> rstr.rpjmd_strategi_id
      )
    ) AS UNSIGNED) AS issue_count,
    NULL AS status_override,
    'YES' AS blocking,
    'Mismatch lintas dokumen: renstra_sasaran/strategi/kebijakan harus child dari parent RPJMD yang benar.' AS notes

  UNION ALL

  /* 6) pivot invalid */
  SELECT
    'DATA' AS check_group,
    'pivot_invalid' AS check_name,
    CAST((
      (SELECT COUNT(*) FROM program_arah_kebijakan pak
        LEFT JOIN program p ON p.id=pak.program_id
        LEFT JOIN arah_kebijakan a ON a.id=pak.arah_kebijakan_id
        WHERE p.id IS NULL OR a.id IS NULL
      ) +
      (SELECT COUNT(*) FROM program_strategi ps
        LEFT JOIN program p ON p.id=ps.program_id
        LEFT JOIN strategi st ON st.id=ps.strategi_id
        WHERE p.id IS NULL OR st.id IS NULL
      )
    ) AS UNSIGNED) AS issue_count,
    NULL AS status_override,
    'YES' AS blocking,
    'Pivot invalid harus 0 sebelum FK ditambahkan.' AS notes

  UNION ALL

  /* 7) duplicate target detail */
  SELECT
    'DATA' AS check_group,
    'duplicate_target_detail' AS check_name,
    CAST((
      SELECT COUNT(*)
      FROM (
        SELECT renstra_target_id, tahun, level, COUNT(*) AS c
        FROM renstra_target_detail
        GROUP BY renstra_target_id, tahun, level
        HAVING c > 1
      ) x
    ) AS UNSIGNED) AS issue_count,
    NULL AS status_override,
    'YES' AS blocking,
    'Duplikasi renstra_target_detail harus dibereskan sebelum menambah FK/unique.' AS notes

  UNION ALL

  /* 8) FK column type mismatch (di luar yang sengaja ditunda Phase 6) */
  SELECT
    'SCHEMA' AS check_group,
    'fk_column_type_mismatch' AS check_name,
    CAST((
      /* mismatch untuk mapping core */
      (
        SELECT COUNT(*)
        FROM (
          SELECT
            c.data_type AS child_data_type,
            c.column_type AS child_column_type,
            p.data_type AS parent_data_type,
            p.column_type AS parent_column_type
          FROM (
            SELECT 'sasaran' AS child_table, 'tujuan_id' AS child_column, 'tujuan' AS parent_table, 'id' AS parent_column
            UNION ALL SELECT 'strategi','sasaran_id','sasaran','id'
            UNION ALL SELECT 'arah_kebijakan','strategi_id','strategi','id'
            UNION ALL SELECT 'program','sasaran_id','sasaran','id'
            UNION ALL SELECT 'kegiatan','program_id','program','id'
            UNION ALL SELECT 'sub_kegiatan','kegiatan_id','kegiatan','id'
            UNION ALL SELECT 'program_arah_kebijakan','program_id','program','id'
            UNION ALL SELECT 'program_arah_kebijakan','arah_kebijakan_id','arah_kebijakan','id'
            UNION ALL SELECT 'program_strategi','program_id','program','id'
            UNION ALL SELECT 'program_strategi','strategi_id','strategi','id'
            UNION ALL SELECT 'renstra_tujuan','renstra_id','renstra_opd','id'
            UNION ALL SELECT 'renstra_sasaran','renstra_id','renstra_opd','id'
            UNION ALL SELECT 'renstra_sasaran','tujuan_id','renstra_tujuan','id'
            UNION ALL SELECT 'renstra_sasaran','rpjmd_sasaran_id','sasaran','id'
            UNION ALL SELECT 'renstra_strategi','renstra_id','renstra_opd','id'
            UNION ALL SELECT 'renstra_strategi','sasaran_id','renstra_sasaran','id'
            UNION ALL SELECT 'renstra_strategi','rpjmd_strategi_id','strategi','id'
            UNION ALL SELECT 'renstra_kebijakan','renstra_id','renstra_opd','id'
            UNION ALL SELECT 'renstra_kebijakan','strategi_id','renstra_strategi','id'
            UNION ALL SELECT 'renstra_kebijakan','rpjmd_arah_id','arah_kebijakan','id'
            UNION ALL SELECT 'renstra_program','renstra_id','renstra_opd','id'
            UNION ALL SELECT 'renstra_program','rpjmd_program_id','program','id'
            UNION ALL SELECT 'renstra_kegiatan','renstra_id','renstra_opd','id'
            UNION ALL SELECT 'renstra_kegiatan','program_id','renstra_program','id'
            UNION ALL SELECT 'renstra_kegiatan','rpjmd_kegiatan_id','kegiatan','id'
            UNION ALL SELECT 'renstra_subkegiatan','renstra_program_id','renstra_program','id'
            UNION ALL SELECT 'renstra_subkegiatan','kegiatan_id','renstra_kegiatan','id'
            UNION ALL SELECT 'renstra_subkegiatan','sub_kegiatan_id','sub_kegiatan','id'
            UNION ALL SELECT 'indikator_renstra','renstra_id','renstra_opd','id'
            UNION ALL SELECT 'renstra_target','indikator_id','indikator_renstra','id'
            UNION ALL SELECT 'renstra_target_detail','renstra_target_id','renstra_target','id'
          ) m
          JOIN information_schema.columns c
            ON c.table_schema = DATABASE() AND c.table_name = m.child_table AND c.column_name = m.child_column
          JOIN information_schema.columns p
            ON p.table_schema = DATABASE() AND p.table_name = m.parent_table AND p.column_name = m.parent_column
        ) x
        WHERE x.child_data_type <> x.parent_data_type
           OR (LOCATE('unsigned', x.child_column_type) > 0) <> (LOCATE('unsigned', x.parent_column_type) > 0)
      )
      +
      /* mismatch renstra_opd.rpjmd_id -> (rpjmd|rpjmds).id (best-effort) */
      (
        SELECT CASE
          WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='rpjmd') THEN
            (
              SELECT COALESCE(CASE
                WHEN c.data_type = p.data_type
                 AND (LOCATE('unsigned', c.column_type) > 0) = (LOCATE('unsigned', p.column_type) > 0)
                THEN 0 ELSE 1 END, 1)
              FROM information_schema.columns c
              JOIN information_schema.columns p
                ON p.table_schema=c.table_schema AND p.table_name='rpjmd' AND p.column_name='id'
              WHERE c.table_schema=DATABASE() AND c.table_name='renstra_opd' AND c.column_name='rpjmd_id'
              LIMIT 1
            )
          WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='rpjmds') THEN
            (
              SELECT COALESCE(CASE
                WHEN c.data_type = p.data_type
                 AND (LOCATE('unsigned', c.column_type) > 0) = (LOCATE('unsigned', p.column_type) > 0)
                THEN 0 ELSE 1 END, 1)
              FROM information_schema.columns c
              JOIN information_schema.columns p
                ON p.table_schema=c.table_schema AND p.table_name='rpjmds' AND p.column_name='id'
              WHERE c.table_schema=DATABASE() AND c.table_name='renstra_opd' AND c.column_name='rpjmd_id'
              LIMIT 1
            )
          ELSE 0
        END
      )
    ) AS UNSIGNED) AS issue_count,
    NULL AS status_override,
    'YES' AS blocking,
    'Tipe kolom child vs parent harus sama (termasuk signed/unsigned) sebelum FK dibuat.' AS notes

  UNION ALL

  /* 10) skipped FK renstra_tujuan.rpjmd_tujuan_id (ditunda Phase 6) */
  SELECT
    'SCHEMA' AS check_group,
    'skipped_fk_renstra_tujuan__rpjmd_tujuan_id__tujuan' AS check_name,
    CAST((
      /* data issues (non-numeric + missing parent untuk numerik) */
      (SELECT COUNT(*) FROM renstra_tujuan
        WHERE rpjmd_tujuan_id IS NOT NULL
          AND TRIM(CAST(rpjmd_tujuan_id AS CHAR)) <> ''
          AND CAST(rpjmd_tujuan_id AS CHAR) NOT REGEXP '^[0-9]+$'
      ) +
      (SELECT COUNT(*) FROM renstra_tujuan rt
        LEFT JOIN tujuan t ON t.id = CAST(rt.rpjmd_tujuan_id AS UNSIGNED)
        WHERE CAST(rt.rpjmd_tujuan_id AS CHAR) REGEXP '^[0-9]+$'
          AND t.id IS NULL
      )
    ) AS UNSIGNED) AS issue_count,
    /* WARN jika schema type mismatch (UUID/CHAR vs INT) sehingga FK memang di-skip Phase 5 */
    (
      SELECT CASE
        WHEN EXISTS(
          SELECT 1
          FROM information_schema.columns c
          JOIN information_schema.columns p
            ON p.table_schema=c.table_schema AND p.table_name='tujuan' AND p.column_name='id'
          WHERE c.table_schema=DATABASE()
            AND c.table_name='renstra_tujuan' AND c.column_name='rpjmd_tujuan_id'
            AND (
              c.data_type <> p.data_type
              OR (LOCATE('unsigned', c.column_type) > 0) <> (LOCATE('unsigned', p.column_type) > 0)
            )
        ) THEN 'WARN'
        ELSE NULL
      END
    ) AS status_override,
    'NO' AS blocking,
    'FK renstra_tujuan.rpjmd_tujuan_id -> tujuan.id ditunda Phase 6 (mismatch UUID/INT & perlu backfill bertahap).' AS notes
) s
ORDER BY s.check_group, s.check_name;

/* ============================================================
   6) FINAL DECISION — READY_FOR_FK / NOT_READY_FOR_FK
============================================================ */
SELECT
  CASE
    WHEN (
      /* blocking totals = 0 => READY */
      (
        /* non-InnoDB */
        (SELECT COUNT(*) FROM information_schema.tables t
         WHERE t.table_schema = DATABASE()
           AND t.table_name IN (
             'tujuan','sasaran','strategi','arah_kebijakan',
             'program','kegiatan','sub_kegiatan',
             'program_arah_kebijakan','program_strategi',
             'renstra_opd','renstra_tujuan','renstra_sasaran','renstra_strategi','renstra_kebijakan',
             'renstra_program','renstra_kegiatan','renstra_subkegiatan',
             'indikator_renstra','renstra_target','renstra_target_detail'
             ,'rpjmd','rpjmds'
           )
           AND (t.engine IS NULL OR t.engine <> 'InnoDB')
        )
        +
        /* missing required tables + require rpjmd/rpjmds */
        (
          (SELECT COUNT(*)
           FROM (
             SELECT 'tujuan' AS table_name UNION ALL
             SELECT 'sasaran' UNION ALL
             SELECT 'strategi' UNION ALL
             SELECT 'arah_kebijakan' UNION ALL
             SELECT 'program' UNION ALL
             SELECT 'kegiatan' UNION ALL
             SELECT 'sub_kegiatan' UNION ALL
             SELECT 'program_arah_kebijakan' UNION ALL
             SELECT 'program_strategi' UNION ALL
             SELECT 'renstra_opd' UNION ALL
             SELECT 'renstra_tujuan' UNION ALL
             SELECT 'renstra_sasaran' UNION ALL
             SELECT 'renstra_strategi' UNION ALL
             SELECT 'renstra_kebijakan' UNION ALL
             SELECT 'renstra_program' UNION ALL
             SELECT 'renstra_kegiatan' UNION ALL
             SELECT 'renstra_subkegiatan' UNION ALL
             SELECT 'indikator_renstra' UNION ALL
             SELECT 'renstra_target' UNION ALL
             SELECT 'renstra_target_detail'
           ) req
           LEFT JOIN information_schema.tables t
             ON t.table_schema = DATABASE() AND t.table_name = req.table_name
           WHERE t.table_name IS NULL
          )
          +
          (SELECT CASE
            WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='rpjmd') THEN 0
            WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='rpjmds') THEN 0
            ELSE 1
          END)
        )
        +
        /* missing FK columns for core mapping (excluding deferred renstra_tujuan.rpjmd_tujuan_id) */
        (
          SELECT COUNT(*)
          FROM (
            SELECT 'sasaran' AS child_table, 'tujuan_id' AS child_column, 'tujuan' AS parent_table, 'id' AS parent_column
            UNION ALL SELECT 'strategi','sasaran_id','sasaran','id'
            UNION ALL SELECT 'arah_kebijakan','strategi_id','strategi','id'
            UNION ALL SELECT 'program','sasaran_id','sasaran','id'
            UNION ALL SELECT 'kegiatan','program_id','program','id'
            UNION ALL SELECT 'sub_kegiatan','kegiatan_id','kegiatan','id'
            UNION ALL SELECT 'program_arah_kebijakan','program_id','program','id'
            UNION ALL SELECT 'program_arah_kebijakan','arah_kebijakan_id','arah_kebijakan','id'
            UNION ALL SELECT 'program_strategi','program_id','program','id'
            UNION ALL SELECT 'program_strategi','strategi_id','strategi','id'
            UNION ALL SELECT 'renstra_tujuan','renstra_id','renstra_opd','id'
            UNION ALL SELECT 'renstra_sasaran','renstra_id','renstra_opd','id'
            UNION ALL SELECT 'renstra_sasaran','tujuan_id','renstra_tujuan','id'
            UNION ALL SELECT 'renstra_sasaran','rpjmd_sasaran_id','sasaran','id'
            UNION ALL SELECT 'renstra_strategi','renstra_id','renstra_opd','id'
            UNION ALL SELECT 'renstra_strategi','sasaran_id','renstra_sasaran','id'
            UNION ALL SELECT 'renstra_strategi','rpjmd_strategi_id','strategi','id'
            UNION ALL SELECT 'renstra_kebijakan','renstra_id','renstra_opd','id'
            UNION ALL SELECT 'renstra_kebijakan','strategi_id','renstra_strategi','id'
            UNION ALL SELECT 'renstra_kebijakan','rpjmd_arah_id','arah_kebijakan','id'
            UNION ALL SELECT 'renstra_program','renstra_id','renstra_opd','id'
            UNION ALL SELECT 'renstra_program','rpjmd_program_id','program','id'
            UNION ALL SELECT 'renstra_kegiatan','renstra_id','renstra_opd','id'
            UNION ALL SELECT 'renstra_kegiatan','program_id','renstra_program','id'
            UNION ALL SELECT 'renstra_kegiatan','rpjmd_kegiatan_id','kegiatan','id'
            UNION ALL SELECT 'renstra_subkegiatan','renstra_program_id','renstra_program','id'
            UNION ALL SELECT 'renstra_subkegiatan','kegiatan_id','renstra_kegiatan','id'
            UNION ALL SELECT 'renstra_subkegiatan','sub_kegiatan_id','sub_kegiatan','id'
            UNION ALL SELECT 'indikator_renstra','renstra_id','renstra_opd','id'
            UNION ALL SELECT 'renstra_target','indikator_id','indikator_renstra','id'
            UNION ALL SELECT 'renstra_target_detail','renstra_target_id','renstra_target','id'
          ) m
          LEFT JOIN information_schema.columns c
            ON c.table_schema = DATABASE() AND c.table_name = m.child_table AND c.column_name = m.child_column
          LEFT JOIN information_schema.columns p
            ON p.table_schema = DATABASE() AND p.table_name = m.parent_table AND p.column_name = m.parent_column
          WHERE c.column_name IS NULL OR p.column_name IS NULL
        )
        +
        /* missing renstra_opd.rpjmd_id column */
        (
          SELECT CASE
            WHEN EXISTS(
              SELECT 1 FROM information_schema.columns
              WHERE table_schema = DATABASE() AND table_name = 'renstra_opd' AND column_name = 'rpjmd_id'
            ) THEN 0
            ELSE 1
          END
        )
        +
        /* orphan RPJMD chain */
        (
          (SELECT COUNT(*) FROM sasaran s LEFT JOIN tujuan t ON t.id=s.tujuan_id WHERE s.tujuan_id IS NOT NULL AND t.id IS NULL) +
          (SELECT COUNT(*) FROM strategi st LEFT JOIN sasaran s ON s.id=st.sasaran_id WHERE st.sasaran_id IS NOT NULL AND s.id IS NULL) +
          (SELECT COUNT(*) FROM arah_kebijakan a LEFT JOIN strategi st ON st.id=a.strategi_id WHERE a.strategi_id IS NOT NULL AND st.id IS NULL) +
          (SELECT COUNT(*) FROM program p LEFT JOIN sasaran s ON s.id=p.sasaran_id WHERE p.sasaran_id IS NOT NULL AND s.id IS NULL) +
          (SELECT COUNT(*) FROM kegiatan k LEFT JOIN program p ON p.id=k.program_id WHERE k.program_id IS NOT NULL AND p.id IS NULL) +
          (SELECT COUNT(*) FROM sub_kegiatan sk LEFT JOIN kegiatan k ON k.id=sk.kegiatan_id WHERE sk.kegiatan_id IS NOT NULL AND k.id IS NULL)
        )
        +
        /* orphan Renstra chain */
        (
          (SELECT COUNT(*) FROM renstra_program rp LEFT JOIN renstra_opd ro ON ro.id=rp.renstra_id WHERE rp.renstra_id IS NOT NULL AND ro.id IS NULL) +
          (SELECT COUNT(*) FROM renstra_kegiatan rk LEFT JOIN renstra_opd ro ON ro.id=rk.renstra_id WHERE rk.renstra_id IS NOT NULL AND ro.id IS NULL) +
          (SELECT COUNT(*) FROM renstra_tujuan rt LEFT JOIN renstra_opd ro ON ro.id=rt.renstra_id WHERE rt.renstra_id IS NOT NULL AND ro.id IS NULL) +
          (SELECT COUNT(*) FROM renstra_sasaran rs LEFT JOIN renstra_opd ro ON ro.id=rs.renstra_id WHERE rs.renstra_id IS NOT NULL AND ro.id IS NULL) +
          (SELECT COUNT(*) FROM renstra_strategi rstr LEFT JOIN renstra_opd ro ON ro.id=rstr.renstra_id WHERE rstr.renstra_id IS NOT NULL AND ro.id IS NULL) +
          (SELECT COUNT(*) FROM renstra_kebijakan rk LEFT JOIN renstra_opd ro ON ro.id=rk.renstra_id WHERE rk.renstra_id IS NOT NULL AND ro.id IS NULL) +
          (SELECT COUNT(*) FROM renstra_sasaran rs LEFT JOIN renstra_tujuan rt ON rt.id=rs.tujuan_id WHERE rs.tujuan_id IS NOT NULL AND rt.id IS NULL) +
          (SELECT COUNT(*) FROM renstra_strategi rstr LEFT JOIN renstra_sasaran rs ON rs.id=rstr.sasaran_id WHERE rstr.sasaran_id IS NOT NULL AND rs.id IS NULL) +
          (SELECT COUNT(*) FROM renstra_kebijakan rk LEFT JOIN renstra_strategi rstr ON rstr.id=rk.strategi_id WHERE rk.strategi_id IS NOT NULL AND rstr.id IS NULL) +
          (SELECT COUNT(*) FROM renstra_kegiatan rk LEFT JOIN renstra_program rp ON rp.id=rk.program_id WHERE rk.program_id IS NOT NULL AND rp.id IS NULL) +
          (SELECT COUNT(*) FROM renstra_subkegiatan rsk LEFT JOIN renstra_program rp ON rp.id=rsk.renstra_program_id WHERE rsk.renstra_program_id IS NOT NULL AND rp.id IS NULL) +
          (SELECT COUNT(*) FROM renstra_subkegiatan rsk LEFT JOIN renstra_kegiatan rk ON rk.id=rsk.kegiatan_id WHERE rsk.kegiatan_id IS NOT NULL AND rk.id IS NULL) +
          (SELECT COUNT(*) FROM renstra_subkegiatan rsk LEFT JOIN sub_kegiatan sk ON sk.id=rsk.sub_kegiatan_id WHERE rsk.sub_kegiatan_id IS NOT NULL AND sk.id IS NULL) +
          (SELECT COUNT(*) FROM indikator_renstra ir LEFT JOIN renstra_opd ro ON ro.id=ir.renstra_id WHERE ir.renstra_id IS NOT NULL AND ro.id IS NULL) +
          (SELECT COUNT(*) FROM renstra_target rt LEFT JOIN indikator_renstra ir ON ir.id=rt.indikator_id WHERE rt.indikator_id IS NOT NULL AND ir.id IS NULL) +
          (SELECT COUNT(*) FROM renstra_target_detail d LEFT JOIN renstra_target rt ON rt.id=d.renstra_target_id WHERE d.renstra_target_id IS NOT NULL AND rt.id IS NULL) +
          COALESCE(@phase5_orphan_renstra_opd_rpjmd, 0) +
          (SELECT COUNT(*) FROM renstra_program rp LEFT JOIN program p ON p.id = CAST(rp.rpjmd_program_id AS UNSIGNED)
            WHERE CAST(rp.rpjmd_program_id AS CHAR) REGEXP '^[0-9]+$' AND p.id IS NULL
          ) +
          (SELECT COUNT(*) FROM renstra_sasaran rs LEFT JOIN sasaran s ON s.id = rs.rpjmd_sasaran_id
            WHERE rs.rpjmd_sasaran_id IS NOT NULL AND s.id IS NULL
          ) +
          (SELECT COUNT(*) FROM renstra_strategi rstr LEFT JOIN strategi st ON st.id = rstr.rpjmd_strategi_id
            WHERE rstr.rpjmd_strategi_id IS NOT NULL AND st.id IS NULL
          ) +
          (SELECT COUNT(*) FROM renstra_kebijakan rk LEFT JOIN arah_kebijakan a ON a.id = rk.rpjmd_arah_id
            WHERE rk.rpjmd_arah_id IS NOT NULL AND a.id IS NULL
          ) +
          (SELECT COUNT(*) FROM renstra_kegiatan rk LEFT JOIN kegiatan k ON k.id = rk.rpjmd_kegiatan_id
            WHERE rk.rpjmd_kegiatan_id IS NOT NULL AND k.id IS NULL
          )
        )
        +
        /* broken RPJMD chain */
        (
          SELECT COUNT(*) FROM (
            SELECT p.id
            FROM program p
            LEFT JOIN program_arah_kebijakan pak ON pak.program_id = p.id
            GROUP BY p.id
            HAVING COUNT(pak.arah_kebijakan_id) = 0
          ) x
        )
        +
        /* broken Renstra chain */
        (
          (SELECT COUNT(*) FROM renstra_sasaran rs
            JOIN renstra_tujuan rt ON rt.id=rs.tujuan_id
            JOIN sasaran s ON s.id=rs.rpjmd_sasaran_id
            WHERE CAST(rt.rpjmd_tujuan_id AS CHAR) REGEXP '^[0-9]+$'
              AND s.tujuan_id IS NOT NULL
              AND s.tujuan_id <> CAST(rt.rpjmd_tujuan_id AS UNSIGNED)
          ) +
          (SELECT COUNT(*) FROM renstra_strategi rstr
            JOIN renstra_sasaran rs ON rs.id=rstr.sasaran_id
            JOIN strategi st ON st.id=rstr.rpjmd_strategi_id
            WHERE rs.rpjmd_sasaran_id IS NOT NULL
              AND st.sasaran_id IS NOT NULL
              AND st.sasaran_id <> rs.rpjmd_sasaran_id
          ) +
          (SELECT COUNT(*) FROM renstra_kebijakan rk
            JOIN renstra_strategi rstr ON rstr.id=rk.strategi_id
            JOIN arah_kebijakan a ON a.id=rk.rpjmd_arah_id
            WHERE rstr.rpjmd_strategi_id IS NOT NULL
              AND a.strategi_id IS NOT NULL
              AND a.strategi_id <> rstr.rpjmd_strategi_id
          )
        )
        +
        /* pivot invalid */
        (
          (SELECT COUNT(*) FROM program_arah_kebijakan pak
            LEFT JOIN program p ON p.id=pak.program_id
            LEFT JOIN arah_kebijakan a ON a.id=pak.arah_kebijakan_id
            WHERE p.id IS NULL OR a.id IS NULL
          ) +
          (SELECT COUNT(*) FROM program_strategi ps
            LEFT JOIN program p ON p.id=ps.program_id
            LEFT JOIN strategi st ON st.id=ps.strategi_id
            WHERE p.id IS NULL OR st.id IS NULL
          )
        )
        +
        /* duplicate target detail */
        (
          SELECT COUNT(*)
          FROM (
            SELECT renstra_target_id, tahun, level, COUNT(*) AS c
            FROM renstra_target_detail
            GROUP BY renstra_target_id, tahun, level
            HAVING c > 1
          ) x
        )
        +
        /* FK column type mismatch (core mapping + renstra_opd->rpjmd) */
        (
          (
            SELECT COUNT(*)
            FROM (
              SELECT
                c.data_type AS child_data_type,
                c.column_type AS child_column_type,
                p.data_type AS parent_data_type,
                p.column_type AS parent_column_type
              FROM (
                SELECT 'sasaran' AS child_table, 'tujuan_id' AS child_column, 'tujuan' AS parent_table, 'id' AS parent_column
                UNION ALL SELECT 'strategi','sasaran_id','sasaran','id'
                UNION ALL SELECT 'arah_kebijakan','strategi_id','strategi','id'
                UNION ALL SELECT 'program','sasaran_id','sasaran','id'
                UNION ALL SELECT 'kegiatan','program_id','program','id'
                UNION ALL SELECT 'sub_kegiatan','kegiatan_id','kegiatan','id'
                UNION ALL SELECT 'program_arah_kebijakan','program_id','program','id'
                UNION ALL SELECT 'program_arah_kebijakan','arah_kebijakan_id','arah_kebijakan','id'
                UNION ALL SELECT 'program_strategi','program_id','program','id'
                UNION ALL SELECT 'program_strategi','strategi_id','strategi','id'
                UNION ALL SELECT 'renstra_tujuan','renstra_id','renstra_opd','id'
                UNION ALL SELECT 'renstra_sasaran','renstra_id','renstra_opd','id'
                UNION ALL SELECT 'renstra_sasaran','tujuan_id','renstra_tujuan','id'
                UNION ALL SELECT 'renstra_sasaran','rpjmd_sasaran_id','sasaran','id'
                UNION ALL SELECT 'renstra_strategi','renstra_id','renstra_opd','id'
                UNION ALL SELECT 'renstra_strategi','sasaran_id','renstra_sasaran','id'
                UNION ALL SELECT 'renstra_strategi','rpjmd_strategi_id','strategi','id'
                UNION ALL SELECT 'renstra_kebijakan','renstra_id','renstra_opd','id'
                UNION ALL SELECT 'renstra_kebijakan','strategi_id','renstra_strategi','id'
                UNION ALL SELECT 'renstra_kebijakan','rpjmd_arah_id','arah_kebijakan','id'
                UNION ALL SELECT 'renstra_program','renstra_id','renstra_opd','id'
                UNION ALL SELECT 'renstra_program','rpjmd_program_id','program','id'
                UNION ALL SELECT 'renstra_kegiatan','renstra_id','renstra_opd','id'
                UNION ALL SELECT 'renstra_kegiatan','program_id','renstra_program','id'
                UNION ALL SELECT 'renstra_kegiatan','rpjmd_kegiatan_id','kegiatan','id'
                UNION ALL SELECT 'renstra_subkegiatan','renstra_program_id','renstra_program','id'
                UNION ALL SELECT 'renstra_subkegiatan','kegiatan_id','renstra_kegiatan','id'
                UNION ALL SELECT 'renstra_subkegiatan','sub_kegiatan_id','sub_kegiatan','id'
                UNION ALL SELECT 'indikator_renstra','renstra_id','renstra_opd','id'
                UNION ALL SELECT 'renstra_target','indikator_id','indikator_renstra','id'
                UNION ALL SELECT 'renstra_target_detail','renstra_target_id','renstra_target','id'
              ) m
              JOIN information_schema.columns c
                ON c.table_schema = DATABASE() AND c.table_name = m.child_table AND c.column_name = m.child_column
              JOIN information_schema.columns p
                ON p.table_schema = DATABASE() AND p.table_name = m.parent_table AND p.column_name = m.parent_column
            ) x
            WHERE x.child_data_type <> x.parent_data_type
               OR (LOCATE('unsigned', x.child_column_type) > 0) <> (LOCATE('unsigned', x.parent_column_type) > 0)
          )
          +
          (
            SELECT CASE
              WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='rpjmd') THEN
                (
                  SELECT COALESCE(CASE
                    WHEN c.data_type = p.data_type
                     AND (LOCATE('unsigned', c.column_type) > 0) = (LOCATE('unsigned', p.column_type) > 0)
                    THEN 0 ELSE 1 END, 1)
                  FROM information_schema.columns c
                  JOIN information_schema.columns p
                    ON p.table_schema=c.table_schema AND p.table_name='rpjmd' AND p.column_name='id'
                  WHERE c.table_schema=DATABASE() AND c.table_name='renstra_opd' AND c.column_name='rpjmd_id'
                  LIMIT 1
                )
              WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='rpjmds') THEN
                (
                  SELECT COALESCE(CASE
                    WHEN c.data_type = p.data_type
                     AND (LOCATE('unsigned', c.column_type) > 0) = (LOCATE('unsigned', p.column_type) > 0)
                    THEN 0 ELSE 1 END, 1)
                  FROM information_schema.columns c
                  JOIN information_schema.columns p
                    ON p.table_schema=c.table_schema AND p.table_name='rpjmds' AND p.column_name='id'
                  WHERE c.table_schema=DATABASE() AND c.table_name='renstra_opd' AND c.column_name='rpjmd_id'
                  LIMIT 1
                )
              ELSE 0
            END
          )
        )
      ) = 0
    ) THEN 'READY_FOR_FK'
    ELSE 'NOT_READY_FOR_FK'
  END AS final_decision;
