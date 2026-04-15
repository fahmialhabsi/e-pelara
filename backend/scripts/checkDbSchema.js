/**
 * Memverifikasi tabel dan kolom yang diharapkan aplikasi ada di database
 * yang dikonfigurasi di config/config.json (environment dari NODE_ENV).
 *
 *   npm run check:db-schema
 *
 * Exit 0 = OK, exit 1 = ada yang kurang atau koneksi gagal.
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const { Sequelize } = require("sequelize");
const path = require("path");

const allConfig = require(path.join(__dirname, "../config/config.json"));
const env = process.env.NODE_ENV || "development";
const config = allConfig[env];

if (!config) {
  console.error(`Environment "${env}" tidak ada di config.json.`);
  process.exit(1);
}

/**
 * Daftar skema minimum — sesuaikan jika model/tabel inti berubah.
 * Lihat docs/DATABASE.md.
 */
const REQUIRED_SCHEMA = [
  {
    table: "users",
    columns: [
      "id",
      "username",
      "email",
      "password",
      "opd",
      "role_id",
      "divisions_id",
      "periode_id",
      "password_reset_token",
      "password_reset_expires",
    ],
  },
  {
    table: "roles",
    columns: ["id", "name"],
  },
  {
    table: "divisions",
    columns: ["id", "name"],
  },
  {
    table: "periode_rpjmds",
    columns: ["id", "tahun_awal", "tahun_akhir"],
  },
];

async function tableExists(sequelize, dbName, tableName) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS c FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = :db AND TABLE_NAME = :tbl`,
    { replacements: { db: dbName, tbl: tableName } },
  );
  return Number(rows[0]?.c) > 0;
}

async function columnExists(sequelize, dbName, tableName, columnName) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = :db AND TABLE_NAME = :tbl AND COLUMN_NAME = :col`,
    { replacements: { db: dbName, tbl: tableName, col: columnName } },
  );
  return Number(rows[0]?.c) > 0;
}

async function main() {
  const sequelize = new Sequelize(
    config.database,
    config.username,
    config.password === null || config.password === undefined
      ? ""
      : config.password,
    {
      host: config.host,
      port: config.port,
      dialect: config.dialect,
      logging: false,
      dialectOptions: config.dialectOptions || {},
    },
  );

  const dbName = config.database;
  const failures = [];

  try {
    await sequelize.authenticate();
    console.log(
      `[check:db-schema] env=${env} → ${config.host}:${config.port || 3306} / ${dbName}`,
    );

    for (const { table, columns } of REQUIRED_SCHEMA) {
      const tOk = await tableExists(sequelize, dbName, table);
      if (!tOk) {
        failures.push(`Tabel hilang: ${table}`);
        continue;
      }
      for (const col of columns) {
        const cOk = await columnExists(sequelize, dbName, table, col);
        if (!cOk) {
          failures.push(`Kolom hilang: ${table}.${col}`);
        }
      }
    }

    if (failures.length) {
      console.error("\nSkema tidak lengkap:\n");
      failures.forEach((f) => console.error(`  - ${f}`));
      console.error(
        "\nPerbaikan umum:\n  npx sequelize-cli db:migrate\n  npm run db:ensure-reset-cols\n",
      );
      process.exit(1);
    }

    console.log("Semua pemeriksaan skema wajib lolos.");
    process.exit(0);
  } catch (e) {
    console.error("Gagal memeriksa database:", e.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
