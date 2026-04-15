"use strict";

/**
 * RENJA governance v3 (additive, backward-aware)
 * - Pisah status menjadi: workflow_status, document_phase, document_kind
 * - Tambah struktur bab/narasi terpisah, revision log, snapshot
 * - Tambah metadata source/mismatch pada renja_item
 */

function normalizeTableName(entry) {
  if (typeof entry === "string") return entry;
  if (Array.isArray(entry)) return entry[1] || entry[0] || "";
  if (entry && typeof entry === "object") {
    return entry.tableName || entry.TABLE_NAME || Object.values(entry)[0] || "";
  }
  return "";
}

async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables();
  const set = new Set(
    (tables || [])
      .map((t) => normalizeTableName(t))
      .filter(Boolean)
      .map((t) => String(t).toLowerCase()),
  );
  return set.has(String(tableName || "").toLowerCase());
}

async function columnExists(queryInterface, tableName, columnName) {
  const d = await queryInterface.describeTable(tableName).catch(() => null);
  if (!d) return false;
  return Boolean(d[columnName]);
}

async function ensureColumn(queryInterface, Sequelize, tableName, columnName, definition) {
  if (!(await columnExists(queryInterface, tableName, columnName))) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
}

async function ensureIndex(queryInterface, table, fields, options) {
  try {
    await queryInterface.addIndex(table, fields, options);
  } catch (_) {
    // index may already exist
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    if (!(await tableExists(queryInterface, "renja_dokumen")) || !(await tableExists(queryInterface, "renja_item"))) {
      throw new Error("renja_dokumen / renja_item belum ada. Jalankan migration planning v2 dulu.");
    }

    // ----------------------------------------------------
    // 1) RENJA DOKUMEN: governance fields
    // ----------------------------------------------------
    await ensureColumn(queryInterface, Sequelize, "renja_dokumen", "workflow_status", {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: "draft",
      comment: "draft|submitted|reviewed|approved|rejected|published|archived",
    });
    await ensureColumn(queryInterface, Sequelize, "renja_dokumen", "document_phase", {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: "rancangan_awal",
      comment: "rancangan_awal|rancangan|forum_perangkat_daerah|pasca_musrenbang|final",
    });
    await ensureColumn(queryInterface, Sequelize, "renja_dokumen", "document_kind", {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: "renja_awal",
      comment: "renja_awal|renja_perubahan",
    });

    await ensureColumn(queryInterface, Sequelize, "renja_dokumen", "nomor_dokumen", {
      type: DataTypes.STRING(100),
      allowNull: true,
    });
    await ensureColumn(queryInterface, Sequelize, "renja_dokumen", "nama_dokumen", {
      type: DataTypes.STRING(255),
      allowNull: true,
    });
    await ensureColumn(queryInterface, Sequelize, "renja_dokumen", "parent_dokumen_id", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "renja_dokumen", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
    await ensureColumn(queryInterface, Sequelize, "renja_dokumen", "base_dokumen_id", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "renja_dokumen", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
    await ensureColumn(queryInterface, Sequelize, "renja_dokumen", "is_perubahan", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await ensureColumn(queryInterface, Sequelize, "renja_dokumen", "perubahan_ke", {
      type: DataTypes.INTEGER,
      allowNull: true,
    });
    await ensureColumn(queryInterface, Sequelize, "renja_dokumen", "tanggal_mulai_berlaku", {
      type: DataTypes.DATEONLY,
      allowNull: true,
    });
    await ensureColumn(queryInterface, Sequelize, "renja_dokumen", "tanggal_akhir_berlaku", {
      type: DataTypes.DATEONLY,
      allowNull: true,
    });
    await ensureColumn(queryInterface, Sequelize, "renja_dokumen", "keterangan", {
      type: DataTypes.TEXT,
      allowNull: true,
    });
    await ensureColumn(queryInterface, Sequelize, "renja_dokumen", "current_version_id", {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    });
    await ensureColumn(queryInterface, Sequelize, "renja_dokumen", "published_at", {
      type: DataTypes.DATE,
      allowNull: true,
    });
    await ensureColumn(queryInterface, Sequelize, "renja_dokumen", "published_by", {
      type: DataTypes.INTEGER,
      allowNull: true,
    });
    await ensureColumn(queryInterface, Sequelize, "renja_dokumen", "approved_by", {
      type: DataTypes.INTEGER,
      allowNull: true,
    });
    await ensureColumn(queryInterface, Sequelize, "renja_dokumen", "approved_at", {
      type: DataTypes.DATE,
      allowNull: true,
    });
    await ensureColumn(queryInterface, Sequelize, "renja_dokumen", "created_by", {
      type: DataTypes.INTEGER,
      allowNull: true,
    });
    await ensureColumn(queryInterface, Sequelize, "renja_dokumen", "updated_by", {
      type: DataTypes.INTEGER,
      allowNull: true,
    });
    await ensureColumn(queryInterface, Sequelize, "renja_dokumen", "deleted_by", {
      type: DataTypes.INTEGER,
      allowNull: true,
    });
    await ensureColumn(queryInterface, Sequelize, "renja_dokumen", "deleted_at", {
      type: DataTypes.DATE,
      allowNull: true,
    });

    await ensureIndex(queryInterface, "renja_dokumen", ["workflow_status"], {
      name: "idx_renja_doc_workflow_status",
    });
    await ensureIndex(queryInterface, "renja_dokumen", ["document_phase"], {
      name: "idx_renja_doc_phase",
    });
    await ensureIndex(queryInterface, "renja_dokumen", ["document_kind"], {
      name: "idx_renja_doc_kind",
    });
    await ensureIndex(queryInterface, "renja_dokumen", ["tahun", "perangkat_daerah_id", "workflow_status"], {
      name: "idx_renja_doc_tahun_pd_wf",
    });
    await ensureIndex(queryInterface, "renja_dokumen", ["deleted_at"], {
      name: "idx_renja_doc_deleted_at",
    });

    // ----------------------------------------------------
    // 2) RENJA ITEM: source relation + mismatch marker
    // ----------------------------------------------------
    await ensureColumn(queryInterface, Sequelize, "renja_item", "source_mode", {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: "MANUAL",
      comment: "RENSTRA|RKPD|IRISAN|MANUAL",
    });
    await ensureColumn(queryInterface, Sequelize, "renja_item", "source_renstra_program_id", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "renstra_program", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
    await ensureColumn(queryInterface, Sequelize, "renja_item", "source_renstra_kegiatan_id", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "renstra_kegiatan", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
    await ensureColumn(queryInterface, Sequelize, "renja_item", "source_renstra_subkegiatan_id", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "renstra_subkegiatan", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
    await ensureColumn(queryInterface, Sequelize, "renja_item", "source_indikator_renstra_id", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "indikator_renstra", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
    await ensureColumn(queryInterface, Sequelize, "renja_item", "source_rkpd_item_id", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "rkpd_item", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await ensureColumn(queryInterface, Sequelize, "renja_item", "program_id", {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: { model: "program", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
    await ensureColumn(queryInterface, Sequelize, "renja_item", "kegiatan_id", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "kegiatan", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
    await ensureColumn(queryInterface, Sequelize, "renja_item", "sub_kegiatan_id", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "sub_kegiatan", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await ensureColumn(queryInterface, Sequelize, "renja_item", "kode_program", {
      type: DataTypes.STRING(50),
      allowNull: true,
    });
    await ensureColumn(queryInterface, Sequelize, "renja_item", "kode_kegiatan", {
      type: DataTypes.STRING(50),
      allowNull: true,
    });
    await ensureColumn(queryInterface, Sequelize, "renja_item", "kode_sub_kegiatan", {
      type: DataTypes.STRING(50),
      allowNull: true,
    });

    await ensureColumn(queryInterface, Sequelize, "renja_item", "target_numerik", {
      type: DataTypes.DECIMAL(20, 4),
      allowNull: true,
    });
    await ensureColumn(queryInterface, Sequelize, "renja_item", "target_teks", {
      type: DataTypes.STRING(255),
      allowNull: true,
    });
    await ensureColumn(queryInterface, Sequelize, "renja_item", "lokasi", {
      type: DataTypes.STRING(255),
      allowNull: true,
    });
    await ensureColumn(queryInterface, Sequelize, "renja_item", "kelompok_sasaran", {
      type: DataTypes.STRING(255),
      allowNull: true,
    });
    await ensureColumn(queryInterface, Sequelize, "renja_item", "pagu_indikatif", {
      type: DataTypes.DECIMAL(20, 2),
      allowNull: true,
    });
    await ensureColumn(queryInterface, Sequelize, "renja_item", "catatan", {
      type: DataTypes.TEXT,
      allowNull: true,
    });
    await ensureColumn(queryInterface, Sequelize, "renja_item", "mismatch_status", {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: "matched",
      comment: "matched|renstra_only|rkpd_only|code_name_changed|manual_override",
    });

    await ensureIndex(queryInterface, "renja_item", ["renja_dokumen_id", "source_mode"], {
      name: "idx_renja_item_doc_source_mode",
    });
    await ensureIndex(queryInterface, "renja_item", ["mismatch_status"], {
      name: "idx_renja_item_mismatch_status",
    });

    // ----------------------------------------------------
    // 3) RENJA DOKUMEN VERSION: parent version + publish metadata
    // ----------------------------------------------------
    await ensureColumn(queryInterface, Sequelize, "renja_dokumen_version", "version_label", {
      type: DataTypes.STRING(100),
      allowNull: true,
    });
    await ensureColumn(queryInterface, Sequelize, "renja_dokumen_version", "parent_version_id", {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      references: { model: "renja_dokumen_version", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
    await ensureColumn(queryInterface, Sequelize, "renja_dokumen_version", "base_dokumen_id", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "renja_dokumen", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
    await ensureColumn(queryInterface, Sequelize, "renja_dokumen_version", "change_type", {
      type: DataTypes.STRING(32),
      allowNull: true,
      defaultValue: "revision",
    });
    await ensureColumn(queryInterface, Sequelize, "renja_dokumen_version", "change_reason", {
      type: DataTypes.TEXT,
      allowNull: true,
    });
    await ensureColumn(queryInterface, Sequelize, "renja_dokumen_version", "snapshot_hash", {
      type: DataTypes.STRING(64),
      allowNull: true,
    });
    await ensureColumn(queryInterface, Sequelize, "renja_dokumen_version", "is_published", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await ensureColumn(queryInterface, Sequelize, "renja_dokumen_version", "published_at", {
      type: DataTypes.DATE,
      allowNull: true,
    });
    await ensureColumn(queryInterface, Sequelize, "renja_dokumen_version", "approved_by", {
      type: DataTypes.INTEGER,
      allowNull: true,
    });
    await ensureColumn(queryInterface, Sequelize, "renja_dokumen_version", "approved_at", {
      type: DataTypes.DATE,
      allowNull: true,
    });

    await ensureIndex(queryInterface, "renja_dokumen_version", ["renja_dokumen_id", "parent_version_id"], {
      name: "idx_renja_doc_ver_parent",
    });
    await ensureIndex(queryInterface, "renja_dokumen_version", ["snapshot_hash"], {
      name: "idx_renja_doc_ver_snapshot_hash",
    });

    // ----------------------------------------------------
    // 4) RENJA NARRATIVE SECTIONS
    // ----------------------------------------------------
    if (!(await tableExists(queryInterface, "renja_dokumen_section"))) {
      await queryInterface.createTable("renja_dokumen_section", {
        id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
        renja_dokumen_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: "renja_dokumen", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        section_key: { type: DataTypes.STRING(32), allowNull: false },
        section_title: { type: DataTypes.STRING(255), allowNull: false },
        content: { type: DataTypes.TEXT("long"), allowNull: true },
        completion_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
        is_locked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        source_mode: { type: DataTypes.STRING(16), allowNull: false, defaultValue: "MANUAL" },
        updated_by: { type: DataTypes.INTEGER, allowNull: true },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      });
      await ensureIndex(queryInterface, "renja_dokumen_section", ["renja_dokumen_id", "section_key"], {
        name: "uq_renja_doc_section",
        unique: true,
      });
    }

    // ----------------------------------------------------
    // 5) RENJA REVISION LOG
    // ----------------------------------------------------
    if (!(await tableExists(queryInterface, "renja_revision_log"))) {
      await queryInterface.createTable("renja_revision_log", {
        id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
        renja_dokumen_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: "renja_dokumen", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        from_version_id: {
          type: DataTypes.BIGINT.UNSIGNED,
          allowNull: false,
          references: { model: "renja_dokumen_version", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT",
        },
        to_version_id: {
          type: DataTypes.BIGINT.UNSIGNED,
          allowNull: false,
          references: { model: "renja_dokumen_version", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT",
        },
        revision_type: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "perubahan" },
        change_reason: { type: DataTypes.TEXT, allowNull: true },
        created_by: { type: DataTypes.INTEGER, allowNull: true },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      });
      await ensureIndex(queryInterface, "renja_revision_log", ["renja_dokumen_id", "from_version_id", "to_version_id"], {
        name: "uq_renja_revision_pair",
        unique: true,
      });
    }

    // ----------------------------------------------------
    // 6) RENJA SNAPSHOT
    // ----------------------------------------------------
    if (!(await tableExists(queryInterface, "renja_snapshot"))) {
      await queryInterface.createTable("renja_snapshot", {
        id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
        renja_dokumen_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: "renja_dokumen", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        renja_dokumen_version_id: {
          type: DataTypes.BIGINT.UNSIGNED,
          allowNull: true,
          references: { model: "renja_dokumen_version", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        snapshot_type: { type: DataTypes.STRING(32), allowNull: false },
        snapshot_data: { type: DataTypes.JSON, allowNull: true },
        snapshot_hash: { type: DataTypes.STRING(64), allowNull: true },
        created_by: { type: DataTypes.INTEGER, allowNull: true },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      });
      await ensureIndex(queryInterface, "renja_snapshot", ["renja_dokumen_id", "snapshot_type", "created_at"], {
        name: "idx_renja_snapshot_doc_type_time",
      });
      await ensureIndex(queryInterface, "renja_snapshot", ["snapshot_hash"], {
        name: "idx_renja_snapshot_hash",
      });
    }

    // ----------------------------------------------------
    // 7) Backfill minimal
    // ----------------------------------------------------
    await queryInterface.sequelize.query(`
      UPDATE renja_dokumen
      SET
        workflow_status = CASE
          WHEN status = 'final' THEN 'published'
          WHEN status = 'review' THEN 'reviewed'
          ELSE 'draft'
        END,
        document_phase = CASE
          WHEN status = 'final' THEN 'final'
          WHEN status = 'review' THEN 'rancangan'
          ELSE 'rancangan_awal'
        END,
        document_kind = CASE WHEN is_perubahan = 1 THEN 'renja_perubahan' ELSE 'renja_awal' END,
        nama_dokumen = COALESCE(nama_dokumen, judul)
      WHERE workflow_status IS NOT NULL
    `);

    await queryInterface.sequelize.query(`
      UPDATE renja_item
      SET
        pagu_indikatif = COALESCE(pagu_indikatif, pagu),
        source_rkpd_item_id = COALESCE(source_rkpd_item_id, (
          SELECT m.rkpd_item_id FROM renja_rkpd_item_map m WHERE m.renja_item_id = renja_item.id LIMIT 1
        ))
    `);
  },

  async down(queryInterface) {
    // Non-destructive rollback: hanya drop tabel baru (kolom additive dipertahankan).
    await queryInterface.dropTable("renja_snapshot").catch(() => {});
    await queryInterface.dropTable("renja_revision_log").catch(() => {});
    await queryInterface.dropTable("renja_dokumen_section").catch(() => {});
  },
};
