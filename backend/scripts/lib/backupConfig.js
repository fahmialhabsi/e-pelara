'use strict';

/**
 * Konfigurasi bersama untuk backup/restore-verify engine (Sprint 2).
 *
 * Prinsip (keputusan Owner 2026-08-08): baca dari .env (pola yang sama
 * dipakai server.js — dotenv eksplisit dari path backend/.env) sebagai
 * sumber utama, dengan fallback ke backend/config/config.json (sumber
 * kebenaran koneksi Sequelize aplikasi) bila variabel .env tidak ada.
 * TIDAK ADA nilai host/user/password/database di-hardcode di file ini.
 */

const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const BACKEND_DIR = path.join(__dirname, '..', '..');

function loadSequelizeConfig() {
  const configPath = path.join(BACKEND_DIR, 'config', 'config.json');
  const allConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const env = process.env.NODE_ENV || 'development';
  return { env, config: allConfig[env] || null };
}

/**
 * Resolusi kredensial DB: .env dulu, fallback ke config.json per environment
 * aktif. Tidak pernah mengembalikan nilai hardcode.
 */
function resolveDbConnection() {
  const { env, config } = loadSequelizeConfig();

  const fromEnv = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  };

  const hasCompleteEnv = fromEnv.host && fromEnv.user && fromEnv.database;

  if (hasCompleteEnv) {
    return {
      source: '.env',
      env,
      host: fromEnv.host,
      port: fromEnv.port || 3306,
      user: fromEnv.user,
      password: fromEnv.password ?? '',
      database: fromEnv.database,
    };
  }

  if (config) {
    return {
      source: 'config/config.json',
      env,
      host: config.host,
      port: config.port || 3306,
      user: config.username,
      password: config.password === null || config.password === undefined ? '' : config.password,
      database: config.database,
    };
  }

  throw new Error(
    `Konfigurasi database tidak ditemukan. Isi .env (DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME) atau pastikan environment "${env}" ada di backend/config/config.json.`,
  );
}

/**
 * Resolusi path mysqldump/mysql binary. Urutan:
 *   1. Env var eksplisit (MYSQLDUMP_PATH / MYSQL_CLIENT_PATH)
 *   2. PATH sistem (asumsikan "mysqldump"/"mysql" bisa dipanggil langsung)
 *   3. Kandidat lokasi umum Windows (Laragon, XAMPP) — HANYA sebagai
 *      fallback discovery, BUKAN satu-satunya path yang di-hardcode; kalau
 *      tidak ditemukan di kandidat ini, tetap gagal dengan pesan jelas,
 *      bukan diam-diam memakai path yang salah.
 */
function resolveBinaryPath(envVarName, binaryName, extraCandidates = []) {
  const explicit = process.env[envVarName];
  if (explicit && fs.existsSync(explicit)) {
    return { path: explicit, source: `env:${envVarName}` };
  }
  if (explicit && !fs.existsSync(explicit)) {
    throw new Error(
      `${envVarName} diset ke "${explicit}" tapi file tersebut tidak ditemukan. Perbaiki nilai ${envVarName} di .env, atau hapus agar fallback discovery dipakai.`,
    );
  }

  // Kandidat umum Windows — daftar ini BUKAN satu-satunya sumber kebenaran,
  // hanya fallback jika env var tidak diset. Ditambah dari environment lokal
  // Owner yang diketahui, tapi tidak boleh jadi satu-satunya opsi.
  const winExe = process.platform === 'win32' ? `${binaryName}.exe` : binaryName;
  const commonWindowsCandidates = [
    `C:\\laragon\\bin\\mysql\\mysql-8.0.30-winx64\\bin\\${winExe}`,
    `C:\\xampp\\mysql\\bin\\${winExe}`,
  ];

  const candidates = [...extraCandidates, ...commonWindowsCandidates];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return { path: candidate, source: 'fallback-discovery' };
    }
  }

  // Fallback terakhir: percayakan ke PATH sistem (biarkan child_process yang
  // menentukan apakah binary itu ada — akan gagal dengan ENOENT yang jelas
  // di caller jika tidak ada).
  return { path: binaryName, source: 'system-PATH (unverified)' };
}

function resolveMysqldumpPath() {
  return resolveBinaryPath('MYSQLDUMP_PATH', 'mysqldump');
}

function resolveMysqlClientPath() {
  return resolveBinaryPath('MYSQL_CLIENT_PATH', 'mysql');
}

/** Direktori artifact backup. Configurable via env, default backups/database/ di root repo. */
function resolveBackupDir() {
  const explicit = process.env.DB_BACKUP_DIR;
  if (explicit) return path.resolve(explicit);
  return path.join(BACKEND_DIR, '..', 'backups', 'database');
}

/** Retention policy — configurable, default konservatif sesuai instruksi Owner. */
function resolveRetentionPolicy() {
  return {
    dailyDays: Number(process.env.DB_BACKUP_RETENTION_DAILY_DAYS || 14),
    weeklyWeeks: Number(process.env.DB_BACKUP_RETENTION_WEEKLY_WEEKS || 8),
    monthlyMonths: Number(process.env.DB_BACKUP_RETENTION_MONTHLY_MONTHS || 6),
  };
}

/**
 * Direktori sumber uploads aplikasi (Sprint 2, S2-01C — Owner decision
 * S2-D01: uploads WAJIB masuk cakupan recoverability). Configurable via
 * env, default backend/uploads/ (path aplikasi yang sudah ada, TIDAK
 * diubah — mandat melarang mengubah path upload aplikasi).
 */
function resolveUploadsDir() {
  const explicit = process.env.UPLOADS_DIR;
  if (explicit) return path.resolve(explicit);
  return path.join(BACKEND_DIR, 'uploads');
}

/**
 * Direktori artifact uploads backup. Configurable via env, default
 * backups/uploads/ di root repo — sibling dari backups/database/, dan
 * SENGAJA di luar backend/uploads/ (mandat §12.2: jangan simpan archive
 * backup di dalam direktori yang sedang di-backup).
 */
function resolveUploadsBackupDir() {
  const explicit = process.env.UPLOADS_BACKUP_DIR;
  if (explicit) return path.resolve(explicit);
  return path.join(BACKEND_DIR, '..', 'backups', 'uploads');
}

module.exports = {
  BACKEND_DIR,
  loadSequelizeConfig,
  resolveDbConnection,
  resolveMysqldumpPath,
  resolveMysqlClientPath,
  resolveBackupDir,
  resolveRetentionPolicy,
  resolveUploadsDir,
  resolveUploadsBackupDir,
};
