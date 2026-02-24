// backend/migrations/run-renstra-subkegiatan-final.js
"use strict";

const path = require("path");
const { Sequelize } = require("sequelize");

// Sesuaikan config database kamu
const sequelize = new Sequelize("db_epelara", "root", "", {
  host: "localhost",
  dialect: "mysql",
  logging: console.log,
});

// Path ke file migrasi
const migrationPath = path.join(
  __dirname,
  "20250905083639-create-renstra-subkegiatan-final.js"
);
const migration = require(migrationPath);

async function runMigration() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected");

    // Gunakan queryInterface dari Sequelize
    const queryInterface = sequelize.getQueryInterface();

    // Jalankan migration up
    await migration.up(queryInterface, Sequelize);

    // Catat ke SequelizeMeta agar dianggap sudah dijalankan
    await sequelize.query(
      "INSERT INTO SequelizeMeta (name) VALUES (:name) ON DUPLICATE KEY UPDATE name=name",
      {
        replacements: {
          name: "20250905083639-create-renstra-subkegiatan-final.js",
        },
      }
    );

    console.log(
      "✅ Migration 20250905083639-create-renstra-subkegiatan-final.js selesai dijalankan"
    );
    process.exit(0);
  } catch (error) {
    console.error("❌ Error menjalankan migration:", error);
    process.exit(1);
  }
}

runMigration();
