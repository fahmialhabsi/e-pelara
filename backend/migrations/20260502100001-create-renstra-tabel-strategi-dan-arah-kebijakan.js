"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("renstra_tabel_strategi", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },

      renstra_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      strategi_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      indikator_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      kode_strategi: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      deskripsi_strategi: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      indikator: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      baseline: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },

      satuan_target: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      lokasi: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      opd_penanggung_jawab: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      target_tahun_1: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
      },
      target_tahun_2: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
      },
      target_tahun_3: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
      },
      target_tahun_4: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
      },
      target_tahun_5: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
      },
      target_tahun_6: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
      },

      pagu_tahun_1: {
        type: Sequelize.DECIMAL(20, 2),
        defaultValue: 0,
      },
      pagu_tahun_2: {
        type: Sequelize.DECIMAL(20, 2),
        defaultValue: 0,
      },
      pagu_tahun_3: {
        type: Sequelize.DECIMAL(20, 2),
        defaultValue: 0,
      },
      pagu_tahun_4: {
        type: Sequelize.DECIMAL(20, 2),
        defaultValue: 0,
      },
      pagu_tahun_5: {
        type: Sequelize.DECIMAL(20, 2),
        defaultValue: 0,
      },
      pagu_tahun_6: {
        type: Sequelize.DECIMAL(20, 2),
        defaultValue: 0,
      },

      target_akhir_renstra: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
      },

      pagu_akhir_renstra: {
        type: Sequelize.DECIMAL(20, 2),
        defaultValue: 0,
      },

      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },

      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.createTable("renstra_tabel_arah_kebijakan", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },

      renstra_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      kebijakan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      indikator_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      kode_kebijakan: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      deskripsi_kebijakan: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      indikator: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      baseline: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },

      satuan_target: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      lokasi: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      opd_penanggung_jawab: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      target_tahun_1: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
      },
      target_tahun_2: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
      },
      target_tahun_3: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
      },
      target_tahun_4: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
      },
      target_tahun_5: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
      },
      target_tahun_6: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
      },

      pagu_tahun_1: {
        type: Sequelize.DECIMAL(20, 2),
        defaultValue: 0,
      },
      pagu_tahun_2: {
        type: Sequelize.DECIMAL(20, 2),
        defaultValue: 0,
      },
      pagu_tahun_3: {
        type: Sequelize.DECIMAL(20, 2),
        defaultValue: 0,
      },
      pagu_tahun_4: {
        type: Sequelize.DECIMAL(20, 2),
        defaultValue: 0,
      },
      pagu_tahun_5: {
        type: Sequelize.DECIMAL(20, 2),
        defaultValue: 0,
      },
      pagu_tahun_6: {
        type: Sequelize.DECIMAL(20, 2),
        defaultValue: 0,
      },

      target_akhir_renstra: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
      },

      pagu_akhir_renstra: {
        type: Sequelize.DECIMAL(20, 2),
        defaultValue: 0,
      },

      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },

      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addConstraint("renstra_tabel_strategi", {
      fields: ["renstra_id", "strategi_id", "indikator_id"],
      type: "unique",
      name: "uniq_renstra_tabel_strategi",
    });

    await queryInterface.addConstraint("renstra_tabel_arah_kebijakan", {
      fields: ["renstra_id", "kebijakan_id", "indikator_id"],
      type: "unique",
      name: "uniq_renstra_tabel_arah_kebijakan",
    });

    await queryInterface.addIndex("renstra_tabel_strategi", ["renstra_id"]);
    await queryInterface.addIndex("renstra_tabel_strategi", ["strategi_id"]);
    await queryInterface.addIndex("renstra_tabel_strategi", ["indikator_id"]);

    await queryInterface.addIndex("renstra_tabel_arah_kebijakan", ["renstra_id"]);
    await queryInterface.addIndex("renstra_tabel_arah_kebijakan", ["kebijakan_id"]);
    await queryInterface.addIndex("renstra_tabel_arah_kebijakan", ["indikator_id"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("renstra_tabel_arah_kebijakan");
    await queryInterface.dropTable("renstra_tabel_strategi");
  },
};