/*
  Phase 5 — Add FK Constraints (MySQL/InnoDB)

  Default policy:
  - ON DELETE RESTRICT, ON UPDATE CASCADE
  - exception: renstra_target_detail -> renstra_target uses ON DELETE CASCADE (detail purely dependent).

  Script ini aman dijalankan berulang:
  - Jika constraint sudah ada, di-SKIP dengan pesan.
  - Jika engine bukan InnoDB atau tipe kolom mismatch, di-SKIP dengan pesan.

  Naming:
  - fk_<child>__<childcol>__<parent>
*/

SET @db := DATABASE();

/* Pastikan string-literal pakai double quote tetap kompatibel jika sql_mode mengandung ANSI_QUOTES */
SET @phase5_orig_sql_mode := @@SESSION.sql_mode;
SET SESSION sql_mode = REPLACE(@@SESSION.sql_mode, 'ANSI_QUOTES', '');

/* Helper condition: table engine InnoDB + type compatible + constraint name unused */
/* NOTE: Untuk kolom numerik, signed/unsigned harus sama. */

/* ============================================================
   Renstra OPD -> RPJMD (parent table bisa `rpjmd` atau `rpjmds`)
============================================================ */
SET @rpjmd_parent := (
  SELECT CASE
    WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema=@db AND table_name='rpjmd') THEN 'rpjmd'
    WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema=@db AND table_name='rpjmds') THEN 'rpjmds'
    ELSE NULL
  END
);

SET @sql := (
  SELECT IF(
    @rpjmd_parent IS NULL,
    "SELECT 'SKIP fk_renstra_opd__rpjmd_id__rpjmd (no rpjmd/rpjmds table)' AS msg",
    IF(
      EXISTS(SELECT 1 FROM information_schema.key_column_usage
             WHERE table_schema=@db AND table_name='renstra_opd' AND column_name='rpjmd_id'
               AND referenced_table_name IS NOT NULL),
      "SELECT 'SKIP fk_renstra_opd__rpjmd_id__rpjmd (already has FK)' AS msg",
      IF(
        EXISTS(
          SELECT 1
          FROM information_schema.tables tc
          JOIN information_schema.tables tp
            ON tp.table_schema=tc.table_schema AND tp.table_name=@rpjmd_parent
          JOIN information_schema.columns c
            ON c.table_schema=tc.table_schema AND c.table_name='renstra_opd' AND c.column_name='rpjmd_id'
          JOIN information_schema.columns p
            ON p.table_schema=tc.table_schema AND p.table_name=@rpjmd_parent AND p.column_name='id'
          WHERE tc.table_schema=@db AND tc.table_name='renstra_opd'
            AND tc.engine='InnoDB' AND tp.engine='InnoDB'
            AND c.data_type=p.data_type
            AND (LOCATE('unsigned', c.column_type)>0) = (LOCATE('unsigned', p.column_type)>0)
        ),
        CONCAT(
          "ALTER TABLE renstra_opd ADD CONSTRAINT fk_renstra_opd__rpjmd_id__rpjmd ",
          "FOREIGN KEY (rpjmd_id) REFERENCES ", @rpjmd_parent, "(id) ",
          "ON DELETE RESTRICT ON UPDATE CASCADE"
        ),
        "SELECT 'SKIP fk_renstra_opd__rpjmd_id__rpjmd (engine/type mismatch)' AS msg"
      )
    )
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* =========================
   RPJMD chain
========================= */
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_sasaran__tujuan_id__tujuan'),
    "SELECT 'SKIP fk_sasaran__tujuan_id__tujuan (exists)' AS msg",
    IF(
      EXISTS(
        SELECT 1
        FROM information_schema.tables tc
        JOIN information_schema.tables tp
          ON tp.table_schema=tc.table_schema AND tp.table_name='tujuan'
        JOIN information_schema.columns c
          ON c.table_schema=tc.table_schema AND c.table_name='sasaran' AND c.column_name='tujuan_id'
        JOIN information_schema.columns p
          ON p.table_schema=tc.table_schema AND p.table_name='tujuan' AND p.column_name='id'
        WHERE tc.table_schema=@db AND tc.table_name='sasaran'
          AND tc.engine='InnoDB' AND tp.engine='InnoDB'
          AND c.data_type=p.data_type
          AND (LOCATE('unsigned', c.column_type)>0) = (LOCATE('unsigned', p.column_type)>0)
      ),
      "ALTER TABLE sasaran ADD CONSTRAINT fk_sasaran__tujuan_id__tujuan FOREIGN KEY (tujuan_id) REFERENCES tujuan(id) ON DELETE RESTRICT ON UPDATE CASCADE",
      "SELECT 'SKIP fk_sasaran__tujuan_id__tujuan (engine/type mismatch)' AS msg"
    )
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_strategi__sasaran_id__sasaran'),
    "SELECT 'SKIP fk_strategi__sasaran_id__sasaran (exists)' AS msg",
    IF(
      EXISTS(
        SELECT 1
        FROM information_schema.tables tc
        JOIN information_schema.tables tp
          ON tp.table_schema=tc.table_schema AND tp.table_name='sasaran'
        JOIN information_schema.columns c
          ON c.table_schema=tc.table_schema AND c.table_name='strategi' AND c.column_name='sasaran_id'
        JOIN information_schema.columns p
          ON p.table_schema=tc.table_schema AND p.table_name='sasaran' AND p.column_name='id'
        WHERE tc.table_schema=@db AND tc.table_name='strategi'
          AND tc.engine='InnoDB' AND tp.engine='InnoDB'
          AND c.data_type=p.data_type
          AND (LOCATE('unsigned', c.column_type)>0) = (LOCATE('unsigned', p.column_type)>0)
      ),
      "ALTER TABLE strategi ADD CONSTRAINT fk_strategi__sasaran_id__sasaran FOREIGN KEY (sasaran_id) REFERENCES sasaran(id) ON DELETE RESTRICT ON UPDATE CASCADE",
      "SELECT 'SKIP fk_strategi__sasaran_id__sasaran (engine/type mismatch)' AS msg"
    )
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_arah_kebijakan__strategi_id__strategi'),
    "SELECT 'SKIP fk_arah_kebijakan__strategi_id__strategi (exists)' AS msg",
    IF(
      EXISTS(
        SELECT 1
        FROM information_schema.tables tc
        JOIN information_schema.tables tp
          ON tp.table_schema=tc.table_schema AND tp.table_name='strategi'
        JOIN information_schema.columns c
          ON c.table_schema=tc.table_schema AND c.table_name='arah_kebijakan' AND c.column_name='strategi_id'
        JOIN information_schema.columns p
          ON p.table_schema=tc.table_schema AND p.table_name='strategi' AND p.column_name='id'
        WHERE tc.table_schema=@db AND tc.table_name='arah_kebijakan'
          AND tc.engine='InnoDB' AND tp.engine='InnoDB'
          AND c.data_type=p.data_type
          AND (LOCATE('unsigned', c.column_type)>0) = (LOCATE('unsigned', p.column_type)>0)
      ),
      "ALTER TABLE arah_kebijakan ADD CONSTRAINT fk_arah_kebijakan__strategi_id__strategi FOREIGN KEY (strategi_id) REFERENCES strategi(id) ON DELETE RESTRICT ON UPDATE CASCADE",
      "SELECT 'SKIP fk_arah_kebijakan__strategi_id__strategi (engine/type mismatch)' AS msg"
    )
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* =========================
   Program chain
========================= */
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_program__sasaran_id__sasaran'),
    "SELECT 'SKIP fk_program__sasaran_id__sasaran (exists)' AS msg",
    IF(
      EXISTS(
        SELECT 1
        FROM information_schema.tables tc
        JOIN information_schema.tables tp
          ON tp.table_schema=tc.table_schema AND tp.table_name='sasaran'
        JOIN information_schema.columns c
          ON c.table_schema=tc.table_schema AND c.table_name='program' AND c.column_name='sasaran_id'
        JOIN information_schema.columns p
          ON p.table_schema=tc.table_schema AND p.table_name='sasaran' AND p.column_name='id'
        WHERE tc.table_schema=@db AND tc.table_name='program'
          AND tc.engine='InnoDB' AND tp.engine='InnoDB'
          AND c.data_type=p.data_type
          AND (LOCATE('unsigned', c.column_type)>0) = (LOCATE('unsigned', p.column_type)>0)
      ),
      "ALTER TABLE program ADD CONSTRAINT fk_program__sasaran_id__sasaran FOREIGN KEY (sasaran_id) REFERENCES sasaran(id) ON DELETE RESTRICT ON UPDATE CASCADE",
      "SELECT 'SKIP fk_program__sasaran_id__sasaran (engine/type mismatch)' AS msg"
    )
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_kegiatan__program_id__program'),
    "SELECT 'SKIP fk_kegiatan__program_id__program (exists)' AS msg",
    IF(
      EXISTS(
        SELECT 1
        FROM information_schema.tables tc
        JOIN information_schema.tables tp
          ON tp.table_schema=tc.table_schema AND tp.table_name='program'
        JOIN information_schema.columns c
          ON c.table_schema=tc.table_schema AND c.table_name='kegiatan' AND c.column_name='program_id'
        JOIN information_schema.columns p
          ON p.table_schema=tc.table_schema AND p.table_name='program' AND p.column_name='id'
        WHERE tc.table_schema=@db AND tc.table_name='kegiatan'
          AND tc.engine='InnoDB' AND tp.engine='InnoDB'
          AND c.data_type=p.data_type
          AND (LOCATE('unsigned', c.column_type)>0) = (LOCATE('unsigned', p.column_type)>0)
      ),
      "ALTER TABLE kegiatan ADD CONSTRAINT fk_kegiatan__program_id__program FOREIGN KEY (program_id) REFERENCES program(id) ON DELETE RESTRICT ON UPDATE CASCADE",
      "SELECT 'SKIP fk_kegiatan__program_id__program (engine/type mismatch)' AS msg"
    )
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_sub_kegiatan__kegiatan_id__kegiatan'),
    "SELECT 'SKIP fk_sub_kegiatan__kegiatan_id__kegiatan (exists)' AS msg",
    IF(
      EXISTS(
        SELECT 1
        FROM information_schema.tables tc
        JOIN information_schema.tables tp
          ON tp.table_schema=tc.table_schema AND tp.table_name='kegiatan'
        JOIN information_schema.columns c
          ON c.table_schema=tc.table_schema AND c.table_name='sub_kegiatan' AND c.column_name='kegiatan_id'
        JOIN information_schema.columns p
          ON p.table_schema=tc.table_schema AND p.table_name='kegiatan' AND p.column_name='id'
        WHERE tc.table_schema=@db AND tc.table_name='sub_kegiatan'
          AND tc.engine='InnoDB' AND tp.engine='InnoDB'
          AND c.data_type=p.data_type
          AND (LOCATE('unsigned', c.column_type)>0) = (LOCATE('unsigned', p.column_type)>0)
      ),
      "ALTER TABLE sub_kegiatan ADD CONSTRAINT fk_sub_kegiatan__kegiatan_id__kegiatan FOREIGN KEY (kegiatan_id) REFERENCES kegiatan(id) ON DELETE RESTRICT ON UPDATE CASCADE",
      "SELECT 'SKIP fk_sub_kegiatan__kegiatan_id__kegiatan (engine/type mismatch)' AS msg"
    )
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* =========================
   Pivot tables (block bypass)
========================= */
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_program_arah_kebijakan__program_id__program'),
    "SELECT 'SKIP fk_program_arah_kebijakan__program_id__program (exists)' AS msg",
    "ALTER TABLE program_arah_kebijakan ADD CONSTRAINT fk_program_arah_kebijakan__program_id__program FOREIGN KEY (program_id) REFERENCES program(id) ON DELETE RESTRICT ON UPDATE CASCADE"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_program_arah_kebijakan__arah_kebijakan_id__arah_kebijakan'),
    "SELECT 'SKIP fk_program_arah_kebijakan__arah_kebijakan_id__arah_kebijakan (exists)' AS msg",
    "ALTER TABLE program_arah_kebijakan ADD CONSTRAINT fk_program_arah_kebijakan__arah_kebijakan_id__arah_kebijakan FOREIGN KEY (arah_kebijakan_id) REFERENCES arah_kebijakan(id) ON DELETE RESTRICT ON UPDATE CASCADE"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_program_strategi__program_id__program'),
    "SELECT 'SKIP fk_program_strategi__program_id__program (exists)' AS msg",
    "ALTER TABLE program_strategi ADD CONSTRAINT fk_program_strategi__program_id__program FOREIGN KEY (program_id) REFERENCES program(id) ON DELETE RESTRICT ON UPDATE CASCADE"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_program_strategi__strategi_id__strategi'),
    "SELECT 'SKIP fk_program_strategi__strategi_id__strategi (exists)' AS msg",
    "ALTER TABLE program_strategi ADD CONSTRAINT fk_program_strategi__strategi_id__strategi FOREIGN KEY (strategi_id) REFERENCES strategi(id) ON DELETE RESTRICT ON UPDATE CASCADE"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* =========================
   Renstra (legacy) chain
========================= */
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_renstra_tujuan__renstra_id__renstra_opd'),
    "SELECT 'SKIP fk_renstra_tujuan__renstra_id__renstra_opd (exists)' AS msg",
    "ALTER TABLE renstra_tujuan ADD CONSTRAINT fk_renstra_tujuan__renstra_id__renstra_opd FOREIGN KEY (renstra_id) REFERENCES renstra_opd(id) ON DELETE RESTRICT ON UPDATE CASCADE"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_renstra_sasaran__renstra_id__renstra_opd'),
    "SELECT 'SKIP fk_renstra_sasaran__renstra_id__renstra_opd (exists)' AS msg",
    "ALTER TABLE renstra_sasaran ADD CONSTRAINT fk_renstra_sasaran__renstra_id__renstra_opd FOREIGN KEY (renstra_id) REFERENCES renstra_opd(id) ON DELETE RESTRICT ON UPDATE CASCADE"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_renstra_sasaran__tujuan_id__renstra_tujuan'),
    "SELECT 'SKIP fk_renstra_sasaran__tujuan_id__renstra_tujuan (exists)' AS msg",
    "ALTER TABLE renstra_sasaran ADD CONSTRAINT fk_renstra_sasaran__tujuan_id__renstra_tujuan FOREIGN KEY (tujuan_id) REFERENCES renstra_tujuan(id) ON DELETE RESTRICT ON UPDATE CASCADE"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_renstra_sasaran__rpjmd_sasaran_id__sasaran'),
    "SELECT 'SKIP fk_renstra_sasaran__rpjmd_sasaran_id__sasaran (exists)' AS msg",
    "ALTER TABLE renstra_sasaran ADD CONSTRAINT fk_renstra_sasaran__rpjmd_sasaran_id__sasaran FOREIGN KEY (rpjmd_sasaran_id) REFERENCES sasaran(id) ON DELETE RESTRICT ON UPDATE CASCADE"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_renstra_strategi__renstra_id__renstra_opd'),
    "SELECT 'SKIP fk_renstra_strategi__renstra_id__renstra_opd (exists)' AS msg",
    "ALTER TABLE renstra_strategi ADD CONSTRAINT fk_renstra_strategi__renstra_id__renstra_opd FOREIGN KEY (renstra_id) REFERENCES renstra_opd(id) ON DELETE RESTRICT ON UPDATE CASCADE"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_renstra_strategi__sasaran_id__renstra_sasaran'),
    "SELECT 'SKIP fk_renstra_strategi__sasaran_id__renstra_sasaran (exists)' AS msg",
    "ALTER TABLE renstra_strategi ADD CONSTRAINT fk_renstra_strategi__sasaran_id__renstra_sasaran FOREIGN KEY (sasaran_id) REFERENCES renstra_sasaran(id) ON DELETE RESTRICT ON UPDATE CASCADE"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_renstra_strategi__rpjmd_strategi_id__strategi'),
    "SELECT 'SKIP fk_renstra_strategi__rpjmd_strategi_id__strategi (exists)' AS msg",
    "ALTER TABLE renstra_strategi ADD CONSTRAINT fk_renstra_strategi__rpjmd_strategi_id__strategi FOREIGN KEY (rpjmd_strategi_id) REFERENCES strategi(id) ON DELETE RESTRICT ON UPDATE CASCADE"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_renstra_kebijakan__renstra_id__renstra_opd'),
    "SELECT 'SKIP fk_renstra_kebijakan__renstra_id__renstra_opd (exists)' AS msg",
    "ALTER TABLE renstra_kebijakan ADD CONSTRAINT fk_renstra_kebijakan__renstra_id__renstra_opd FOREIGN KEY (renstra_id) REFERENCES renstra_opd(id) ON DELETE RESTRICT ON UPDATE CASCADE"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_renstra_kebijakan__strategi_id__renstra_strategi'),
    "SELECT 'SKIP fk_renstra_kebijakan__strategi_id__renstra_strategi (exists)' AS msg",
    "ALTER TABLE renstra_kebijakan ADD CONSTRAINT fk_renstra_kebijakan__strategi_id__renstra_strategi FOREIGN KEY (strategi_id) REFERENCES renstra_strategi(id) ON DELETE RESTRICT ON UPDATE CASCADE"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_renstra_kebijakan__rpjmd_arah_id__arah_kebijakan'),
    "SELECT 'SKIP fk_renstra_kebijakan__rpjmd_arah_id__arah_kebijakan (exists)' AS msg",
    "ALTER TABLE renstra_kebijakan ADD CONSTRAINT fk_renstra_kebijakan__rpjmd_arah_id__arah_kebijakan FOREIGN KEY (rpjmd_arah_id) REFERENCES arah_kebijakan(id) ON DELETE RESTRICT ON UPDATE CASCADE"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_renstra_program__renstra_id__renstra_opd'),
    "SELECT 'SKIP fk_renstra_program__renstra_id__renstra_opd (exists)' AS msg",
    "ALTER TABLE renstra_program ADD CONSTRAINT fk_renstra_program__renstra_id__renstra_opd FOREIGN KEY (renstra_id) REFERENCES renstra_opd(id) ON DELETE RESTRICT ON UPDATE CASCADE"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* renstra_program.rpjmd_program_id -> program.id (sering mismatch tipe di DB lama; guard type) */
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_renstra_program__rpjmd_program_id__program'),
    "SELECT 'SKIP fk_renstra_program__rpjmd_program_id__program (exists)' AS msg",
    IF(
      EXISTS(
        SELECT 1
        FROM information_schema.columns c
        JOIN information_schema.columns p
          ON p.table_schema=c.table_schema AND p.table_name='program' AND p.column_name='id'
        WHERE c.table_schema=@db AND c.table_name='renstra_program' AND c.column_name='rpjmd_program_id'
          AND c.data_type=p.data_type
          AND (LOCATE('unsigned', c.column_type)>0) = (LOCATE('unsigned', p.column_type)>0)
      ),
      "ALTER TABLE renstra_program ADD CONSTRAINT fk_renstra_program__rpjmd_program_id__program FOREIGN KEY (rpjmd_program_id) REFERENCES program(id) ON DELETE RESTRICT ON UPDATE CASCADE",
      "SELECT 'SKIP fk_renstra_program__rpjmd_program_id__program (type mismatch; fix Phase 6)' AS msg"
    )
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_renstra_kegiatan__renstra_id__renstra_opd'),
    "SELECT 'SKIP fk_renstra_kegiatan__renstra_id__renstra_opd (exists)' AS msg",
    "ALTER TABLE renstra_kegiatan ADD CONSTRAINT fk_renstra_kegiatan__renstra_id__renstra_opd FOREIGN KEY (renstra_id) REFERENCES renstra_opd(id) ON DELETE RESTRICT ON UPDATE CASCADE"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_renstra_kegiatan__program_id__renstra_program'),
    "SELECT 'SKIP fk_renstra_kegiatan__program_id__renstra_program (exists)' AS msg",
    "ALTER TABLE renstra_kegiatan ADD CONSTRAINT fk_renstra_kegiatan__program_id__renstra_program FOREIGN KEY (program_id) REFERENCES renstra_program(id) ON DELETE RESTRICT ON UPDATE CASCADE"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_renstra_kegiatan__rpjmd_kegiatan_id__kegiatan'),
    "SELECT 'SKIP fk_renstra_kegiatan__rpjmd_kegiatan_id__kegiatan (exists)' AS msg",
    "ALTER TABLE renstra_kegiatan ADD CONSTRAINT fk_renstra_kegiatan__rpjmd_kegiatan_id__kegiatan FOREIGN KEY (rpjmd_kegiatan_id) REFERENCES kegiatan(id) ON DELETE RESTRICT ON UPDATE CASCADE"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_renstra_subkegiatan__renstra_program_id__renstra_program'),
    "SELECT 'SKIP fk_renstra_subkegiatan__renstra_program_id__renstra_program (exists)' AS msg",
    "ALTER TABLE renstra_subkegiatan ADD CONSTRAINT fk_renstra_subkegiatan__renstra_program_id__renstra_program FOREIGN KEY (renstra_program_id) REFERENCES renstra_program(id) ON DELETE RESTRICT ON UPDATE CASCADE"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_renstra_subkegiatan__kegiatan_id__renstra_kegiatan'),
    "SELECT 'SKIP fk_renstra_subkegiatan__kegiatan_id__renstra_kegiatan (exists)' AS msg",
    "ALTER TABLE renstra_subkegiatan ADD CONSTRAINT fk_renstra_subkegiatan__kegiatan_id__renstra_kegiatan FOREIGN KEY (kegiatan_id) REFERENCES renstra_kegiatan(id) ON DELETE RESTRICT ON UPDATE CASCADE"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_renstra_subkegiatan__sub_kegiatan_id__sub_kegiatan'),
    "SELECT 'SKIP fk_renstra_subkegiatan__sub_kegiatan_id__sub_kegiatan (exists)' AS msg",
    "ALTER TABLE renstra_subkegiatan ADD CONSTRAINT fk_renstra_subkegiatan__sub_kegiatan_id__sub_kegiatan FOREIGN KEY (sub_kegiatan_id) REFERENCES sub_kegiatan(id) ON DELETE RESTRICT ON UPDATE CASCADE"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* =========================
   Targets
========================= */
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_indikator_renstra__renstra_id__renstra_opd'),
    "SELECT 'SKIP fk_indikator_renstra__renstra_id__renstra_opd (exists)' AS msg",
    "ALTER TABLE indikator_renstra ADD CONSTRAINT fk_indikator_renstra__renstra_id__renstra_opd FOREIGN KEY (renstra_id) REFERENCES renstra_opd(id) ON DELETE RESTRICT ON UPDATE CASCADE"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_renstra_target__indikator_id__indikator_renstra'),
    "SELECT 'SKIP fk_renstra_target__indikator_id__indikator_renstra (exists)' AS msg",
    "ALTER TABLE renstra_target ADD CONSTRAINT fk_renstra_target__indikator_id__indikator_renstra FOREIGN KEY (indikator_id) REFERENCES indikator_renstra(id) ON DELETE RESTRICT ON UPDATE CASCADE"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM information_schema.referential_constraints
           WHERE constraint_schema=@db AND constraint_name='fk_renstra_target_detail__renstra_target_id__renstra_target'),
    "SELECT 'SKIP fk_renstra_target_detail__renstra_target_id__renstra_target (exists)' AS msg",
    "ALTER TABLE renstra_target_detail ADD CONSTRAINT fk_renstra_target_detail__renstra_target_id__renstra_target FOREIGN KEY (renstra_target_id) REFERENCES renstra_target(id) ON DELETE CASCADE ON UPDATE CASCADE"
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

/* =========================
   Deferred (Phase 6):
   - renstra_tujuan.rpjmd_tujuan_id -> tujuan.id (legacy UUID/string mismatch)
========================= */
SELECT 'INFO: FK renstra_tujuan.rpjmd_tujuan_id ditunda sampai Phase 6 (mismatch UUID/INT)' AS msg;

/* Restore sql_mode */
SET SESSION sql_mode = @phase5_orig_sql_mode;
