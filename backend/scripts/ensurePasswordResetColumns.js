/**
 * Menambahkan password_reset_token & password_reset_expires pada tabel users
 * jika belum ada (aman dijalankan berulang).
 *
 * Pakai kredensial dari config/config.json → environment "development".
 *
 *   node scripts/ensurePasswordResetColumns.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const { Sequelize } = require("sequelize");
const config = require("../config/config.json").development;

async function columnExists(sequelize, table, column) {
  const dbName = config.database;
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = :db AND TABLE_NAME = :tbl AND COLUMN_NAME = :col`,
    { replacements: { db: dbName, tbl: table, col: column } },
  );
  return Number(rows[0]?.c) > 0;
}

async function main() {
  const sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    {
      host: config.host,
      port: config.port,
      dialect: config.dialect,
      logging: false,
    },
  );

  try {
    await sequelize.authenticate();
    console.log("Terhubung ke:", config.host, "port", config.port, "DB", config.database);

    const hasToken = await columnExists(sequelize, "users", "password_reset_token");
    const hasExp = await columnExists(sequelize, "users", "password_reset_expires");

    if (hasToken && hasExp) {
      console.log("Kolom password reset sudah ada. Tidak ada perubahan.");
      return;
    }

    if (!hasToken) {
      await sequelize.query(
        "ALTER TABLE users ADD COLUMN password_reset_token VARCHAR(128) NULL",
      );
      console.log("Ditambahkan: users.password_reset_token");
    }
    if (!hasExp) {
      await sequelize.query(
        "ALTER TABLE users ADD COLUMN password_reset_expires DATETIME NULL",
      );
      console.log("Ditambahkan: users.password_reset_expires");
    }

    console.log("Selesai. Restart server backend lalu coba login lagi.");
  } catch (e) {
    console.error("Gagal:", e.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
