"use strict";

/**
 * Domain perencanaan v2: dokumen RKPD/Renja terpisah dari baris legacy `rkpd` / `renja`.
 * `periode_rpjmds` (model PeriodeRpjmd) dipakai sebagai jendela RPJMD — tidak membuat tabel rpjmd_periode baru.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const t = new Set(tables.map((x) => String(x).toLowerCase()));

    const add = async (name, fn) => {
      if (t.has(name.toLowerCase())) {
        console.log(`[migration] ⏭️  ${name} sudah ada`);
        return;
      }
      await fn();
      t.add(name.toLowerCase());
      console.log(`[migration] ✅ ${name} dibuat`);
    };

    await add("perangkat_daerah", async () => {
      await queryInterface.createTable("perangkat_daerah", {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        kode: { type: Sequelize.STRING(32), allowNull: true },
        nama: { type: Sequelize.STRING(255), allowNull: false },
        aktif: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
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
      await queryInterface.addIndex("perangkat_daerah", ["aktif"], {
        name: "idx_perangkat_daerah_aktif",
      });
    });

    await add("rpjmd_dokumen", async () => {
      await queryInterface.createTable("rpjmd_dokumen", {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        periode_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "periode_rpjmds", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT",
        },
        judul: { type: Sequelize.STRING(512), allowNull: false },
        versi: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
        status: {
          type: Sequelize.ENUM("draft", "review", "final"),
          allowNull: false,
          defaultValue: "draft",
        },
        is_final_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        tanggal_pengesahan: { type: Sequelize.DATEONLY, allowNull: true },
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
      await queryInterface.addIndex("rpjmd_dokumen", ["periode_id"], {
        name: "idx_rpjmd_dokumen_periode",
      });
      await queryInterface.addIndex("rpjmd_dokumen", ["status"], {
        name: "idx_rpjmd_dokumen_status",
      });
    });

    await add("renstra_pd_dokumen", async () => {
      await queryInterface.createTable("renstra_pd_dokumen", {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        periode_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "periode_rpjmds", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT",
        },
        perangkat_daerah_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "perangkat_daerah", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT",
        },
        judul: { type: Sequelize.STRING(512), allowNull: false },
        versi: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
        status: {
          type: Sequelize.ENUM("draft", "review", "final"),
          allowNull: false,
          defaultValue: "draft",
        },
        is_final_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        tanggal_pengesahan: { type: Sequelize.DATEONLY, allowNull: true },
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
      await queryInterface.addIndex("renstra_pd_dokumen", ["periode_id"], {
        name: "idx_renstra_pd_periode",
      });
      await queryInterface.addIndex("renstra_pd_dokumen", ["perangkat_daerah_id"], {
        name: "idx_renstra_pd_pd",
      });
      await queryInterface.addIndex(
        "renstra_pd_dokumen",
        ["periode_id", "perangkat_daerah_id", "versi"],
        { name: "idx_renstra_pd_lookup" },
      );
    });

    await add("rkpd_dokumen", async () => {
      await queryInterface.createTable("rkpd_dokumen", {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        periode_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "periode_rpjmds", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT",
        },
        tahun: { type: Sequelize.INTEGER, allowNull: false },
        judul: { type: Sequelize.STRING(512), allowNull: false },
        versi: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
        status: {
          type: Sequelize.ENUM("draft", "review", "final"),
          allowNull: false,
          defaultValue: "draft",
        },
        is_final_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        tanggal_pengesahan: { type: Sequelize.DATEONLY, allowNull: true },
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
      await queryInterface.addIndex("rkpd_dokumen", ["periode_id"], {
        name: "idx_rkpd_dokumen_periode",
      });
      await queryInterface.addIndex("rkpd_dokumen", ["tahun"], {
        name: "idx_rkpd_dokumen_tahun",
      });
    });

    await add("rkpd_item", async () => {
      await queryInterface.createTable("rkpd_item", {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        rkpd_dokumen_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "rkpd_dokumen", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        urutan: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        prioritas_daerah: { type: Sequelize.STRING(512), allowNull: true },
        program: { type: Sequelize.STRING(512), allowNull: true },
        kegiatan: { type: Sequelize.STRING(512), allowNull: true },
        sub_kegiatan: { type: Sequelize.STRING(512), allowNull: true },
        indikator: { type: Sequelize.TEXT, allowNull: true },
        target: { type: Sequelize.DECIMAL(20, 4), allowNull: true },
        satuan: { type: Sequelize.STRING(64), allowNull: true },
        pagu: { type: Sequelize.DECIMAL(20, 2), allowNull: true },
        perangkat_daerah_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: "perangkat_daerah", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        status_baris: {
          type: Sequelize.ENUM("draft", "siap", "terkunci"),
          allowNull: false,
          defaultValue: "draft",
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
      await queryInterface.addIndex("rkpd_item", ["rkpd_dokumen_id"], {
        name: "idx_rkpd_item_dokumen",
      });
    });

    await add("renja_dokumen", async () => {
      await queryInterface.createTable("renja_dokumen", {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        periode_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "periode_rpjmds", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT",
        },
        tahun: { type: Sequelize.INTEGER, allowNull: false },
        perangkat_daerah_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "perangkat_daerah", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT",
        },
        renstra_pd_dokumen_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "renstra_pd_dokumen", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT",
        },
        rkpd_dokumen_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: "rkpd_dokumen", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        judul: { type: Sequelize.STRING(512), allowNull: false },
        versi: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
        status: {
          type: Sequelize.ENUM("draft", "review", "final"),
          allowNull: false,
          defaultValue: "draft",
        },
        is_final_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        tanggal_pengesahan: { type: Sequelize.DATEONLY, allowNull: true },
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
      await queryInterface.addIndex("renja_dokumen", ["periode_id"], {
        name: "idx_renja_dokumen_periode",
      });
      await queryInterface.addIndex("renja_dokumen", ["tahun", "perangkat_daerah_id"], {
        name: "idx_renja_dokumen_tahun_pd",
      });
      await queryInterface.addIndex("renja_dokumen", ["rkpd_dokumen_id"], {
        name: "idx_renja_dokumen_rkpd",
      });
    });

    await add("renja_item", async () => {
      await queryInterface.createTable("renja_item", {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        renja_dokumen_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "renja_dokumen", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        urutan: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        program: { type: Sequelize.STRING(512), allowNull: true },
        kegiatan: { type: Sequelize.STRING(512), allowNull: true },
        sub_kegiatan: { type: Sequelize.STRING(512), allowNull: true },
        indikator: { type: Sequelize.TEXT, allowNull: true },
        target: { type: Sequelize.DECIMAL(20, 4), allowNull: true },
        satuan: { type: Sequelize.STRING(64), allowNull: true },
        pagu: { type: Sequelize.DECIMAL(20, 2), allowNull: true },
        status_baris: {
          type: Sequelize.ENUM("draft", "siap", "terkunci"),
          allowNull: false,
          defaultValue: "draft",
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
      await queryInterface.addIndex("renja_item", ["renja_dokumen_id"], {
        name: "idx_renja_item_dokumen",
      });
    });

    await add("renja_rkpd_item_map", async () => {
      await queryInterface.createTable("renja_rkpd_item_map", {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        renja_item_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          unique: true,
          references: { model: "renja_item", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        rkpd_item_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "rkpd_item", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT",
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
      await queryInterface.addIndex("renja_rkpd_item_map", ["rkpd_item_id"], {
        name: "idx_map_rkpd_item",
      });
    });
  },

  async down(queryInterface) {
    const drop = async (name) => {
      await queryInterface.dropTable(name).catch(() => {});
    };
    await drop("renja_rkpd_item_map");
    await drop("renja_item");
    await drop("renja_dokumen");
    await drop("rkpd_item");
    await drop("rkpd_dokumen");
    await drop("renstra_pd_dokumen");
    await drop("rpjmd_dokumen");
    await drop("perangkat_daerah");
  },
};
