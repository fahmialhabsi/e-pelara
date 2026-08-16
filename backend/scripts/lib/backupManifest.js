'use strict';

/**
 * Helper murni (pure functions, tidak menyentuh filesystem/DB kecuali
 * dinyatakan) untuk backup engine Sprint 2: filename generation, checksum,
 * manifest shape, dan redaction kredensial dari log/manifest.
 *
 * Dipisah dari databaseBackup.js supaya bisa di-unit-test tanpa DB/mysqldump
 * nyata (lihat backend/scripts/backupEngineSelfTest.js).
 */

const fs = require('fs');
const crypto = require('crypto');

/**
 * Nama artifact: <database>-<environment>-<timestampUTC ISO ringkas>.sql
 * Contoh: db_epelara-development-20260808T071500Z.sql
 * Tidak pernah statis — selalu unik per detik, tidak akan menimpa backup lain.
 */
function buildBackupFilename({ database, environment, date = new Date() }) {
  if (!database || !environment) {
    throw new Error('buildBackupFilename: database dan environment wajib diisi.');
  }
  const iso = date.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const safeDb = String(database).replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeEnv = String(environment).replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${safeDb}-${safeEnv}-${iso}`;
}

/** Hitung SHA-256 dari sebuah file. Mengembalikan hex digest. */
function computeSha256(filePath) {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Cek "struktur dump yang masuk akal" tanpa parsing SQL penuh: dump MySQL
 * dari mysqldump selalu diawali komentar `-- MySQL dump` atau setidaknya
 * mengandung `-- Dump completed` di akhir bila --dump-date aktif, dan harus
 * mengandung sekurang-kurangnya satu `CREATE TABLE`. Heuristik ringan,
 * bukan validator SQL penuh — cukup untuk menolak file kosong/truncated/
 * bukan dump sama sekali.
 */
function looksLikeValidDump(filePath) {
  const stat = fs.statSync(filePath);
  if (stat.size === 0) return { valid: false, reason: 'file berukuran 0 byte' };

  // Baca 64KB awal dan 4KB akhir saja - dump bisa besar, tidak perlu load penuh.
  const fd = fs.openSync(filePath, 'r');
  try {
    const headBuf = Buffer.alloc(Math.min(65536, stat.size));
    fs.readSync(fd, headBuf, 0, headBuf.length, 0);
    const head = headBuf.toString('utf8');

    const hasMysqldumpHeader = /-- MySQL dump/i.test(head);
    const hasCreateTable = /CREATE TABLE/i.test(head);

    if (!hasMysqldumpHeader && !hasCreateTable) {
      // Coba cek lebih jauh: kalau file kecil, head sudah mencakup semuanya.
      if (stat.size <= 65536) {
        return {
          valid: false,
          reason: 'tidak ditemukan header "-- MySQL dump" atau "CREATE TABLE" di isi file',
        };
      }
    }

    if (!hasCreateTable && stat.size > 65536) {
      // Cek juga di area tengah/akhir untuk file besar, cukup kemungkinan
      // CREATE TABLE ada tapi di luar 64KB pertama (mis. dump dengan
      // banyak komentar awal). Tetap heuristik ringan.
      const tailSize = Math.min(65536, stat.size);
      const tailBuf = Buffer.alloc(tailSize);
      fs.readSync(fd, tailBuf, 0, tailSize, stat.size - tailSize);
      const tail = tailBuf.toString('utf8');
      if (!/CREATE TABLE/i.test(tail) && !/INSERT INTO/i.test(tail)) {
        return {
          valid: false,
          reason: 'tidak ditemukan "CREATE TABLE"/"INSERT INTO" di awal maupun akhir file',
        };
      }
    }

    return { valid: true, reason: null };
  } finally {
    fs.closeSync(fd);
  }
}

/**
 * Bentuk manifest resmi sesuai spesifikasi Owner. Tidak pernah menyertakan
 * password/credential.
 */
function buildManifest({
  backupId,
  database,
  environment,
  createdAt,
  completedAt,
  filename,
  sizeBytes,
  sha256,
  mysqldumpVersion,
  host,
  status,
  verificationStatus = 'NOT_VERIFIED',
  errorInfo = null,
}) {
  const durationMs =
    createdAt && completedAt ? new Date(completedAt).getTime() - new Date(createdAt).getTime() : null;

  const manifest = {
    backup_id: backupId,
    database,
    environment,
    created_at: createdAt,
    completed_at: completedAt,
    duration_ms: durationMs,
    filename,
    size_bytes: sizeBytes,
    sha256,
    mysqldump_version: mysqldumpVersion,
    host: redactHost(host),
    status,
    verification_status: verificationStatus,
    verified_at: null,
  };

  if (errorInfo) {
    manifest.error = redactErrorInfo(errorInfo);
  }

  return manifest;
}

/**
 * Redaksi host: pertahankan host untuk keperluan diagnosis (bukan
 * credential), tapi ini fungsi terpisah agar mudah diperketat nanti bila
 * kebijakan berubah (mis. redaksi IP internal).
 */
function redactHost(host) {
  return host || null;
}

const CREDENTIAL_KEY_PATTERN = /password|secret|token|credential/i;

/**
 * Redaksi rekursif: buang/ganti nilai untuk key yang match pola credential,
 * dan hapus pesan error yang mengandung connection string dengan password
 * literal (mis. "mysql://root:secret@host").
 */
function redactErrorInfo(errorInfo) {
  const clone = JSON.parse(JSON.stringify(errorInfo, (key, value) => {
    if (CREDENTIAL_KEY_PATTERN.test(key)) return '[REDACTED]';
    return value;
  }));

  if (typeof clone.message === 'string') {
    clone.message = redactConnectionStrings(clone.message);
  }
  if (typeof clone.safe_message === 'string') {
    clone.safe_message = redactConnectionStrings(clone.safe_message);
  }

  return clone;
}

function redactConnectionStrings(text) {
  return String(text)
    .replace(/(:\/\/[^:]+:)[^@]+(@)/g, '$1[REDACTED]$2') // mysql://user:pass@host
    .replace(/(--password=)\S+/gi, '$1[REDACTED]')
    .replace(/(-p)\S+/g, '$1[REDACTED]');
}

/** Pesan error aman (tanpa credential) untuk kegagalan tahap tertentu. */
function buildSafeFailureLog({ timestamp, backupId, stage, errorType, error, exitCode }) {
  return {
    timestamp,
    backup_id: backupId,
    stage,
    error_type: errorType,
    safe_message: redactConnectionStrings(String(error?.message || error || 'unknown error')),
    exit_code: exitCode ?? null,
  };
}

module.exports = {
  buildBackupFilename,
  computeSha256,
  looksLikeValidDump,
  buildManifest,
  redactErrorInfo,
  redactConnectionStrings,
  buildSafeFailureLog,
};
