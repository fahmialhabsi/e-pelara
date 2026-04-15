/**
 * scripts/seedAdmin.js
 * Membuat user Super Admin awal untuk ePeLARA.
 * Jalankan: node scripts/seedAdmin.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const bcrypt = require("bcryptjs");
const { Sequelize } = require("sequelize");
const config = require("../config/config.json").development;

const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  { host: config.host, port: config.port, dialect: config.dialect, logging: false }
);

async function seed() {
  try {
    await sequelize.authenticate();
    console.log("✅ DB Terhubung\n");

    // ── 1. Pastikan division "Sekretariat" ada ──────────────────────
    const [[divRow]] = await sequelize.query(
      "SELECT id FROM divisions WHERE name = 'Sekretariat' LIMIT 1"
    );
    let divisionId;
    if (divRow) {
      divisionId = divRow.id;
      console.log(`⏭️  Division Sekretariat sudah ada (id=${divisionId})`);
    } else {
      await sequelize.query(
        "INSERT INTO divisions (name, description, created_at, updated_at) VALUES ('Sekretariat', 'Sekretariat Dinas Pangan', NOW(), NOW())"
      );
      const [[newDiv]] = await sequelize.query(
        "SELECT id FROM divisions WHERE name = 'Sekretariat' LIMIT 1"
      );
      divisionId = newDiv.id;
      console.log(`✅ Division Sekretariat dibuat (id=${divisionId})`);
    }

    // Tambah beberapa division lain jika belum ada
    const divs = [
      { name: "Bidang Perencanaan", desc: "Bidang Perencanaan Pangan" },
      { name: "Bidang Ketahanan Pangan", desc: "Bidang Ketahanan Pangan" },
      { name: "Bidang Ketersediaan", desc: "Bidang Ketersediaan Pangan" },
      { name: "Bidang Distribusi", desc: "Bidang Distribusi dan Cadangan Pangan" },
      { name: "Bidang Konsumsi", desc: "Bidang Konsumsi dan Keamanan Pangan" },
      { name: "UPTD", desc: "Unit Pelaksana Teknis Daerah" },
    ];
    for (const d of divs) {
      const [[ex]] = await sequelize.query(
        "SELECT id FROM divisions WHERE name = ? LIMIT 1",
        { replacements: [d.name] }
      );
      if (!ex) {
        await sequelize.query(
          "INSERT INTO divisions (name, description, created_at, updated_at) VALUES (?, ?, NOW(), NOW())",
          { replacements: [d.name, d.desc] }
        );
        console.log(`✅ Division "${d.name}" dibuat`);
      }
    }

    // ── 2. Pastikan periode RPJMD aktif ada ────────────────────────
    const [[periodeRow]] = await sequelize.query(
      "SELECT id FROM periode_rpjmds WHERE tahun_awal <= 2026 AND tahun_akhir >= 2026 LIMIT 1"
    );
    let periodeId;
    if (periodeRow) {
      periodeId = periodeRow.id;
      console.log(`⏭️  Periode RPJMD sudah ada (id=${periodeId})`);
    } else {
      await sequelize.query(
        "INSERT INTO periode_rpjmds (nama, tahun_awal, tahun_akhir, created_at, updated_at) VALUES ('RPJMD 2021-2026', 2021, 2026, NOW(), NOW())"
      );
      const [[newP]] = await sequelize.query(
        "SELECT id FROM periode_rpjmds WHERE tahun_awal = 2021 LIMIT 1"
      );
      periodeId = newP.id;
      console.log(`✅ Periode RPJMD 2021-2026 dibuat (id=${periodeId})`);
    }

    // ── 3. Buat user Super Admin ────────────────────────────────────
    const TARGET_EMAIL    = "fahmialhabsis7@gmail.com";
    const TARGET_PASSWORD = "Admin@1234";  // password aman (min 8 karakter)
    const TARGET_USERNAME = "superadmin";

    const [[existUser]] = await sequelize.query(
      "SELECT id, email FROM users WHERE email = ? LIMIT 1",
      { replacements: [TARGET_EMAIL] }
    );

    if (existUser) {
      console.log(`\n⏭️  User ${TARGET_EMAIL} sudah ada (id=${existUser.id})`);
      console.log("   Untuk reset password, gunakan endpoint /api/auth/change-password");
    } else {
      const hash = await bcrypt.hash(TARGET_PASSWORD, 12);
      await sequelize.query(
        `INSERT INTO users (username, email, password, role_id, divisions_id, opd, periode_id, createdAt, updatedAt)
         VALUES (?, ?, ?, 1, ?, 'Dinas Ketahanan Pangan Maluku Utara', ?, NOW(), NOW())`,
        { replacements: [TARGET_USERNAME, TARGET_EMAIL, hash, divisionId, periodeId] }
      );
      const [[newUser]] = await sequelize.query(
        "SELECT id FROM users WHERE email = ? LIMIT 1",
        { replacements: [TARGET_EMAIL] }
      );
      console.log(`\n✅ User Super Admin dibuat (id=${newUser.id})`);
    }

    // ── Ringkasan ───────────────────────────────────────────────────
    console.log("\n═══════════════════════════════════════════════");
    console.log("  AKUN LOGIN EPELARA");
    console.log("═══════════════════════════════════════════════");
    console.log(`  URL      : http://localhost:3001`);
    console.log(`  Email    : ${TARGET_EMAIL}`);
    console.log(`  Password : ${TARGET_PASSWORD}`);
    console.log(`  Role     : SUPER ADMIN`);
    console.log("═══════════════════════════════════════════════\n");

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    await sequelize.close();
    process.exit(1);
  }
}

seed();
