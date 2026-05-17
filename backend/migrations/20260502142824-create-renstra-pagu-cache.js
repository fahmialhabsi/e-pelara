"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("renstra_pagu_cache", {
      id: {
        type: Sequelize.BIGINT,
        autoIncrement: true,
        primaryKey: true,
      },

      renstra_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },

      stage: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },

      ref_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },

      pagu_tahun_1: {
        type: Sequelize.DECIMAL(18, 2),
        defaultValue: 0,
      },
      pagu_tahun_2: {
        type: Sequelize.DECIMAL(18, 2),
        defaultValue: 0,
      },
      pagu_tahun_3: {
        type: Sequelize.DECIMAL(18, 2),
        defaultValue: 0,
      },
      pagu_tahun_4: {
        type: Sequelize.DECIMAL(18, 2),
        defaultValue: 0,
      },
      pagu_tahun_5: {
        type: Sequelize.DECIMAL(18, 2),
        defaultValue: 0,
      },
      pagu_tahun_6: {
        type: Sequelize.DECIMAL(18, 2),
        defaultValue: 0,
      },

      pagu_akhir_renstra: {
        type: Sequelize.DECIMAL(20, 2),
        defaultValue: 0,
      },

      cached_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },

      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // 🔥 UNIQUE KEY (WAJIB)
    await queryInterface.addConstraint("renstra_pagu_cache", {
      fields: ["renstra_id", "stage", "ref_id"],
      type: "unique",
      name: "unique_renstra_stage_ref",
    });

    // 🔥 INDEX (BIAR CEPAT)
    await queryInterface.addIndex("renstra_pagu_cache", [
      "stage",
      "ref_id",
    ]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("renstra_pagu_cache");
  },
};