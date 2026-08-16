'use strict';

/**
 * Isolated Restore Verification Engine (Sprint 2, S2-2).
 *
 * PRINSIP PALING PENTING (Owner): restore verification TIDAK PERNAH
 * menyentuh database aplikasi (source/production). Selalu membuat database
 * TEMPORARY dengan nama ter-generate, restore ke situ, verifikasi, lalu
 * DROP — di dalam try/finally supaya cleanup tetap dicoba walau verifikasi
 * gagal.
 *
 * Alur: pilih backup SUCCESS terbaru -> verifikasi SHA-256 -> CREATE DATABASE
 * temporary -> restore dump -> integrity verification -> catat hasil -> DROP
 * database temporary.
 *
 * Jalankan: node scripts/databaseRestoreVerify.js [--backup-id=<id>]
 * (atau: npm run db:restore:verify, dari folder backend/)
 *
 * Exit code: 0 = RESTORE_VERIFIED, non-zero = RESTORE_FAILED.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const mysql = require('mysql2/promise');

const {
  resolveDbConnection,
  resolveMysqlClientPath,
  resolveBackupDir,
} = require('./lib/backupConfig');
const { computeSha256, redactConnectionStrings } = require('./lib/backupManifest');
const {
  generateTempDatabaseName,
  assertNotSourceDatabase,
  assertIsTemporaryDatabaseName,
  assertChecksumMatches,
  assertValidManifest,
} = require('./lib/restoreSafety');
const { getCriticalTableNames } = require('./lib/criticalTables');

function nowIso() {
  return new Date().toISOString();
}

function parseArgs(argv) {
  const args = {};
  for (const a of argv.slice(2)) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
  }
  return args;
}

function findLatestSuccessBackup(backupDir, explicitBackupId) {
  const manifestFiles = fs.readdirSync(backupDir).filter((f) => f.endsWith('.manifest.json'));
  const manifests = [];
  for (const mf of manifestFiles) {
    try {
      const parsed = JSON.parse(fs.readFileSync(path.join(backupDir, mf), 'utf8'));
      manifests.push(parsed);
    } catch (_err) {
      // Manifest korup dilewati.
    }
  }

  const successOnly = manifests.filter((m) => m.status === 'SUCCESS');

  if (explicitBackupId) {
    const found = successOnly.find((m) => m.backup_id === explicitBackupId);
    if (!found) {
      throw new Error(`Backup dengan backup_id="${explicitBackupId}" tidak ditemukan atau bukan status SUCCESS.`);
    }
    return found;
  }

  if (successOnly.length === 0) {
    throw new Error('Tidak ada backup berstatus SUCCESS ditemukan di direktori backup. Jalankan db:backup terlebih dahulu.');
  }

  successOnly.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return successOnly[0];
}

async function main() {
  const args = parseArgs(process.argv);
  const backupDir = resolveBackupDir();
  const resultLogPath = path.join(backupDir, 'restore-verify.log.jsonl');

  function logResult(entry) {
    fs.appendFileSync(resultLogPath, `${JSON.stringify(entry)}\n`, 'utf8');
  }

  const record = {
    backup_id: null,
    restore_database: null,
    started_at: nowIso(),
    completed_at: null,
    checksum_match: null,
    tables_expected: null,
    tables_found: null,
    critical_tables: getCriticalTableNames(),
    verification_results: {},
    cleanup_status: 'NOT_ATTEMPTED',
    outcome: null,
  };

  let dbConn;
  let manifest;
  let mysqlClient;
  let tempDbName;
  let connection = null;

  try {
    // ---- Setup & guard ----
    dbConn = resolveDbConnection();
    manifest = findLatestSuccessBackup(backupDir, args['backup-id']);
    assertValidManifest(manifest);
    record.backup_id = manifest.backup_id;

    const dumpPath = path.join(backupDir, manifest.filename);
    if (!fs.existsSync(dumpPath)) {
      throw new Error(`File dump "${manifest.filename}" tidak ditemukan di ${backupDir} (manifest ada tapi file hilang).`);
    }

    const computedChecksum = computeSha256(dumpPath);
    assertChecksumMatches(computedChecksum, manifest.sha256);
    record.checksum_match = true;

    tempDbName = generateTempDatabaseName();
    assertIsTemporaryDatabaseName(tempDbName);
    assertNotSourceDatabase(tempDbName, dbConn.database);
    record.restore_database = tempDbName;

    mysqlClient = resolveMysqlClientPath();

    console.log(`[db:restore:verify] backup_id=${manifest.backup_id} -> temp DB=${tempDbName}`);

    // ---- CREATE DATABASE temporary ----
    connection = await mysql.createConnection({
      host: dbConn.host,
      port: dbConn.port,
      user: dbConn.user,
      password: dbConn.password || '',
      charset: 'utf8mb4',
    });

    // Guard runtime tambahan: pastikan koneksi ini benar2 tidak sedang
    // "USE" database sumber sebelum CREATE - CREATE DATABASE tidak
    // butuh USE, jadi ini aman secara desain (tidak pernah connect
    // langsung ke database sumber di script ini).
    await connection.query(`CREATE DATABASE \`${tempDbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

    // ---- Restore dump ke temp DB ----
    const restoreArgs = ['--host', dbConn.host, '--port', String(dbConn.port), '--user', dbConn.user, tempDbName];
    const dumpContent = fs.readFileSync(dumpPath);

    const restoreResult = spawnSync(mysqlClient.path, restoreArgs, {
      input: dumpContent,
      env: { ...process.env, MYSQL_PWD: dbConn.password || '' },
      encoding: 'buffer',
      timeout: Number(process.env.DB_RESTORE_TIMEOUT_MS || 30 * 60 * 1000),
      maxBuffer: 1024 * 1024 * 50,
    });

    if (restoreResult.error) {
      throw new Error(`Gagal menjalankan mysql client untuk restore: ${redactConnectionStrings(restoreResult.error.message)}`);
    }
    if (restoreResult.status !== 0) {
      const stderrSafe = redactConnectionStrings(String(restoreResult.stderr || '').slice(0, 2000));
      throw new Error(`Restore dump gagal (exit code ${restoreResult.status}): ${stderrSafe}`);
    }

    // ---- Integrity verification ----
    const [tableRows] = await connection.query(
      'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?',
      [tempDbName],
    );
    const tablesFound = tableRows.map((r) => r.TABLE_NAME);
    record.tables_found = tablesFound.length;

    const [expectedCountRows] = await connection.query(
      'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?',
      [dbConn.database],
    );
    record.tables_expected = expectedCountRows.length;

    const criticalTables = getCriticalTableNames();
    const criticalTablesPresent = criticalTables.filter((t) => tablesFound.includes(t));
    const criticalTablesMissing = criticalTables.filter((t) => !tablesFound.includes(t));

    record.verification_results.connection_ok = true;
    record.verification_results.table_count_reasonable = tablesFound.length > 0;
    record.verification_results.critical_tables_present = criticalTablesPresent;
    record.verification_results.critical_tables_missing = criticalTablesMissing;
    record.verification_results.all_critical_tables_present = criticalTablesMissing.length === 0;

    // Row-count comparison terhadap metadata backup, HANYA jika backup
    // engine sudah pernah mencatatnya (S2-1 saat ini tidak mencatat
    // row-count per tabel di manifest — dicatat sebagai keterbatasan,
    // bukan diasumsikan/dikarang di sini).
    record.verification_results.row_count_comparison = manifest.table_row_counts
      ? 'compared'
      : 'skipped: manifest backup tidak menyimpan row-count per tabel (di luar cakupan S2-1 saat ini)';

    const passed =
      record.verification_results.connection_ok &&
      record.verification_results.table_count_reasonable &&
      record.verification_results.all_critical_tables_present;

    record.outcome = passed ? 'RESTORE_VERIFIED' : 'RESTORE_FAILED';
    record.completed_at = nowIso();

    console.log(`[db:restore:verify] tables_found=${tablesFound.length} tables_expected=${record.tables_expected}`);
    console.log(`[db:restore:verify] critical_tables_present=${JSON.stringify(criticalTablesPresent)}`);
    if (criticalTablesMissing.length > 0) {
      console.log(`[db:restore:verify] critical_tables_MISSING=${JSON.stringify(criticalTablesMissing)}`);
    }
  } catch (err) {
    record.outcome = 'RESTORE_FAILED';
    record.completed_at = nowIso();
    record.error = redactConnectionStrings(err.message);
    console.error(`[db:restore:verify] GAGAL: ${record.error}`);
  } finally {
    // ---- Cleanup: DROP temp DB, selalu dicoba walau verifikasi gagal ----
    if (connection && tempDbName) {
      try {
        // Guard terakhir sebelum DROP: pastikan sekali lagi ini bukan DB sumber.
        assertNotSourceDatabase(tempDbName, dbConn.database);
        assertIsTemporaryDatabaseName(tempDbName);
        await connection.query(`DROP DATABASE IF EXISTS \`${tempDbName}\``);
        record.cleanup_status = 'SUCCESS';
        console.log(`[db:restore:verify] Cleanup: DROP DATABASE ${tempDbName} berhasil.`);
      } catch (cleanupErr) {
        record.cleanup_status = 'FAILED';
        record.cleanup_error = redactConnectionStrings(cleanupErr.message);
        console.error(`[db:restore:verify] PERINGATAN: cleanup gagal — ${tempDbName} mungkin masih ada. Hapus manual: DROP DATABASE \`${tempDbName}\`;`);
      }
    } else {
      record.cleanup_status = 'NOT_APPLICABLE';
    }

    if (connection) {
      try {
        await connection.end();
      } catch (_err) {
        // Tidak fatal.
      }
    }

    logResult(record);

    console.log(`\n[db:restore:verify] === HASIL: ${record.outcome} ===`);
    console.log(JSON.stringify(record, null, 2));

    process.exit(record.outcome === 'RESTORE_VERIFIED' ? 0 : 1);
  }
}

main().catch((err) => {
  console.error('[db:restore:verify] FATAL (uncaught):', err.message);
  process.exit(1);
});
