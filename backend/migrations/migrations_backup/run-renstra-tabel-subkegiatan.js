"use strict";

const path = require("path");
const { Sequelize } = require("sequelize");

// Koneksi ke database
const sequelize = new Sequelize("db_epelara", "root", "", {
  host: "localhost",
  dialect: "mysql",
  logging: console.log,
});

// Path ke migration
const migrationPath = path.join(
  __dirname,
  "20250905094909-create-renstra-tabel-subkegiatan.js"
);
const migration = require(migrationPath);

async function runMigration() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected");

    const queryInterface = sequelize.getQueryInterface();

    // Jalankan migration
    await migration.up(queryInterface, Sequelize);

    // Catat ke SequelizeMeta agar migration tercatat
    await sequelize.query(
      "INSERT INTO SequelizeMeta (name) VALUES (:name) ON DUPLICATE KEY UPDATE name=name",
      {
        replacements: {
          name: "20250905094909-create-renstra-tabel-subkegiatan.js",
        },
      }
    );

    console.log("✅ Migration selesai dijalankan");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error menjalankan migration:", error);
    process.exit(1);
  }
}

runMigration();
