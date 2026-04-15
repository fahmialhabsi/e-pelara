"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.map((t) => String(t).toLowerCase()).includes("mapping_indikator")) {
      console.log("[migration] ⏭️  mapping_indikator sudah ada");
      return;
    }

    await queryInterface.createTable("mapping_indikator", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      regulasi_versi_from_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "regulasi_versi", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      regulasi_versi_to_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "regulasi_versi", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      mapping_sub_kegiatan_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "mapping_sub_kegiatan", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      old_master_indikator_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "master_indikator", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      new_master_indikator_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "master_indikator", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      old_indikator_text: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      new_indikator_text: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      old_satuan: {
        type: Sequelize.STRING(128),
        allowNull: true,
      },
      new_satuan: {
        type: Sequelize.STRING(128),
        allowNull: true,
      },
      confidence_score: {
        type: Sequelize.DECIMAL(5, 4),
        allowNull: false,
        defaultValue: 0,
      },
      mapping_type: {
        type: Sequelize.ENUM("auto", "manual"),
        allowNull: false,
        defaultValue: "auto",
      },
      status: {
        type: Sequelize.ENUM("pending", "approved", "rejected"),
        allowNull: false,
        defaultValue: "pending",
      },
      match_reason: {
        type: Sequelize.STRING(64),
        allowNull: true,
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

    await queryInterface.addIndex(
      "mapping_indikator",
      ["regulasi_versi_from_id", "regulasi_versi_to_id", "status"],
      { name: "idx_mapping_ind_from_to_status" },
    );

    console.log("[migration] ✅ mapping_indikator");
  },

  async down(queryInterface) {
    await queryInterface.dropTable("mapping_indikator").catch(() => {});
  },
};
