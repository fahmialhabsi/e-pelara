"use strict";

/**
 * Finalization migration modul planning:
 * - menyiapkan tabel `renstra` bila belum ada
 * - menyiapkan tabel `rpjmd_periode` sebagai compatibility mirror opsional
 *   (canonical periode tetap `periode_rpjmds`)
 * - menyelaraskan kolom refactor pada tabel legacy `renja` dan `rkpd`
 * - bersifat idempotent (aman dijalankan berulang)
 */

const RENJA_DEFAULT_STATUS = "draft";
const RKPD_DEFAULT_STATUS = "draft";
const RENSTRA_DEFAULT_STATUS = "draft";

async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables();
  const normalized = new Set(tables.map((t) => String(t).toLowerCase()));
  return normalized.has(String(tableName).toLowerCase());
}

async function ensureColumn(queryInterface, tableName, columnName, definition) {
  const desc = await queryInterface.describeTable(tableName);
  if (desc[columnName]) return;
  await queryInterface.addColumn(tableName, columnName, definition);
}

async function ensureIndex(queryInterface, tableName, fields, options) {
  try {
    await queryInterface.addIndex(tableName, fields, options);
  } catch (_err) {
    // no-op bila index sudah ada
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1) RPJMD PERIODE compatibility mirror (opsional)
    if (!(await tableExists(queryInterface, "rpjmd_periode"))) {
      await queryInterface.createTable("rpjmd_periode", {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        nama: { type: Sequelize.STRING(255), allowNull: true },
        tahun_awal: { type: Sequelize.INTEGER, allowNull: false },
        tahun_akhir: { type: Sequelize.INTEGER, allowNull: false },
        dokumen_url: { type: Sequelize.STRING(500), allowNull: true },
        status: {
          type: Sequelize.STRING(32),
          allowNull: false,
          defaultValue: RENSTRA_DEFAULT_STATUS,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn("NOW"),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn("NOW"),
        },
      });
    }

    // 2) RENSTRA DOC TABLE
    if (!(await tableExists(queryInterface, "renstra"))) {
      await queryInterface.createTable("renstra", {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        periode_awal: { type: Sequelize.INTEGER, allowNull: false },
        periode_akhir: { type: Sequelize.INTEGER, allowNull: false },
        judul: { type: Sequelize.STRING(255), allowNull: false },
        status: {
          type: Sequelize.STRING(32),
          allowNull: false,
          defaultValue: RENSTRA_DEFAULT_STATUS,
        },
        approval_status: {
          type: Sequelize.ENUM("DRAFT", "SUBMITTED", "APPROVED", "REJECTED"),
          allowNull: false,
          defaultValue: "DRAFT",
        },
        epelara_renstra_id: { type: Sequelize.STRING(100), allowNull: true },
        sinkronisasi_terakhir: { type: Sequelize.DATE, allowNull: true },
        sinkronisasi_status: {
          type: Sequelize.STRING(32),
          allowNull: false,
          defaultValue: "belum_sinkron",
        },
        dokumen_url: { type: Sequelize.STRING(500), allowNull: true },
        dibuat_oleh: { type: Sequelize.INTEGER, allowNull: true },
        disetujui_oleh: { type: Sequelize.INTEGER, allowNull: true },
        disetujui_at: { type: Sequelize.DATE, allowNull: true },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn("NOW"),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn("NOW"),
        },
      });
    } else {
      await ensureColumn(queryInterface, "renstra", "periode_awal", {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
      await ensureColumn(queryInterface, "renstra", "periode_akhir", {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
      await ensureColumn(queryInterface, "renstra", "judul", {
        type: Sequelize.STRING(255),
        allowNull: true,
      });
      await ensureColumn(queryInterface, "renstra", "status", {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: RENSTRA_DEFAULT_STATUS,
      });
      await ensureColumn(queryInterface, "renstra", "approval_status", {
        type: Sequelize.ENUM("DRAFT", "SUBMITTED", "APPROVED", "REJECTED"),
        allowNull: false,
        defaultValue: "DRAFT",
      });
      await ensureColumn(queryInterface, "renstra", "epelara_renstra_id", {
        type: Sequelize.STRING(100),
        allowNull: true,
      });
      await ensureColumn(queryInterface, "renstra", "sinkronisasi_terakhir", {
        type: Sequelize.DATE,
        allowNull: true,
      });
      await ensureColumn(queryInterface, "renstra", "sinkronisasi_status", {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "belum_sinkron",
      });
      await ensureColumn(queryInterface, "renstra", "dokumen_url", {
        type: Sequelize.STRING(500),
        allowNull: true,
      });
      await ensureColumn(queryInterface, "renstra", "dibuat_oleh", {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
      await ensureColumn(queryInterface, "renstra", "disetujui_oleh", {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
      await ensureColumn(queryInterface, "renstra", "disetujui_at", {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    // 3) RENJA (legacy table diselaraskan)
    if (!(await tableExists(queryInterface, "renja"))) {
      await queryInterface.createTable("renja", {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        tahun: { type: Sequelize.INTEGER, allowNull: false },
        renstra_id: { type: Sequelize.INTEGER, allowNull: true },
        judul: { type: Sequelize.STRING(255), allowNull: true },
        ketersediaan_submitted: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        distribusi_submitted: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        konsumsi_submitted: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        uptd_submitted: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        status: {
          type: Sequelize.STRING(32),
          allowNull: false,
          defaultValue: RENJA_DEFAULT_STATUS,
        },
        approval_status: {
          type: Sequelize.ENUM("DRAFT", "SUBMITTED", "APPROVED", "REJECTED"),
          allowNull: false,
          defaultValue: "DRAFT",
        },
        epelara_renja_id: { type: Sequelize.STRING(100), allowNull: true },
        sinkronisasi_status: {
          type: Sequelize.STRING(32),
          allowNull: false,
          defaultValue: "belum_sinkron",
        },
        sinkronisasi_terakhir: { type: Sequelize.DATE, allowNull: true },
        dibuat_oleh: { type: Sequelize.INTEGER, allowNull: true },
        disetujui_oleh: { type: Sequelize.INTEGER, allowNull: true },
        disetujui_at: { type: Sequelize.DATE, allowNull: true },
        periode_id: { type: Sequelize.INTEGER, allowNull: true },
        program: { type: Sequelize.STRING(255), allowNull: true },
        kegiatan: { type: Sequelize.STRING(255), allowNull: true },
        sub_kegiatan: { type: Sequelize.STRING(255), allowNull: true },
        indikator: { type: Sequelize.TEXT, allowNull: true },
        target: { type: Sequelize.STRING(255), allowNull: true },
        anggaran: { type: Sequelize.DECIMAL(18, 2), allowNull: true },
        jenis_dokumen: { type: Sequelize.STRING(50), allowNull: true },
        rkpd_id: { type: Sequelize.INTEGER, allowNull: true },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn("NOW"),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn("NOW"),
        },
      });
    } else {
      await ensureColumn(queryInterface, "renja", "renstra_id", {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
      await ensureColumn(queryInterface, "renja", "judul", {
        type: Sequelize.STRING(255),
        allowNull: true,
      });
      await ensureColumn(queryInterface, "renja", "ketersediaan_submitted", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
      await ensureColumn(queryInterface, "renja", "distribusi_submitted", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
      await ensureColumn(queryInterface, "renja", "konsumsi_submitted", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
      await ensureColumn(queryInterface, "renja", "uptd_submitted", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
      await ensureColumn(queryInterface, "renja", "status", {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: RENJA_DEFAULT_STATUS,
      });
      await ensureColumn(queryInterface, "renja", "approval_status", {
        type: Sequelize.ENUM("DRAFT", "SUBMITTED", "APPROVED", "REJECTED"),
        allowNull: false,
        defaultValue: "DRAFT",
      });
      await ensureColumn(queryInterface, "renja", "epelara_renja_id", {
        type: Sequelize.STRING(100),
        allowNull: true,
      });
      await ensureColumn(queryInterface, "renja", "sinkronisasi_status", {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "belum_sinkron",
      });
      await ensureColumn(queryInterface, "renja", "sinkronisasi_terakhir", {
        type: Sequelize.DATE,
        allowNull: true,
      });
      await ensureColumn(queryInterface, "renja", "dibuat_oleh", {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
      await ensureColumn(queryInterface, "renja", "disetujui_oleh", {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
      await ensureColumn(queryInterface, "renja", "disetujui_at", {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    // 4) RKPD (legacy table diselaraskan)
    if (!(await tableExists(queryInterface, "rkpd"))) {
      await queryInterface.createTable("rkpd", {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        tahun: { type: Sequelize.INTEGER, allowNull: false },
        periode_rpjmd_id: { type: Sequelize.INTEGER, allowNull: true },
        kode_program: { type: Sequelize.STRING(50), allowNull: true },
        nama_program: { type: Sequelize.STRING(255), allowNull: true },
        kode_kegiatan: { type: Sequelize.STRING(50), allowNull: true },
        nama_kegiatan: { type: Sequelize.STRING(255), allowNull: true },
        kode_sub_kegiatan: { type: Sequelize.STRING(50), allowNull: true },
        nama_sub_kegiatan: { type: Sequelize.STRING(255), allowNull: true },
        indikator: { type: Sequelize.TEXT, allowNull: true },
        target: { type: Sequelize.DECIMAL(18, 2), allowNull: true },
        satuan: { type: Sequelize.STRING(64), allowNull: true },
        pagu_anggaran: { type: Sequelize.DECIMAL(18, 2), allowNull: true },
        sumber_dana: { type: Sequelize.STRING(128), allowNull: true },
        opd_penanggung_jawab: { type: Sequelize.STRING(255), allowNull: true },
        status: {
          type: Sequelize.STRING(32),
          allowNull: false,
          defaultValue: RKPD_DEFAULT_STATUS,
        },
        approval_status: {
          type: Sequelize.ENUM("DRAFT", "SUBMITTED", "APPROVED", "REJECTED"),
          allowNull: false,
          defaultValue: "DRAFT",
        },
        epelara_rkpd_id: { type: Sequelize.STRING(100), allowNull: true },
        sinkronisasi_status: {
          type: Sequelize.STRING(32),
          allowNull: false,
          defaultValue: "belum_sinkron",
        },
        sinkronisasi_terakhir: { type: Sequelize.DATE, allowNull: true },
        dibuat_oleh: { type: Sequelize.INTEGER, allowNull: true },
        disetujui_oleh: { type: Sequelize.INTEGER, allowNull: true },
        disetujui_at: { type: Sequelize.DATE, allowNull: true },
        periode_id: { type: Sequelize.INTEGER, allowNull: true },
        opd_id: { type: Sequelize.INTEGER, allowNull: true },
        visi_id: { type: Sequelize.INTEGER, allowNull: true },
        misi_id: { type: Sequelize.INTEGER, allowNull: true },
        tujuan_id: { type: Sequelize.INTEGER, allowNull: true },
        sasaran_id: { type: Sequelize.INTEGER, allowNull: true },
        strategi_id: { type: Sequelize.INTEGER, allowNull: true },
        arah_id: { type: Sequelize.INTEGER, allowNull: true },
        program_id: { type: Sequelize.INTEGER, allowNull: true },
        kegiatan_id: { type: Sequelize.INTEGER, allowNull: true },
        sub_kegiatan_id: { type: Sequelize.INTEGER, allowNull: true },
        renstra_program_id: { type: Sequelize.INTEGER, allowNull: true },
        anggaran: { type: Sequelize.DECIMAL(18, 2), allowNull: true },
        jenis_dokumen: { type: Sequelize.STRING(50), allowNull: true },
        arah_kebijakan_id: { type: Sequelize.INTEGER, allowNull: true },
        penanggung_jawab: { type: Sequelize.STRING(255), allowNull: true },
        prioritas_daerah_id: { type: Sequelize.INTEGER, allowNull: true },
        prioritas_kepala_daerah_id: { type: Sequelize.INTEGER, allowNull: true },
        prioritas_nasional_id: { type: Sequelize.INTEGER, allowNull: true },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn("NOW"),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn("NOW"),
        },
      });
    } else {
      await ensureColumn(queryInterface, "rkpd", "periode_rpjmd_id", {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
      await ensureColumn(queryInterface, "rkpd", "kode_program", {
        type: Sequelize.STRING(50),
        allowNull: true,
      });
      await ensureColumn(queryInterface, "rkpd", "nama_program", {
        type: Sequelize.STRING(255),
        allowNull: true,
      });
      await ensureColumn(queryInterface, "rkpd", "kode_kegiatan", {
        type: Sequelize.STRING(50),
        allowNull: true,
      });
      await ensureColumn(queryInterface, "rkpd", "nama_kegiatan", {
        type: Sequelize.STRING(255),
        allowNull: true,
      });
      await ensureColumn(queryInterface, "rkpd", "kode_sub_kegiatan", {
        type: Sequelize.STRING(50),
        allowNull: true,
      });
      await ensureColumn(queryInterface, "rkpd", "nama_sub_kegiatan", {
        type: Sequelize.STRING(255),
        allowNull: true,
      });
      await ensureColumn(queryInterface, "rkpd", "satuan", {
        type: Sequelize.STRING(64),
        allowNull: true,
      });
      await ensureColumn(queryInterface, "rkpd", "pagu_anggaran", {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: true,
      });
      await ensureColumn(queryInterface, "rkpd", "sumber_dana", {
        type: Sequelize.STRING(128),
        allowNull: true,
      });
      await ensureColumn(queryInterface, "rkpd", "opd_penanggung_jawab", {
        type: Sequelize.STRING(255),
        allowNull: true,
      });
      await ensureColumn(queryInterface, "rkpd", "status", {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: RKPD_DEFAULT_STATUS,
      });
      await ensureColumn(queryInterface, "rkpd", "approval_status", {
        type: Sequelize.ENUM("DRAFT", "SUBMITTED", "APPROVED", "REJECTED"),
        allowNull: false,
        defaultValue: "DRAFT",
      });
      await ensureColumn(queryInterface, "rkpd", "epelara_rkpd_id", {
        type: Sequelize.STRING(100),
        allowNull: true,
      });
      await ensureColumn(queryInterface, "rkpd", "sinkronisasi_status", {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "belum_sinkron",
      });
      await ensureColumn(queryInterface, "rkpd", "sinkronisasi_terakhir", {
        type: Sequelize.DATE,
        allowNull: true,
      });
      await ensureColumn(queryInterface, "rkpd", "dibuat_oleh", {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
      await ensureColumn(queryInterface, "rkpd", "disetujui_oleh", {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
      await ensureColumn(queryInterface, "rkpd", "disetujui_at", {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    await ensureIndex(queryInterface, "renstra", ["periode_awal", "periode_akhir"], {
      name: "idx_renstra_periode",
    });
    await ensureIndex(queryInterface, "renstra", ["status"], {
      name: "idx_renstra_status",
    });
    await ensureIndex(queryInterface, "renja", ["tahun"], { name: "idx_renja_tahun" });
    await ensureIndex(queryInterface, "renja", ["status"], { name: "idx_renja_status" });
    await ensureIndex(queryInterface, "rkpd", ["tahun"], { name: "idx_rkpd_tahun" });
    await ensureIndex(queryInterface, "rkpd", ["status"], { name: "idx_rkpd_status" });
    await ensureIndex(queryInterface, "rkpd", ["tahun", "kode_sub_kegiatan"], {
      name: "rkpd_tahun_subkeg_idx",
    });
  },

  async down(queryInterface) {
    // Minimal rollback: lepaskan index tambahan tanpa menghapus data planning.
    await queryInterface.removeIndex("rkpd", "rkpd_tahun_subkeg_idx").catch(() => {});
    await queryInterface.removeIndex("rkpd", "idx_rkpd_status").catch(() => {});
    await queryInterface.removeIndex("rkpd", "idx_rkpd_tahun").catch(() => {});
    await queryInterface.removeIndex("renja", "idx_renja_status").catch(() => {});
    await queryInterface.removeIndex("renja", "idx_renja_tahun").catch(() => {});
    await queryInterface.removeIndex("renstra", "idx_renstra_status").catch(() => {});
    await queryInterface.removeIndex("renstra", "idx_renstra_periode").catch(() => {});
  },
};
