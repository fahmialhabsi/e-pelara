"use strict";

/**
 * Sprint 1: integrasi master regulasi ke transaksi (program, kegiatan, sub_kegiatan),
 * perluasan regulasi_versi, is_active pada master_*, kolom master_indikator tambahan.
 * Semua perubahan additive / backward-compatible.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const qi = queryInterface;
    const tables = await qi.showAllTables();
    const has = (name) => tables.map((t) => String(t).toLowerCase()).includes(name);

    const addColIfMissing = async (table, column, def) => {
      if (!has(table)) return;
      const desc = await qi.describeTable(table).catch(() => null);
      if (desc && desc[column]) {
        console.log(`[migration] ⏭️  ${table}.${column} ada`);
        return;
      }
      await qi.addColumn(table, column, def);
      console.log(`[migration] ✅ ${table}.${column}`);
    };

    // --- regulasi_versi (spec paralel; pertahankan nomor_regulasi) ---
    await addColIfMissing("regulasi_versi", "nomor_peraturan", {
      type: Sequelize.STRING(128),
      allowNull: true,
      comment: "Paralel nomor_regulasi / alias Kepmendagri; preferensi API baru",
    });
    await addColIfMissing("regulasi_versi", "tanggal_berlaku", {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });
    await addColIfMissing("regulasi_versi", "sumber_dokumen_url", {
      type: Sequelize.STRING(512),
      allowNull: true,
    });
    await addColIfMissing("regulasi_versi", "created_by", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: "users", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    if (has("regulasi_versi")) {
      await qi.sequelize.query(
        "UPDATE regulasi_versi SET nomor_peraturan = nomor_regulasi WHERE nomor_peraturan IS NULL AND nomor_regulasi IS NOT NULL",
      );
    }

    const inputModeEnum = Sequelize.ENUM("LEGACY", "MASTER");

    const transaksiCols = [
      {
        table: "program",
        cols: [
          [
            "master_program_id",
            {
              type: Sequelize.INTEGER,
              allowNull: true,
              references: { model: "master_program", key: "id" },
              onUpdate: "CASCADE",
              onDelete: "SET NULL",
            },
          ],
          [
            "regulasi_versi_id",
            {
              type: Sequelize.INTEGER,
              allowNull: true,
              references: { model: "regulasi_versi", key: "id" },
              onUpdate: "CASCADE",
              onDelete: "SET NULL",
            },
          ],
          ["input_mode", { type: inputModeEnum, allowNull: false, defaultValue: "LEGACY" }],
          ["migration_status", { type: Sequelize.STRING(32), allowNull: true }],
          ["migrated_at", { type: Sequelize.DATE, allowNull: true }],
          [
            "migrated_by",
            {
              type: Sequelize.INTEGER,
              allowNull: true,
              references: { model: "users", key: "id" },
              onUpdate: "CASCADE",
              onDelete: "SET NULL",
            },
          ],
        ],
      },
      {
        table: "kegiatan",
        cols: [
          [
            "master_kegiatan_id",
            {
              type: Sequelize.INTEGER,
              allowNull: true,
              references: { model: "master_kegiatan", key: "id" },
              onUpdate: "CASCADE",
              onDelete: "SET NULL",
            },
          ],
          [
            "regulasi_versi_id",
            {
              type: Sequelize.INTEGER,
              allowNull: true,
              references: { model: "regulasi_versi", key: "id" },
              onUpdate: "CASCADE",
              onDelete: "SET NULL",
            },
          ],
          ["input_mode", { type: inputModeEnum, allowNull: false, defaultValue: "LEGACY" }],
          ["migration_status", { type: Sequelize.STRING(32), allowNull: true }],
          ["migrated_at", { type: Sequelize.DATE, allowNull: true }],
          [
            "migrated_by",
            {
              type: Sequelize.INTEGER,
              allowNull: true,
              references: { model: "users", key: "id" },
              onUpdate: "CASCADE",
              onDelete: "SET NULL",
            },
          ],
        ],
      },
      {
        table: "sub_kegiatan",
        cols: [
          [
            "master_sub_kegiatan_id",
            {
              type: Sequelize.INTEGER,
              allowNull: true,
              references: { model: "master_sub_kegiatan", key: "id" },
              onUpdate: "CASCADE",
              onDelete: "SET NULL",
            },
          ],
          [
            "regulasi_versi_id",
            {
              type: Sequelize.INTEGER,
              allowNull: true,
              references: { model: "regulasi_versi", key: "id" },
              onUpdate: "CASCADE",
              onDelete: "SET NULL",
            },
          ],
          ["input_mode", { type: inputModeEnum, allowNull: false, defaultValue: "LEGACY" }],
          ["migration_status", { type: Sequelize.STRING(32), allowNull: true }],
          ["migrated_at", { type: Sequelize.DATE, allowNull: true }],
          [
            "migrated_by",
            {
              type: Sequelize.INTEGER,
              allowNull: true,
              references: { model: "users", key: "id" },
              onUpdate: "CASCADE",
              onDelete: "SET NULL",
            },
          ],
        ],
      },
    ];

    for (const { table, cols } of transaksiCols) {
      for (const [name, def] of cols) {
        await addColIfMissing(table, name, def);
      }
    }

    const addIndexIfMissing = async (table, fields, name) => {
      if (!has(table)) return;
      try {
        await qi.addIndex(table, fields, { name });
      } catch (e) {
        const msg = String(e?.message || e?.original?.message || "");
        const code = e?.original?.code || e?.parent?.code;
        if (msg.includes("Duplicate") || code === "ER_DUP_KEYNAME") {
          console.log(`[migration] ⏭️  index ${name} sudah ada`);
          return;
        }
        throw e;
      }
    };

    await addIndexIfMissing("program", ["master_program_id"], "idx_program_master_program_id");
    await addIndexIfMissing("program", ["regulasi_versi_id"], "idx_program_regulasi_versi_id");
    await addIndexIfMissing("kegiatan", ["master_kegiatan_id"], "idx_kegiatan_master_kegiatan_id");
    await addIndexIfMissing("kegiatan", ["regulasi_versi_id"], "idx_kegiatan_regulasi_versi_id");
    await addIndexIfMissing(
      "sub_kegiatan",
      ["master_sub_kegiatan_id"],
      "idx_sub_kegiatan_master_sub_kegiatan_id",
    );
    await addIndexIfMissing(
      "sub_kegiatan",
      ["regulasi_versi_id"],
      "idx_sub_kegiatan_regulasi_versi_id",
    );

    // --- master_* is_active ---
    for (const table of ["master_program", "master_kegiatan", "master_sub_kegiatan"]) {
      await addColIfMissing(table, "is_active", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      });
    }

    // --- master_indikator (additive) ---
    await addColIfMissing("master_indikator", "level", {
      type: Sequelize.ENUM("PROGRAM", "KEGIATAN", "SUB_KEGIATAN"),
      allowNull: false,
      defaultValue: "SUB_KEGIATAN",
    });
    await addColIfMissing("master_indikator", "tipe", {
      type: Sequelize.ENUM("output", "outcome", "lainnya"),
      allowNull: false,
      defaultValue: "output",
    });
    await addColIfMissing("master_indikator", "is_wajib", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
    await addColIfMissing("master_indikator", "rumus", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await addColIfMissing("master_indikator", "satuan_bebas", {
      type: Sequelize.STRING(64),
      allowNull: true,
    });

    console.log("[migration] ✅ regulasi-master-transaksi-integration-sprint1");
  },

  async down(queryInterface, Sequelize) {
    const qi = queryInterface;
    const tables = await qi.showAllTables();
    const has = (name) => tables.map((t) => String(t).toLowerCase()).includes(name);

    const tryRemove = async (table, col) => {
      if (!has(table)) return;
      const desc = await qi.describeTable(table).catch(() => null);
      if (!desc || !desc[col]) return;
      await qi.removeColumn(table, col);
    };

    for (const col of [
      "migrated_by",
      "migrated_at",
      "migration_status",
      "input_mode",
      "regulasi_versi_id",
      "master_sub_kegiatan_id",
    ]) {
      await tryRemove("sub_kegiatan", col);
    }
    for (const col of [
      "migrated_by",
      "migrated_at",
      "migration_status",
      "input_mode",
      "regulasi_versi_id",
      "master_kegiatan_id",
    ]) {
      await tryRemove("kegiatan", col);
    }
    for (const col of [
      "migrated_by",
      "migrated_at",
      "migration_status",
      "input_mode",
      "regulasi_versi_id",
      "master_program_id",
    ]) {
      await tryRemove("program", col);
    }

    await tryRemove("master_indikator", "satuan_bebas");
    await tryRemove("master_indikator", "rumus");
    await tryRemove("master_indikator", "is_wajib");
    await tryRemove("master_indikator", "tipe");
    await tryRemove("master_indikator", "level");

    await tryRemove("master_sub_kegiatan", "is_active");
    await tryRemove("master_kegiatan", "is_active");
    await tryRemove("master_program", "is_active");

    await tryRemove("regulasi_versi", "created_by");
    await tryRemove("regulasi_versi", "sumber_dokumen_url");
    await tryRemove("regulasi_versi", "tanggal_berlaku");
    await tryRemove("regulasi_versi", "nomor_peraturan");

    // ENUM types MySQL — best-effort cleanup (skip if Sequelize tidak drop otomatis)
    try {
      await qi.sequelize.query(
        "ALTER TABLE program MODIFY COLUMN input_mode VARCHAR(16) NULL",
      );
    } catch (_) {
      /* ignore */
    }
    try {
      await qi.sequelize.query(
        "ALTER TABLE kegiatan MODIFY COLUMN input_mode VARCHAR(16) NULL",
      );
    } catch (_) {
      /* ignore */
    }
    try {
      await qi.sequelize.query(
        "ALTER TABLE sub_kegiatan MODIFY COLUMN input_mode VARCHAR(16) NULL",
      );
    } catch (_) {
      /* ignore */
    }
  },
};
