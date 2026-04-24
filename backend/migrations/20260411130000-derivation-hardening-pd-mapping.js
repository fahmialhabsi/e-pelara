"use strict";

/**
 * Sprint 2.6 — derivation hardening:
 * - Mapping PD ↔ OPD (ID, bukan string)
 * - derivation_key untuk idempotensi
 * - renstra_pd_dokumen.renstra_opd_id → struktur Renstra lama
 * - renja_dokumen.legacy_renja_id → penyelesaian dual Renja (jejak ke legacy)
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const has = (n) => tables.map((t) => String(t).toLowerCase()).includes(n.toLowerCase());

    if (!has("perangkat_daerah_opd_mapping")) {
      await queryInterface.createTable("perangkat_daerah_opd_mapping", {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        perangkat_daerah_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          unique: true,
          references: { model: "perangkat_daerah", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        opd_penanggung_jawab_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "opd_penanggung_jawab", key: "id" },
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
      await queryInterface.addIndex("perangkat_daerah_opd_mapping", ["opd_penanggung_jawab_id"], {
        name: "idx_pd_opd_map_opd",
      });
    }

    const addCol = async (table, column, def) => {
      const desc = await queryInterface.describeTable(table);
      if (!desc[column]) {
        await queryInterface.addColumn(table, column, def);
      }
    };

    await addCol("renstra_pd_dokumen", "derivation_key", {
      type: Sequelize.STRING(128),
      allowNull: true,
    });
    await addCol("renstra_pd_dokumen", "renstra_opd_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: "renstra_opd", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
    await addCol("rkpd_dokumen", "derivation_key", {
      type: Sequelize.STRING(128),
      allowNull: true,
    });
    await addCol("renja_dokumen", "derivation_key", {
      type: Sequelize.STRING(128),
      allowNull: true,
    });
    await addCol("renja_dokumen", "legacy_renja_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: "renja", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    try {
      await queryInterface.addIndex("renstra_pd_dokumen", ["derivation_key"], {
        name: "uq_renstra_pd_derivation_key",
        unique: true,
      });
    } catch (_e) {
      /* index may exist */
    }
    try {
      await queryInterface.addIndex("rkpd_dokumen", ["derivation_key"], {
        name: "uq_rkpd_dok_derivation_key",
        unique: true,
      });
    } catch (_e) {
      /* */
    }
    try {
      await queryInterface.addIndex("renja_dokumen", ["derivation_key"], {
        name: "uq_renja_dok_derivation_key",
        unique: true,
      });
    } catch (_e) {
      /* */
    }
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("renstra_pd_dokumen", "uq_renstra_pd_derivation_key").catch(() => {});
    await queryInterface.removeIndex("rkpd_dokumen", "uq_rkpd_dok_derivation_key").catch(() => {});
    await queryInterface.removeIndex("renja_dokumen", "uq_renja_dok_derivation_key").catch(() => {});
    const drop = async (t, c) => {
      try {
        await queryInterface.removeColumn(t, c);
      } catch (_e) {
        /* */
      }
    };
    await drop("renja_dokumen", "legacy_renja_id");
    await drop("renja_dokumen", "derivation_key");
    await drop("rkpd_dokumen", "derivation_key");
    await drop("renstra_pd_dokumen", "renstra_opd_id");
    await drop("renstra_pd_dokumen", "derivation_key");
    await queryInterface.dropTable("perangkat_daerah_opd_mapping").catch(() => {});
  },
};
