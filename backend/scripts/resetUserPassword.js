/**
 * Set ulang password user di database (tanpa email / tanpa login).
 *
 * Usage:
 *   node scripts/resetUserPassword.js <email> <password-baru>
 *
 * Password minimal 8 karakter (sama seperti registrasi).
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const bcrypt = require("bcryptjs");
const { Sequelize } = require("sequelize");
const config = require("../config/config.json").development;

const emailArg = (process.argv[2] || "").trim();
const newPassword = process.argv[3] || "";

async function main() {
  if (!emailArg || !newPassword || newPassword.length < 8) {
    console.error(
      "Penggunaan: node scripts/resetUserPassword.js <email> <password-baru>",
    );
    console.error("Password minimal 8 karakter.");
    process.exit(1);
  }

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
    const hash = await bcrypt.hash(newPassword, 10);
    const [, meta] = await sequelize.query(
      `UPDATE users
       SET password = :hash,
           password_reset_token = NULL,
           password_reset_expires = NULL
       WHERE email = :email`,
      { replacements: { hash, email: emailArg } },
    );

    const affected = meta?.affectedRows ?? 0;

    if (!affected) {
      console.error(`Tidak ada baris diperbarui. Cek email: "${emailArg}"`);
      process.exit(1);
    }

    console.log(`Password untuk "${emailArg}" berhasil diatur ulang.`);
    console.log("Silakan login dengan password baru.");
  } catch (e) {
    console.error("Gagal:", e.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
