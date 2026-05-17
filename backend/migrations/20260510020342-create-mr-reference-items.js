"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("mr_reference_items", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      group_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "mr_reference_groups",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },

      parent_item_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "mr_reference_items",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },

      kode_item: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },

      nama_item: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },

      deskripsi: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      nilai_numeric: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },

      nilai_text: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },

      warna: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },

      icon: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },

      urutan: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      is_default: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      effective_start_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },

      effective_end_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },

      tahun_berlaku: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      metadata_json: {
        type: Sequelize.JSON,
        allowNull: true,
      },

      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      updated_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },

      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal(
          "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
        ),
      },
    });

    await queryInterface.addIndex("mr_reference_items", ["group_id"], {
      name: "idx_mr_reference_items_group_id",
    });

    await queryInterface.addIndex("mr_reference_items", ["parent_item_id"], {
      name: "idx_mr_reference_items_parent_item_id",
    });

    await queryInterface.addIndex("mr_reference_items", ["kode_item"], {
      name: "idx_mr_reference_items_kode_item",
    });

    await queryInterface.addIndex(
      "mr_reference_items",
      ["group_id", "kode_item"],
      {
        unique: true,
        name: "idx_mr_reference_items_group_kode_unique",
      }
    );

    await queryInterface.addIndex("mr_reference_items", ["is_active"], {
      name: "idx_mr_reference_items_is_active",
    });

    await queryInterface.addIndex("mr_reference_items", ["tahun_berlaku"], {
      name: "idx_mr_reference_items_tahun_berlaku",
    });

    await queryInterface.addIndex(
      "mr_reference_items",
      ["effective_start_date", "effective_end_date"],
      {
        name: "idx_mr_reference_items_effective_period",
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable("mr_reference_items");
  },
};