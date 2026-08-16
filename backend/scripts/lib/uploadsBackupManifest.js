'use strict';

/**
 * Helper murni (pure functions) untuk uploads backup engine Sprint 2,
 * S2-01C: filename generation, checksum, manifest shape. Mirror pola
 * backupManifest.js (DB backup) supaya kedua engine konsisten, TANPA
 * menduplikasi logic redaksi kredensial (di-reuse dari backupManifest.js
 * lewat require langsung — lihat databaseBackupUploads.js) karena uploads
 * backup tidak punya jalur DB-credential sendiri.
 *
 * PRINSIP KERAHASIAAN (mandat §12.1): manifest TIDAK PERNAH menyertakan
 * isi file yang diarsipkan — hanya metadata (nama relatif, jumlah, ukuran,
 * checksum agregat archive). Nama file individual TIDAK dicantumkan satu
 * per satu di manifest (bisa berisi nama dokumen yang sensitif) — hanya
 * hitungan agregat.
 */

const fs = require('fs');
const crypto = require('crypto');

/**
 * Nama artifact: uploads-<environment>-<timestampUTC ISO ringkas>.tar.gz
 * Contoh: uploads-development-20260816T071500Z.tar.gz
 * Selalu unik per detik — tidak akan menimpa backup lain.
 */
function buildUploadsBackupFilename({ environment, date = new Date() }) {
  if (!environment) {
    throw new Error('buildUploadsBackupFilename: environment wajib diisi.');
  }
  const iso = date.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const safeEnv = String(environment).replace(/[^a-zA-Z0-9_-]/g, '_');
  return `uploads-${safeEnv}-${iso}`;
}

/** Hitung SHA-256 dari sebuah file. Mengembalikan hex digest. */
function computeSha256(filePath) {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Cek "struktur arsip yang masuk akal" tanpa ekstraksi penuh: gzip
 * dimulai dengan magic bytes 0x1f 0x8b. Heuristik ringan (sama semangat
 * dengan looksLikeValidDump di backupManifest.js) — bukan validator tar
 * penuh, cukup untuk menolak file kosong/truncated/bukan gzip sama sekali.
 */
function looksLikeValidArchive(filePath) {
  const stat = fs.statSync(filePath);
  if (stat.size === 0) return { valid: false, reason: 'file berukuran 0 byte' };
  if (stat.size < 18) {
    // Gzip minimal (header 10 byte + trailer 8 byte) — file lebih kecil
    // dari ini tidak mungkin arsip gzip valid meski non-kosong.
    return { valid: false, reason: 'file terlalu kecil untuk arsip gzip valid' };
  }

  const fd = fs.openSync(filePath, 'r');
  try {
    const headBuf = Buffer.alloc(2);
    fs.readSync(fd, headBuf, 0, 2, 0);
    const isGzipMagic = headBuf[0] === 0x1f && headBuf[1] === 0x8b;
    if (!isGzipMagic) {
      return { valid: false, reason: 'magic bytes gzip (0x1f 0x8b) tidak ditemukan di awal file' };
    }
    return { valid: true, reason: null };
  } finally {
    fs.closeSync(fd);
  }
}

/**
 * Bentuk manifest resmi uploads backup. TIDAK PERNAH menyertakan nama file
 * individual/isi dokumen — hanya metadata agregat.
 */
function buildUploadsManifest({
  backupId,
  environment,
  sourceClassification,
  createdAt,
  completedAt,
  filename,
  sizeBytes,
  sha256,
  fileCount,
  totalSourceBytes,
  status,
  verificationStatus = 'NOT_VERIFIED',
  errorInfo = null,
}) {
  const durationMs =
    createdAt && completedAt ? new Date(completedAt).getTime() - new Date(createdAt).getTime() : null;

  const manifest = {
    backup_id: backupId,
    type: 'uploads',
    environment,
    source_classification: sourceClassification, // 'PERSISTENT_BUSINESS_DATA'
    created_at: createdAt,
    completed_at: completedAt,
    duration_ms: durationMs,
    filename,
    size_bytes: sizeBytes,
    sha256,
    file_count: fileCount,
    total_source_bytes: totalSourceBytes,
    status,
    verification_status: verificationStatus,
    verified_at: null,
  };

  if (errorInfo) {
    manifest.error = errorInfo;
  }

  return manifest;
}

module.exports = {
  buildUploadsBackupFilename,
  computeSha256,
  looksLikeValidArchive,
  buildUploadsManifest,
};
