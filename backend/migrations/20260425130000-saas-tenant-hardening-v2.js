"use strict";

async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables();
  const normalized = new Set(tables.map((t) => String(t).toLowerCase()));
  return normalized.has(String(tableName).toLowerCase());
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface, "tenants"))) {
      throw new Error("Tabel tenants harus ada sebelum migrasi hardening SaaS.");
    }

    // Jangan pakai `if (td && !td.is_active)` — jika describeTable gagal (td null), kolom tidak pernah ditambah.
    let hasIsActive = false;
    try {
      const td = await queryInterface.describeTable("tenants");
      hasIsActive = !!(td && td.is_active);
    } catch (_) {
      hasIsActive = false;
    }
    if (!hasIsActive) {
      await queryInterface.addColumn("tenants", "is_active", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      });
      await queryInterface.addIndex("tenants", ["is_active"], { name: "idx_tenants_is_active" }).catch(() => {});
    }

    if (!(await tableExists(queryInterface, "tenant_audit_logs"))) {
      await queryInterface.createTable("tenant_audit_logs", {
        id: {
          type: Sequelize.INTEGER.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: "users", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        aksi: {
          type: Sequelize.STRING(80),
          allowNull: false,
        },
        tenant_id_asal: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: true,
        },
        tenant_id_tujuan: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: true,
        },
        payload: {
          type: Sequelize.JSON,
          allowNull: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn("NOW"),
        },
      });
      await queryInterface.addIndex("tenant_audit_logs", ["user_id", "created_at"], {
        name: "idx_tenant_audit_user_time",
      });
      await queryInterface.addIndex("tenant_audit_logs", ["aksi", "created_at"], {
        name: "idx_tenant_audit_aksi_time",
      });
    }

    if (!(await tableExists(queryInterface, "plans"))) {
      await queryInterface.createTable("plans", {
        id: {
          type: Sequelize.INTEGER.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        code: {
          type: Sequelize.STRING(64),
          allowNull: false,
          unique: true,
        },
        nama: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        deskripsi: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn("NOW"),
        },
      });
      await queryInterface.bulkInsert("plans", [
        {
          id: 1,
          code: "free",
          nama: "Free",
          deskripsi: "Paket dasar (siap billing)",
          created_at: new Date(),
        },
      ]);
    }

    if (!(await tableExists(queryInterface, "subscriptions"))) {
      await queryInterface.createTable("subscriptions", {
        id: {
          type: Sequelize.INTEGER.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        tenant_id: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false,
          references: { model: "tenants", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        plan_id: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false,
          references: { model: "plans", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT",
        },
        status: {
          type: Sequelize.STRING(32),
          allowNull: false,
          defaultValue: "draft",
        },
        started_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        ended_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn("NOW"),
        },
      });
      await queryInterface.addIndex("subscriptions", ["tenant_id"], { name: "idx_subscriptions_tenant" });
      await queryInterface.addIndex("subscriptions", ["plan_id"], { name: "idx_subscriptions_plan" });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("subscriptions").catch(() => {});
    await queryInterface.dropTable("plans").catch(() => {});
    await queryInterface.dropTable("tenant_audit_logs").catch(() => {});
    await queryInterface.removeIndex("tenants", "idx_tenants_is_active").catch(() => {});
    await queryInterface.removeColumn("tenants", "is_active").catch(() => {});
  },
};
