/*
  Phase 5 — Add FK Indexes (MySQL/InnoDB)
  Semua index dibuat dengan nama eksplisit `idx_fk_<table>__<col>`.
  Script ini aman dijalankan berulang: index hanya dibuat jika belum ada index yang valid (leftmost prefix).

  Catatan:
  - Untuk FK single-column, index harus punya kolom tsb sebagai kolom pertama (`seq_in_index = 1`).
*/

/* Pastikan string-literal pakai double quote tetap kompatibel jika sql_mode mengandung ANSI_QUOTES */
SET @phase5_orig_sql_mode := @@SESSION.sql_mode;
SET SESSION sql_mode = REPLACE(@@SESSION.sql_mode, 'ANSI_QUOTES', '');

SET @db := DATABASE();

/* Helper macro pattern:
   - Jika sudah ada index leftmost pada kolom tsb, buat SELECT 'SKIP ...'
   - Jika belum ada, CREATE INDEX idx_fk_... ON table(column)
*/

/* ========== RPJMD chain ========== */
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
           WHERE table_schema=@db AND table_name='sasaran' AND column_name='tujuan_id' AND seq_in_index=1),
    "SELECT 'SKIP idx sasaran.tujuan_id (already indexed)' AS msg",
    "CREATE INDEX idx_fk_sasaran__tujuan_id ON sasaran (tujuan_id)"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
           WHERE table_schema=@db AND table_name='strategi' AND column_name='sasaran_id' AND seq_in_index=1),
    "SELECT 'SKIP idx strategi.sasaran_id (already indexed)' AS msg",
    "CREATE INDEX idx_fk_strategi__sasaran_id ON strategi (sasaran_id)"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
           WHERE table_schema=@db AND table_name='arah_kebijakan' AND column_name='strategi_id' AND seq_in_index=1),
    "SELECT 'SKIP idx arah_kebijakan.strategi_id (already indexed)' AS msg",
    "CREATE INDEX idx_fk_arah_kebijakan__strategi_id ON arah_kebijakan (strategi_id)"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
           WHERE table_schema=@db AND table_name='program' AND column_name='sasaran_id' AND seq_in_index=1),
    "SELECT 'SKIP idx program.sasaran_id (already indexed)' AS msg",
    "CREATE INDEX idx_fk_program__sasaran_id ON program (sasaran_id)"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
           WHERE table_schema=@db AND table_name='kegiatan' AND column_name='program_id' AND seq_in_index=1),
    "SELECT 'SKIP idx kegiatan.program_id (already indexed)' AS msg",
    "CREATE INDEX idx_fk_kegiatan__program_id ON kegiatan (program_id)"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
           WHERE table_schema=@db AND table_name='sub_kegiatan' AND column_name='kegiatan_id' AND seq_in_index=1),
    "SELECT 'SKIP idx sub_kegiatan.kegiatan_id (already indexed)' AS msg",
    "CREATE INDEX idx_fk_sub_kegiatan__kegiatan_id ON sub_kegiatan (kegiatan_id)"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* ========== Pivot tables ========== */
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
           WHERE table_schema=@db AND table_name='program_arah_kebijakan' AND column_name='program_id' AND seq_in_index=1),
    "SELECT 'SKIP idx program_arah_kebijakan.program_id (already indexed)' AS msg",
    "CREATE INDEX idx_fk_program_arah_kebijakan__program_id ON program_arah_kebijakan (program_id)"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
           WHERE table_schema=@db AND table_name='program_arah_kebijakan' AND column_name='arah_kebijakan_id' AND seq_in_index=1),
    "SELECT 'SKIP idx program_arah_kebijakan.arah_kebijakan_id (already indexed)' AS msg",
    "CREATE INDEX idx_fk_program_arah_kebijakan__arah_kebijakan_id ON program_arah_kebijakan (arah_kebijakan_id)"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
           WHERE table_schema=@db AND table_name='program_strategi' AND column_name='program_id' AND seq_in_index=1),
    "SELECT 'SKIP idx program_strategi.program_id (already indexed)' AS msg",
    "CREATE INDEX idx_fk_program_strategi__program_id ON program_strategi (program_id)"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
           WHERE table_schema=@db AND table_name='program_strategi' AND column_name='strategi_id' AND seq_in_index=1),
    "SELECT 'SKIP idx program_strategi.strategi_id (already indexed)' AS msg",
    "CREATE INDEX idx_fk_program_strategi__strategi_id ON program_strategi (strategi_id)"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* ========== Renstra chain ========== */
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
           WHERE table_schema=@db AND table_name='renstra_opd' AND column_name='rpjmd_id' AND seq_in_index=1),
    "SELECT 'SKIP idx renstra_opd.rpjmd_id (already indexed)' AS msg",
    "CREATE INDEX idx_fk_renstra_opd__rpjmd_id ON renstra_opd (rpjmd_id)"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
           WHERE table_schema=@db AND table_name='renstra_tujuan' AND column_name='renstra_id' AND seq_in_index=1),
    "SELECT 'SKIP idx renstra_tujuan.renstra_id (already indexed)' AS msg",
    "CREATE INDEX idx_fk_renstra_tujuan__renstra_id ON renstra_tujuan (renstra_id)"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
           WHERE table_schema=@db AND table_name='renstra_sasaran' AND column_name='renstra_id' AND seq_in_index=1),
    "SELECT 'SKIP idx renstra_sasaran.renstra_id (already indexed)' AS msg",
    "CREATE INDEX idx_fk_renstra_sasaran__renstra_id ON renstra_sasaran (renstra_id)"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
           WHERE table_schema=@db AND table_name='renstra_sasaran' AND column_name='tujuan_id' AND seq_in_index=1),
    "SELECT 'SKIP idx renstra_sasaran.tujuan_id (already indexed)' AS msg",
    "CREATE INDEX idx_fk_renstra_sasaran__tujuan_id ON renstra_sasaran (tujuan_id)"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
           WHERE table_schema=@db AND table_name='renstra_sasaran' AND column_name='rpjmd_sasaran_id' AND seq_in_index=1),
    "SELECT 'SKIP idx renstra_sasaran.rpjmd_sasaran_id (already indexed)' AS msg",
    "CREATE INDEX idx_fk_renstra_sasaran__rpjmd_sasaran_id ON renstra_sasaran (rpjmd_sasaran_id)"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
           WHERE table_schema=@db AND table_name='renstra_strategi' AND column_name='renstra_id' AND seq_in_index=1),
    "SELECT 'SKIP idx renstra_strategi.renstra_id (already indexed)' AS msg",
    "CREATE INDEX idx_fk_renstra_strategi__renstra_id ON renstra_strategi (renstra_id)"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
           WHERE table_schema=@db AND table_name='renstra_strategi' AND column_name='sasaran_id' AND seq_in_index=1),
    "SELECT 'SKIP idx renstra_strategi.sasaran_id (already indexed)' AS msg",
    "CREATE INDEX idx_fk_renstra_strategi__sasaran_id ON renstra_strategi (sasaran_id)"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
           WHERE table_schema=@db AND table_name='renstra_strategi' AND column_name='rpjmd_strategi_id' AND seq_in_index=1),
    "SELECT 'SKIP idx renstra_strategi.rpjmd_strategi_id (already indexed)' AS msg",
    "CREATE INDEX idx_fk_renstra_strategi__rpjmd_strategi_id ON renstra_strategi (rpjmd_strategi_id)"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
           WHERE table_schema=@db AND table_name='renstra_kebijakan' AND column_name='renstra_id' AND seq_in_index=1),
    "SELECT 'SKIP idx renstra_kebijakan.renstra_id (already indexed)' AS msg",
    "CREATE INDEX idx_fk_renstra_kebijakan__renstra_id ON renstra_kebijakan (renstra_id)"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
           WHERE table_schema=@db AND table_name='renstra_kebijakan' AND column_name='strategi_id' AND seq_in_index=1),
    "SELECT 'SKIP idx renstra_kebijakan.strategi_id (already indexed)' AS msg",
    "CREATE INDEX idx_fk_renstra_kebijakan__strategi_id ON renstra_kebijakan (strategi_id)"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
           WHERE table_schema=@db AND table_name='renstra_kebijakan' AND column_name='rpjmd_arah_id' AND seq_in_index=1),
    "SELECT 'SKIP idx renstra_kebijakan.rpjmd_arah_id (already indexed)' AS msg",
    "CREATE INDEX idx_fk_renstra_kebijakan__rpjmd_arah_id ON renstra_kebijakan (rpjmd_arah_id)"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
           WHERE table_schema=@db AND table_name='renstra_program' AND column_name='renstra_id' AND seq_in_index=1),
    "SELECT 'SKIP idx renstra_program.renstra_id (already indexed)' AS msg",
    "CREATE INDEX idx_fk_renstra_program__renstra_id ON renstra_program (renstra_id)"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
           WHERE table_schema=@db AND table_name='renstra_program' AND column_name='rpjmd_program_id' AND seq_in_index=1),
    "SELECT 'SKIP idx renstra_program.rpjmd_program_id (already indexed)' AS msg",
    "CREATE INDEX idx_fk_renstra_program__rpjmd_program_id ON renstra_program (rpjmd_program_id)"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
           WHERE table_schema=@db AND table_name='renstra_kegiatan' AND column_name='renstra_id' AND seq_in_index=1),
    "SELECT 'SKIP idx renstra_kegiatan.renstra_id (already indexed)' AS msg",
    "CREATE INDEX idx_fk_renstra_kegiatan__renstra_id ON renstra_kegiatan (renstra_id)"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
           WHERE table_schema=@db AND table_name='renstra_kegiatan' AND column_name='program_id' AND seq_in_index=1),
    "SELECT 'SKIP idx renstra_kegiatan.program_id (already indexed)' AS msg",
    "CREATE INDEX idx_fk_renstra_kegiatan__program_id ON renstra_kegiatan (program_id)"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
           WHERE table_schema=@db AND table_name='renstra_kegiatan' AND column_name='rpjmd_kegiatan_id' AND seq_in_index=1),
    "SELECT 'SKIP idx renstra_kegiatan.rpjmd_kegiatan_id (already indexed)' AS msg",
    "CREATE INDEX idx_fk_renstra_kegiatan__rpjmd_kegiatan_id ON renstra_kegiatan (rpjmd_kegiatan_id)"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
           WHERE table_schema=@db AND table_name='renstra_subkegiatan' AND column_name='renstra_program_id' AND seq_in_index=1),
    "SELECT 'SKIP idx renstra_subkegiatan.renstra_program_id (already indexed)' AS msg",
    "CREATE INDEX idx_fk_renstra_subkegiatan__renstra_program_id ON renstra_subkegiatan (renstra_program_id)"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
           WHERE table_schema=@db AND table_name='renstra_subkegiatan' AND column_name='kegiatan_id' AND seq_in_index=1),
    "SELECT 'SKIP idx renstra_subkegiatan.kegiatan_id (already indexed)' AS msg",
    "CREATE INDEX idx_fk_renstra_subkegiatan__kegiatan_id ON renstra_subkegiatan (kegiatan_id)"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
           WHERE table_schema=@db AND table_name='renstra_subkegiatan' AND column_name='sub_kegiatan_id' AND seq_in_index=1),
    "SELECT 'SKIP idx renstra_subkegiatan.sub_kegiatan_id (already indexed)' AS msg",
    "CREATE INDEX idx_fk_renstra_subkegiatan__sub_kegiatan_id ON renstra_subkegiatan (sub_kegiatan_id)"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* ========== Targets ========== */
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
           WHERE table_schema=@db AND table_name='indikator_renstra' AND column_name='renstra_id' AND seq_in_index=1),
    "SELECT 'SKIP idx indikator_renstra.renstra_id (already indexed)' AS msg",
    "CREATE INDEX idx_fk_indikator_renstra__renstra_id ON indikator_renstra (renstra_id)"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
           WHERE table_schema=@db AND table_name='renstra_target' AND column_name='indikator_id' AND seq_in_index=1),
    "SELECT 'SKIP idx renstra_target.indikator_id (already indexed)' AS msg",
    "CREATE INDEX idx_fk_renstra_target__indikator_id ON renstra_target (indikator_id)"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.statistics
           WHERE table_schema=@db AND table_name='renstra_target_detail' AND column_name='renstra_target_id' AND seq_in_index=1),
    "SELECT 'SKIP idx renstra_target_detail.renstra_target_id (already indexed)' AS msg",
    "CREATE INDEX idx_fk_renstra_target_detail__renstra_target_id ON renstra_target_detail (renstra_target_id)"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* Restore sql_mode */
SET SESSION sql_mode = @phase5_orig_sql_mode;
