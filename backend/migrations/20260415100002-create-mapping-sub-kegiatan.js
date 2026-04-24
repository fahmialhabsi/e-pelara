"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.map((t) => String(t).toLowerCase()).includes("mapping_sub_kegiatan")) {
      console.log("[migration] ⏭️  mapping_sub_kegiatan sudah ada");
      return;
    }

    await queryInterface.createTable("mapping_sub_kegiatan", {
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
      old_master_sub_kegiatan_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "master_sub_kegiatan", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      new_master_sub_kegiatan_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "master_sub_kegiatan", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      old_kode_sub_kegiatan_full: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      new_kode_sub_kegiatan_full: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      old_nama_sub_kegiatan: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      new_nama_sub_kegiatan: {
        type: Sequelize.TEXT,
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
        comment:
          "EXACT_CODE, EXACT_NAME, FUZZY_NAME, PERLU_MAPPING_MANUAL, SPLIT, MERGE",
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
      "mapping_sub_kegiatan",
      ["regulasi_versi_from_id", "regulasi_versi_to_id", "status"],
      { name: "idx_mapping_sub_reg_from_to_status" },
    );
    await queryInterface.addIndex(
      "mapping_sub_kegiatan",
      ["old_master_sub_kegiatan_id"],
      { name: "idx_mapping_sub_old" },
    );
    await queryInterface.addIndex(
      "mapping_sub_kegiatan",
      ["new_master_sub_kegiatan_id"],
      { name: "idx_mapping_sub_new" },
    );

    console.log("[migration] ✅ mapping_sub_kegiatan");
  },

  async down(queryInterface) {
    await queryInterface.dropTable("mapping_sub_kegiatan").catch(() => {});
  },
};
