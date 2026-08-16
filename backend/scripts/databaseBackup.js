'use strict';

/**
 * Automated Database Backup Engine (Sprint 2, S2-1).
 *
 * Script Node.js INDEPENDEN — tidak berjalan di dalam server.js, tidak
 * memakai node-cron. Dipanggil manual atau lewat Windows Task Scheduler
 * (lihat docs/internal/database-backup-restore-runbook.md).
 *
 * Alur: mysqldump -> file .partial -> validasi -> checksum -> rename ke
 * .sql -> manifest JSON -> retention cleanup (hanya artifact bermanifest
 * berstatus SUCCESS di direktori backup ini).
 *
 * Jalankan: node scripts/databaseBackup.js
 * (atau: npm run db:backup, dari folder backend/)
 *
 * Exit code: 0 = SUCCESS, non-zero = FAILURE.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const {
  resolveDbConnection,
  resolveMysqldumpPath,
  resolveBackupDir,
  resolveRetentionPolicy,
} = require('./lib/backupConfig');
const {
  buildBackupFilename,
  computeSha256,
  looksLikeValidDump,
  buildManifest,
  buildSafeFailureLog,
  redactConnectionStrings,
} = require('./lib/backupManifest');
const { evaluateRetention } = require('./lib/backupRetention');

function nowIso() {
  return new Date().toISOString();
}

function generateBackupId() {
  return `bkp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeStructuredLog(logPath, entry) {
  const line = `${JSON.stringify(entry)}\n`;
  fs.appendFileSync(logPath, line, 'utf8');
}

function safeCleanupPartial(partialPath) {
  try {
    if (fs.existsSync(partialPath)) {
      fs.unlinkSync(partialPath);
      return true;
    }
  } catch (_err) {
    // Cleanup gagal tidak boleh menyembunyikan kegagalan asli — ini
    // best-effort, dicatat via caller.
  }
  return false;
}

function getMysqldumpVersion(mysqldumpPath) {
  try {
    const result = spawnSync(mysqldumpPath, ['--version'], { encoding: 'utf8', timeout: 10000 });
    if (result.status === 0 && result.stdout) {
      return result.stdout.trim();
    }
  } catch (_err) {
    // Tidak fatal - versi hanya informasional di manifest.
  }
  return 'unknown';
}

async function main() {
  const backupId = generateBackupId();
  const createdAt = nowIso();
  const backupDir = resolveBackupDir();
  ensureDir(backupDir);
  const logPath = path.join(backupDir, 'backup.log.jsonl');

  function fail(stage, errorType, error, exitCode = 1) {
    const entry = buildSafeFailureLog({
      timestamp: nowIso(),
      backupId,
      stage,
      errorType,
      error,
      exitCode,
    });
    writeStructuredLog(logPath, { level: 'ERROR', ...entry });
    console.error(`[db:backup] GAGAL pada tahap "${stage}": ${entry.safe_message}`);
    process.exit(exitCode);
  }

  let dbConn;
  try {
    dbConn = resolveDbConnection();
  } catch (err) {
    fail('resolve-config', 'CONFIG_ERROR', err, 1);
    return;
  }

  let mysqldump;
  try {
    mysqldump = resolveMysqldumpPath();
  } catch (err) {
    fail('resolve-mysqldump-path', 'MYSQLDUMP_NOT_CONFIGURED', err, 1);
    return;
  }

  writeStructuredLog(logPath, {
    level: 'INFO',
    timestamp: createdAt,
    backup_id: backupId,
    stage: 'start',
    message: `Backup dimulai. DB source=${dbConn.source} (env=${dbConn.env}), mysqldump source=${mysqldump.source}`,
  });

  const filenameBase = buildBackupFilename({ database: dbConn.database, environment: dbConn.env, date: new Date() });
  const partialPath = path.join(backupDir, `${filenameBase}.sql.partial`);
  const finalPath = path.join(backupDir, `${filenameBase}.sql`);
  const manifestPath = path.join(backupDir, `${filenameBase}.manifest.json`);

  // ---- Tahap 1: jalankan mysqldump ke file .partial ----
  const dumpArgs = [
    '--host', dbConn.host,
    '--port', String(dbConn.port),
    '--user', dbConn.user,
    '--single-transaction',
    '--routines',
    '--triggers',
    '--default-character-set=utf8mb4',
    dbConn.database,
  ];

  let mysqldumpVersion = 'unknown';
  let dumpResult;
  try {
    mysqldumpVersion = getMysqldumpVersion(mysqldump.path);

    const outFd = fs.openSync(partialPath, 'w');
    try {
      dumpResult = spawnSync(mysqldump.path, dumpArgs, {
        env: { ...process.env, MYSQL_PWD: dbConn.password || '' },
        stdio: ['ignore', outFd, 'pipe'],
        timeout: Number(process.env.DB_BACKUP_TIMEOUT_MS || 30 * 60 * 1000),
      });
    } finally {
      fs.closeSync(outFd);
    }
  } catch (err) {
    safeCleanupPartial(partialPath);
    if (err && err.code === 'ENOENT') {
      fail('spawn-mysqldump', 'MYSQLDUMP_NOT_FOUND', err, 1);
      return;
    }
    fail('spawn-mysqldump', 'MYSQLDUMP_SPAWN_ERROR', err, 1);
    return;
  }

  if (dumpResult.error) {
    safeCleanupPartial(partialPath);
    if (dumpResult.error.code === 'ENOENT') {
      fail('spawn-mysqldump', 'MYSQLDUMP_NOT_FOUND', dumpResult.error, 1);
    } else {
      fail('spawn-mysqldump', 'MYSQLDUMP_SPAWN_ERROR', dumpResult.error, 1);
    }
    return;
  }

  if (dumpResult.status !== 0) {
    const stderrSafe = redactConnectionStrings(String(dumpResult.stderr || '').slice(0, 2000));
    safeCleanupPartial(partialPath);
    const authFailed = /access denied/i.test(stderrSafe);
    const connFailed = /can't connect|connection refused|unknown mysql server host/i.test(stderrSafe);
    fail(
      'mysqldump-exec',
      authFailed ? 'AUTHENTICATION_FAILED' : connFailed ? 'DB_UNREACHABLE' : 'DUMP_PROCESS_FAILED',
      new Error(stderrSafe || `mysqldump exit code ${dumpResult.status}`),
      dumpResult.status || 1,
    );
    return;
  }

  // ---- Tahap 2: validasi file .partial ----
  if (!fs.existsSync(partialPath)) {
    fail('validate-output', 'OUTPUT_MISSING', new Error('File .partial tidak ditemukan setelah mysqldump exit 0.'), 1);
    return;
  }

  const stat = fs.statSync(partialPath);
  if (stat.size === 0) {
    safeCleanupPartial(partialPath);
    fail('validate-output', 'OUTPUT_EMPTY', new Error('mysqldump menghasilkan file 0 byte.'), 1);
    return;
  }

  const dumpCheck = looksLikeValidDump(partialPath);
  if (!dumpCheck.valid) {
    safeCleanupPartial(partialPath);
    fail('validate-dump-structure', 'DUMP_STRUCTURE_INVALID', new Error(dumpCheck.reason), 1);
    return;
  }

  // ---- Tahap 3: checksum SHA-256 ----
  let sha256;
  try {
    sha256 = computeSha256(partialPath);
  } catch (err) {
    safeCleanupPartial(partialPath);
    fail('checksum', 'CHECKSUM_FAILED', err, 1);
    return;
  }

  // ---- Tahap 4: rename .partial -> .sql (baru dianggap valid setelah ini) ----
  try {
    fs.renameSync(partialPath, finalPath);
  } catch (err) {
    safeCleanupPartial(partialPath);
    fail('finalize-rename', 'RENAME_FAILED', err, 1);
    return;
  }

  const completedAt = nowIso();
  const finalStat = fs.statSync(finalPath);

  // ---- Tahap 5: tulis manifest ----
  const manifest = buildManifest({
    backupId,
    database: dbConn.database,
    environment: dbConn.env,
    createdAt,
    completedAt,
    filename: path.basename(finalPath),
    sizeBytes: finalStat.size,
    sha256,
    mysqldumpVersion,
    host: dbConn.host,
    status: 'SUCCESS',
    verificationStatus: 'NOT_VERIFIED',
  });

  try {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  } catch (err) {
    // File .sql sudah valid & final, tapi manifest gagal ditulis — ini tetap
    // FAILURE menurut success criteria Owner ("manifest berhasil ditulis"
    // adalah syarat SUCCESS). File .sql TIDAK dihapus (bukti mysqldump
    // berhasil tetap ada untuk investigasi), tapi status keseluruhan gagal.
    fail('write-manifest', 'MANIFEST_WRITE_FAILED', err, 1);
    return;
  }

  writeStructuredLog(logPath, {
    level: 'INFO',
    timestamp: completedAt,
    backup_id: backupId,
    stage: 'complete',
    status: 'SUCCESS',
    filename: manifest.filename,
    size_bytes: manifest.size_bytes,
    duration_ms: manifest.duration_ms,
  });

  console.log(`[db:backup] SUCCESS`);
  console.log(`  backup_id : ${backupId}`);
  console.log(`  file      : ${finalPath}`);
  console.log(`  size      : ${finalStat.size} bytes`);
  console.log(`  sha256    : ${sha256}`);
  console.log(`  manifest  : ${manifestPath}`);

  // ---- Tahap 6: retention (best-effort, tidak mengubah exit code backup) ----
  try {
    runRetention(backupDir, logPath);
  } catch (err) {
    writeStructuredLog(logPath, {
      level: 'WARN',
      timestamp: nowIso(),
      backup_id: backupId,
      stage: 'retention',
      message: `Retention gagal dijalankan (tidak fatal, backup tetap SUCCESS): ${redactConnectionStrings(err.message)}`,
    });
    console.warn(`[db:backup] Retention gagal dijalankan (backup tetap SUCCESS): ${err.message}`);
  }

  process.exit(0);
}

/**
 * Retention: baca seluruh *.manifest.json di backupDir, evaluasi kebijakan,
 * hapus HANYA backup_id yang direkomendasikan delete DAN yang statusnya
 * SUCCESS DAN yang manifest-nya valid. Tidak pernah wildcard-delete *.sql.
 */
function runRetention(backupDir, logPath) {
  const policy = resolveRetentionPolicy();
  const manifestFiles = fs.readdirSync(backupDir).filter((f) => f.endsWith('.manifest.json'));

  const manifests = [];
  for (const mf of manifestFiles) {
    try {
      const parsed = JSON.parse(fs.readFileSync(path.join(backupDir, mf), 'utf8'));
      manifests.push({ ...parsed, __manifestFile: mf });
    } catch (_err) {
      // Manifest tidak bisa diparse -> dilewati, tidak pernah masuk kandidat hapus.
    }
  }

  const { delete: toDelete, reasoning } = evaluateRetention(manifests, policy);

  for (const backupId of toDelete) {
    const m = manifests.find((x) => x.backup_id === backupId);
    if (!m) continue;

    const sqlPath = path.join(backupDir, m.filename);
    const manifestPath = path.join(backupDir, m.__manifestFile);
    const checksumNote = `${m.filename}.sha256 (tercatat di manifest, tidak disimpan file terpisah)`;

    try {
      if (fs.existsSync(sqlPath)) fs.unlinkSync(sqlPath);
      if (fs.existsSync(manifestPath)) fs.unlinkSync(manifestPath);
      writeStructuredLog(logPath, {
        level: 'INFO',
        timestamp: nowIso(),
        stage: 'retention-delete',
        backup_id: backupId,
        filename: m.filename,
        reason: reasoning[backupId],
        note: checksumNote,
      });
    } catch (err) {
      writeStructuredLog(logPath, {
        level: 'WARN',
        timestamp: nowIso(),
        stage: 'retention-delete-failed',
        backup_id: backupId,
        filename: m.filename,
        message: redactConnectionStrings(err.message),
      });
    }
  }
}

main().catch((err) => {
  console.error('[db:backup] FATAL (uncaught):', err.message);
  process.exit(1);
});
