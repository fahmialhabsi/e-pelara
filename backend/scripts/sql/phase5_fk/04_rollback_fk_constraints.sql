/*
  Phase 5 — Rollback FK Constraints + Phase5 Indexes
  - Drop semua FK yang ditambahkan oleh `03_add_fk_constraints.sql`
  - Drop index `idx_fk_*` hanya jika index tersebut dibuat oleh Phase 5

  Aman dijalankan berulang: DROP dilakukan hanya jika objek ada.
*/

SET @db := DATABASE();

/* Pastikan string-literal pakai double quote tetap kompatibel jika sql_mode mengandung ANSI_QUOTES */
SET @phase5_orig_sql_mode := @@SESSION.sql_mode;
SET SESSION sql_mode = REPLACE(@@SESSION.sql_mode, 'ANSI_QUOTES', '');

/* Helper: drop fk if exists */
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_renstra_opd__rpjmd_id__rpjmd'),
    "ALTER TABLE renstra_opd DROP FOREIGN KEY fk_renstra_opd__rpjmd_id__rpjmd",
    "SELECT 'SKIP drop fk_renstra_opd__rpjmd_id__rpjmd (not found)' AS msg"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_sasaran__tujuan_id__tujuan'),
    "ALTER TABLE sasaran DROP FOREIGN KEY fk_sasaran__tujuan_id__tujuan",
    "SELECT 'SKIP drop fk_sasaran__tujuan_id__tujuan (not found)' AS msg"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_strategi__sasaran_id__sasaran'),
    "ALTER TABLE strategi DROP FOREIGN KEY fk_strategi__sasaran_id__sasaran",
    "SELECT 'SKIP drop fk_strategi__sasaran_id__sasaran (not found)' AS msg"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_arah_kebijakan__strategi_id__strategi'),
    "ALTER TABLE arah_kebijakan DROP FOREIGN KEY fk_arah_kebijakan__strategi_id__strategi",
    "SELECT 'SKIP drop fk_arah_kebijakan__strategi_id__strategi (not found)' AS msg"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_program__sasaran_id__sasaran'),
    "ALTER TABLE program DROP FOREIGN KEY fk_program__sasaran_id__sasaran",
    "SELECT 'SKIP drop fk_program__sasaran_id__sasaran (not found)' AS msg"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_kegiatan__program_id__program'),
    "ALTER TABLE kegiatan DROP FOREIGN KEY fk_kegiatan__program_id__program",
    "SELECT 'SKIP drop fk_kegiatan__program_id__program (not found)' AS msg"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_sub_kegiatan__kegiatan_id__kegiatan'),
    "ALTER TABLE sub_kegiatan DROP FOREIGN KEY fk_sub_kegiatan__kegiatan_id__kegiatan",
    "SELECT 'SKIP drop fk_sub_kegiatan__kegiatan_id__kegiatan (not found)' AS msg"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* Pivot */
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_program_arah_kebijakan__program_id__program'),
    "ALTER TABLE program_arah_kebijakan DROP FOREIGN KEY fk_program_arah_kebijakan__program_id__program",
    "SELECT 'SKIP drop fk_program_arah_kebijakan__program_id__program (not found)' AS msg"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_program_arah_kebijakan__arah_kebijakan_id__arah_kebijakan'),
    "ALTER TABLE program_arah_kebijakan DROP FOREIGN KEY fk_program_arah_kebijakan__arah_kebijakan_id__arah_kebijakan",
    "SELECT 'SKIP drop fk_program_arah_kebijakan__arah_kebijakan_id__arah_kebijakan (not found)' AS msg"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_program_strategi__program_id__program'),
    "ALTER TABLE program_strategi DROP FOREIGN KEY fk_program_strategi__program_id__program",
    "SELECT 'SKIP drop fk_program_strategi__program_id__program (not found)' AS msg"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_program_strategi__strategi_id__strategi'),
    "ALTER TABLE program_strategi DROP FOREIGN KEY fk_program_strategi__strategi_id__strategi",
    "SELECT 'SKIP drop fk_program_strategi__strategi_id__strategi (not found)' AS msg"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* Renstra */
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_renstra_tujuan__renstra_id__renstra_opd'),
    "ALTER TABLE renstra_tujuan DROP FOREIGN KEY fk_renstra_tujuan__renstra_id__renstra_opd",
    "SELECT 'SKIP drop fk_renstra_tujuan__renstra_id__renstra_opd (not found)' AS msg"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_renstra_sasaran__renstra_id__renstra_opd'),
    "ALTER TABLE renstra_sasaran DROP FOREIGN KEY fk_renstra_sasaran__renstra_id__renstra_opd",
    "SELECT 'SKIP drop fk_renstra_sasaran__renstra_id__renstra_opd (not found)' AS msg"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_renstra_sasaran__tujuan_id__renstra_tujuan'),
    "ALTER TABLE renstra_sasaran DROP FOREIGN KEY fk_renstra_sasaran__tujuan_id__renstra_tujuan",
    "SELECT 'SKIP drop fk_renstra_sasaran__tujuan_id__renstra_tujuan (not found)' AS msg"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_renstra_sasaran__rpjmd_sasaran_id__sasaran'),
    "ALTER TABLE renstra_sasaran DROP FOREIGN KEY fk_renstra_sasaran__rpjmd_sasaran_id__sasaran",
    "SELECT 'SKIP drop fk_renstra_sasaran__rpjmd_sasaran_id__sasaran (not found)' AS msg"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_renstra_strategi__renstra_id__renstra_opd'),
    "ALTER TABLE renstra_strategi DROP FOREIGN KEY fk_renstra_strategi__renstra_id__renstra_opd",
    "SELECT 'SKIP drop fk_renstra_strategi__renstra_id__renstra_opd (not found)' AS msg"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_renstra_strategi__sasaran_id__renstra_sasaran'),
    "ALTER TABLE renstra_strategi DROP FOREIGN KEY fk_renstra_strategi__sasaran_id__renstra_sasaran",
    "SELECT 'SKIP drop fk_renstra_strategi__sasaran_id__renstra_sasaran (not found)' AS msg"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_renstra_strategi__rpjmd_strategi_id__strategi'),
    "ALTER TABLE renstra_strategi DROP FOREIGN KEY fk_renstra_strategi__rpjmd_strategi_id__strategi",
    "SELECT 'SKIP drop fk_renstra_strategi__rpjmd_strategi_id__strategi (not found)' AS msg"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_renstra_kebijakan__renstra_id__renstra_opd'),
    "ALTER TABLE renstra_kebijakan DROP FOREIGN KEY fk_renstra_kebijakan__renstra_id__renstra_opd",
    "SELECT 'SKIP drop fk_renstra_kebijakan__renstra_id__renstra_opd (not found)' AS msg"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_renstra_kebijakan__strategi_id__renstra_strategi'),
    "ALTER TABLE renstra_kebijakan DROP FOREIGN KEY fk_renstra_kebijakan__strategi_id__renstra_strategi",
    "SELECT 'SKIP drop fk_renstra_kebijakan__strategi_id__renstra_strategi (not found)' AS msg"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_renstra_kebijakan__rpjmd_arah_id__arah_kebijakan'),
    "ALTER TABLE renstra_kebijakan DROP FOREIGN KEY fk_renstra_kebijakan__rpjmd_arah_id__arah_kebijakan",
    "SELECT 'SKIP drop fk_renstra_kebijakan__rpjmd_arah_id__arah_kebijakan (not found)' AS msg"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_renstra_program__renstra_id__renstra_opd'),
    "ALTER TABLE renstra_program DROP FOREIGN KEY fk_renstra_program__renstra_id__renstra_opd",
    "SELECT 'SKIP drop fk_renstra_program__renstra_id__renstra_opd (not found)' AS msg"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_renstra_program__rpjmd_program_id__program'),
    "ALTER TABLE renstra_program DROP FOREIGN KEY fk_renstra_program__rpjmd_program_id__program",
    "SELECT 'SKIP drop fk_renstra_program__rpjmd_program_id__program (not found)' AS msg"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_renstra_kegiatan__renstra_id__renstra_opd'),
    "ALTER TABLE renstra_kegiatan DROP FOREIGN KEY fk_renstra_kegiatan__renstra_id__renstra_opd",
    "SELECT 'SKIP drop fk_renstra_kegiatan__renstra_id__renstra_opd (not found)' AS msg"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_renstra_kegiatan__program_id__renstra_program'),
    "ALTER TABLE renstra_kegiatan DROP FOREIGN KEY fk_renstra_kegiatan__program_id__renstra_program",
    "SELECT 'SKIP drop fk_renstra_kegiatan__program_id__renstra_program (not found)' AS msg"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_renstra_kegiatan__rpjmd_kegiatan_id__kegiatan'),
    "ALTER TABLE renstra_kegiatan DROP FOREIGN KEY fk_renstra_kegiatan__rpjmd_kegiatan_id__kegiatan",
    "SELECT 'SKIP drop fk_renstra_kegiatan__rpjmd_kegiatan_id__kegiatan (not found)' AS msg"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_renstra_subkegiatan__renstra_program_id__renstra_program'),
    "ALTER TABLE renstra_subkegiatan DROP FOREIGN KEY fk_renstra_subkegiatan__renstra_program_id__renstra_program",
    "SELECT 'SKIP drop fk_renstra_subkegiatan__renstra_program_id__renstra_program (not found)' AS msg"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_renstra_subkegiatan__kegiatan_id__renstra_kegiatan'),
    "ALTER TABLE renstra_subkegiatan DROP FOREIGN KEY fk_renstra_subkegiatan__kegiatan_id__renstra_kegiatan",
    "SELECT 'SKIP drop fk_renstra_subkegiatan__kegiatan_id__renstra_kegiatan (not found)' AS msg"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_renstra_subkegiatan__sub_kegiatan_id__sub_kegiatan'),
    "ALTER TABLE renstra_subkegiatan DROP FOREIGN KEY fk_renstra_subkegiatan__sub_kegiatan_id__sub_kegiatan",
    "SELECT 'SKIP drop fk_renstra_subkegiatan__sub_kegiatan_id__sub_kegiatan (not found)' AS msg"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* Targets */
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_indikator_renstra__renstra_id__renstra_opd'),
    "ALTER TABLE indikator_renstra DROP FOREIGN KEY fk_indikator_renstra__renstra_id__renstra_opd",
    "SELECT 'SKIP drop fk_indikator_renstra__renstra_id__renstra_opd (not found)' AS msg"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_renstra_target__indikator_id__indikator_renstra'),
    "ALTER TABLE renstra_target DROP FOREIGN KEY fk_renstra_target__indikator_id__indikator_renstra",
    "SELECT 'SKIP drop fk_renstra_target__indikator_id__indikator_renstra (not found)' AS msg"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_renstra_target_detail__renstra_target_id__renstra_target'),
    "ALTER TABLE renstra_target_detail DROP FOREIGN KEY fk_renstra_target_detail__renstra_target_id__renstra_target",
    "SELECT 'SKIP drop fk_renstra_target_detail__renstra_target_id__renstra_target (not found)' AS msg"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* ============================================================
   Drop Phase 5 indexes (only by explicit name)
============================================================ */
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=@db AND table_name='sasaran' AND index_name='idx_fk_sasaran__tujuan_id'),
  "ALTER TABLE sasaran DROP INDEX idx_fk_sasaran__tujuan_id",
  "SELECT 'SKIP drop idx_fk_sasaran__tujuan_id' AS msg"));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=@db AND table_name='renstra_opd' AND index_name='idx_fk_renstra_opd__rpjmd_id'),
  "ALTER TABLE renstra_opd DROP INDEX idx_fk_renstra_opd__rpjmd_id",
  "SELECT 'SKIP drop idx_fk_renstra_opd__rpjmd_id' AS msg"));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=@db AND table_name='strategi' AND index_name='idx_fk_strategi__sasaran_id'),
  "ALTER TABLE strategi DROP INDEX idx_fk_strategi__sasaran_id",
  "SELECT 'SKIP drop idx_fk_strategi__sasaran_id' AS msg"));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=@db AND table_name='arah_kebijakan' AND index_name='idx_fk_arah_kebijakan__strategi_id'),
  "ALTER TABLE arah_kebijakan DROP INDEX idx_fk_arah_kebijakan__strategi_id",
  "SELECT 'SKIP drop idx_fk_arah_kebijakan__strategi_id' AS msg"));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=@db AND table_name='program' AND index_name='idx_fk_program__sasaran_id'),
  "ALTER TABLE program DROP INDEX idx_fk_program__sasaran_id",
  "SELECT 'SKIP drop idx_fk_program__sasaran_id' AS msg"));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=@db AND table_name='kegiatan' AND index_name='idx_fk_kegiatan__program_id'),
  "ALTER TABLE kegiatan DROP INDEX idx_fk_kegiatan__program_id",
  "SELECT 'SKIP drop idx_fk_kegiatan__program_id' AS msg"));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=@db AND table_name='sub_kegiatan' AND index_name='idx_fk_sub_kegiatan__kegiatan_id'),
  "ALTER TABLE sub_kegiatan DROP INDEX idx_fk_sub_kegiatan__kegiatan_id",
  "SELECT 'SKIP drop idx_fk_sub_kegiatan__kegiatan_id' AS msg"));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=@db AND table_name='program_arah_kebijakan' AND index_name='idx_fk_program_arah_kebijakan__program_id'),
  "ALTER TABLE program_arah_kebijakan DROP INDEX idx_fk_program_arah_kebijakan__program_id",
  "SELECT 'SKIP drop idx_fk_program_arah_kebijakan__program_id' AS msg"));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=@db AND table_name='program_arah_kebijakan' AND index_name='idx_fk_program_arah_kebijakan__arah_kebijakan_id'),
  "ALTER TABLE program_arah_kebijakan DROP INDEX idx_fk_program_arah_kebijakan__arah_kebijakan_id",
  "SELECT 'SKIP drop idx_fk_program_arah_kebijakan__arah_kebijakan_id' AS msg"));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=@db AND table_name='program_strategi' AND index_name='idx_fk_program_strategi__program_id'),
  "ALTER TABLE program_strategi DROP INDEX idx_fk_program_strategi__program_id",
  "SELECT 'SKIP drop idx_fk_program_strategi__program_id' AS msg"));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=@db AND table_name='program_strategi' AND index_name='idx_fk_program_strategi__strategi_id'),
  "ALTER TABLE program_strategi DROP INDEX idx_fk_program_strategi__strategi_id",
  "SELECT 'SKIP drop idx_fk_program_strategi__strategi_id' AS msg"));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=@db AND table_name='renstra_tujuan' AND index_name='idx_fk_renstra_tujuan__renstra_id'),
  "ALTER TABLE renstra_tujuan DROP INDEX idx_fk_renstra_tujuan__renstra_id",
  "SELECT 'SKIP drop idx_fk_renstra_tujuan__renstra_id' AS msg"));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=@db AND table_name='renstra_sasaran' AND index_name='idx_fk_renstra_sasaran__renstra_id'),
  "ALTER TABLE renstra_sasaran DROP INDEX idx_fk_renstra_sasaran__renstra_id",
  "SELECT 'SKIP drop idx_fk_renstra_sasaran__renstra_id' AS msg"));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=@db AND table_name='renstra_sasaran' AND index_name='idx_fk_renstra_sasaran__tujuan_id'),
  "ALTER TABLE renstra_sasaran DROP INDEX idx_fk_renstra_sasaran__tujuan_id",
  "SELECT 'SKIP drop idx_fk_renstra_sasaran__tujuan_id' AS msg"));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=@db AND table_name='renstra_sasaran' AND index_name='idx_fk_renstra_sasaran__rpjmd_sasaran_id'),
  "ALTER TABLE renstra_sasaran DROP INDEX idx_fk_renstra_sasaran__rpjmd_sasaran_id",
  "SELECT 'SKIP drop idx_fk_renstra_sasaran__rpjmd_sasaran_id' AS msg"));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=@db AND table_name='renstra_strategi' AND index_name='idx_fk_renstra_strategi__renstra_id'),
  "ALTER TABLE renstra_strategi DROP INDEX idx_fk_renstra_strategi__renstra_id",
  "SELECT 'SKIP drop idx_fk_renstra_strategi__renstra_id' AS msg"));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=@db AND table_name='renstra_strategi' AND index_name='idx_fk_renstra_strategi__sasaran_id'),
  "ALTER TABLE renstra_strategi DROP INDEX idx_fk_renstra_strategi__sasaran_id",
  "SELECT 'SKIP drop idx_fk_renstra_strategi__sasaran_id' AS msg"));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=@db AND table_name='renstra_strategi' AND index_name='idx_fk_renstra_strategi__rpjmd_strategi_id'),
  "ALTER TABLE renstra_strategi DROP INDEX idx_fk_renstra_strategi__rpjmd_strategi_id",
  "SELECT 'SKIP drop idx_fk_renstra_strategi__rpjmd_strategi_id' AS msg"));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=@db AND table_name='renstra_kebijakan' AND index_name='idx_fk_renstra_kebijakan__renstra_id'),
  "ALTER TABLE renstra_kebijakan DROP INDEX idx_fk_renstra_kebijakan__renstra_id",
  "SELECT 'SKIP drop idx_fk_renstra_kebijakan__renstra_id' AS msg"));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=@db AND table_name='renstra_kebijakan' AND index_name='idx_fk_renstra_kebijakan__strategi_id'),
  "ALTER TABLE renstra_kebijakan DROP INDEX idx_fk_renstra_kebijakan__strategi_id",
  "SELECT 'SKIP drop idx_fk_renstra_kebijakan__strategi_id' AS msg"));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=@db AND table_name='renstra_kebijakan' AND index_name='idx_fk_renstra_kebijakan__rpjmd_arah_id'),
  "ALTER TABLE renstra_kebijakan DROP INDEX idx_fk_renstra_kebijakan__rpjmd_arah_id",
  "SELECT 'SKIP drop idx_fk_renstra_kebijakan__rpjmd_arah_id' AS msg"));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=@db AND table_name='renstra_program' AND index_name='idx_fk_renstra_program__renstra_id'),
  "ALTER TABLE renstra_program DROP INDEX idx_fk_renstra_program__renstra_id",
  "SELECT 'SKIP drop idx_fk_renstra_program__renstra_id' AS msg"));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=@db AND table_name='renstra_program' AND index_name='idx_fk_renstra_program__rpjmd_program_id'),
  "ALTER TABLE renstra_program DROP INDEX idx_fk_renstra_program__rpjmd_program_id",
  "SELECT 'SKIP drop idx_fk_renstra_program__rpjmd_program_id' AS msg"));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=@db AND table_name='renstra_kegiatan' AND index_name='idx_fk_renstra_kegiatan__renstra_id'),
  "ALTER TABLE renstra_kegiatan DROP INDEX idx_fk_renstra_kegiatan__renstra_id",
  "SELECT 'SKIP drop idx_fk_renstra_kegiatan__renstra_id' AS msg"));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=@db AND table_name='renstra_kegiatan' AND index_name='idx_fk_renstra_kegiatan__program_id'),
  "ALTER TABLE renstra_kegiatan DROP INDEX idx_fk_renstra_kegiatan__program_id",
  "SELECT 'SKIP drop idx_fk_renstra_kegiatan__program_id' AS msg"));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=@db AND table_name='renstra_kegiatan' AND index_name='idx_fk_renstra_kegiatan__rpjmd_kegiatan_id'),
  "ALTER TABLE renstra_kegiatan DROP INDEX idx_fk_renstra_kegiatan__rpjmd_kegiatan_id",
  "SELECT 'SKIP drop idx_fk_renstra_kegiatan__rpjmd_kegiatan_id' AS msg"));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=@db AND table_name='renstra_subkegiatan' AND index_name='idx_fk_renstra_subkegiatan__renstra_program_id'),
  "ALTER TABLE renstra_subkegiatan DROP INDEX idx_fk_renstra_subkegiatan__renstra_program_id",
  "SELECT 'SKIP drop idx_fk_renstra_subkegiatan__renstra_program_id' AS msg"));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=@db AND table_name='renstra_subkegiatan' AND index_name='idx_fk_renstra_subkegiatan__kegiatan_id'),
  "ALTER TABLE renstra_subkegiatan DROP INDEX idx_fk_renstra_subkegiatan__kegiatan_id",
  "SELECT 'SKIP drop idx_fk_renstra_subkegiatan__kegiatan_id' AS msg"));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=@db AND table_name='renstra_subkegiatan' AND index_name='idx_fk_renstra_subkegiatan__sub_kegiatan_id'),
  "ALTER TABLE renstra_subkegiatan DROP INDEX idx_fk_renstra_subkegiatan__sub_kegiatan_id",
  "SELECT 'SKIP drop idx_fk_renstra_subkegiatan__sub_kegiatan_id' AS msg"));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=@db AND table_name='indikator_renstra' AND index_name='idx_fk_indikator_renstra__renstra_id'),
  "ALTER TABLE indikator_renstra DROP INDEX idx_fk_indikator_renstra__renstra_id",
  "SELECT 'SKIP drop idx_fk_indikator_renstra__renstra_id' AS msg"));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=@db AND table_name='renstra_target' AND index_name='idx_fk_renstra_target__indikator_id'),
  "ALTER TABLE renstra_target DROP INDEX idx_fk_renstra_target__indikator_id",
  "SELECT 'SKIP drop idx_fk_renstra_target__indikator_id' AS msg"));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=@db AND table_name='renstra_target_detail' AND index_name='idx_fk_renstra_target_detail__renstra_target_id'),
  "ALTER TABLE renstra_target_detail DROP INDEX idx_fk_renstra_target_detail__renstra_target_id",
  "SELECT 'SKIP drop idx_fk_renstra_target_detail__renstra_target_id' AS msg"));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* Restore sql_mode */
SET SESSION sql_mode = @phase5_orig_sql_mode;
