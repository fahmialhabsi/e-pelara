'use strict';

/**
 * Self-test UNIT (tanpa DB, tanpa mysqldump nyata) untuk Sprint 2 backup/
 * restore engine. Menguji seluruh logika pure yang bisa diverifikasi tanpa
 * MySQL: filename generation, checksum, manifest shape, credential
 * redaction, retention selection, partial artifact handling, dan — PALING
 * PENTING — guard keselamatan restore (hard-reject target==source).
 *
 * TIDAK menjalankan backup/restore nyata terhadap MySQL — untuk itu lihat
 * databaseBackup.js dan databaseRestoreVerify.js yang HARUS dijalankan
 * Owner terhadap MySQL nyata (di luar jangkauan sandbox ini).
 *
 * Jalankan: node scripts/backupEngineSelfTest.js
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  buildBackupFilename,
  computeSha256,
  looksLikeValidDump,
  buildManifest,
  redactConnectionStrings,
  redactErrorInfo,
  buildSafeFailureLog,
} = require('./lib/backupManifest');
const { evaluateRetention } = require('./lib/backupRetention');
const {
  generateTempDatabaseName,
  assertNotSourceDatabase,
  assertIsTemporaryDatabaseName,
  assertChecksumMatches,
  assertValidManifest,
} = require('./lib/restoreSafety');
const { getCriticalTableNames, verifySyncWithCheckDbSchema } = require('./lib/criticalTables');

let pass = 0;
let fail = 0;

function test(name, fn) {
  try {
    fn();
    pass++;
    console.log(`  OK  ${name}`);
  } catch (error) {
    fail++;
    console.log(`FAIL  ${name}\n      ${error.stack || error.message}`);
  }
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-self-test-'));

console.log('=== Filename generation ===');

test('buildBackupFilename: format database-environment-timestamp', () => {
  const fn = buildBackupFilename({ database: 'db_epelara', environment: 'development', date: new Date('2026-08-08T07:15:00Z') });
  assert.strictEqual(fn, 'db_epelara-development-20260808T071500Z');
});

test('buildBackupFilename: dua panggilan beda detik menghasilkan nama beda (tidak pernah statis)', () => {
  const fn1 = buildBackupFilename({ database: 'db', environment: 'dev', date: new Date('2026-01-01T00:00:00Z') });
  const fn2 = buildBackupFilename({ database: 'db', environment: 'dev', date: new Date('2026-01-01T00:00:01Z') });
  assert.notStrictEqual(fn1, fn2);
});

test('buildBackupFilename: throw jika database/environment kosong', () => {
  assert.throws(() => buildBackupFilename({ database: '', environment: 'dev' }));
  assert.throws(() => buildBackupFilename({ database: 'db', environment: '' }));
});

console.log('\n=== Checksum ===');

test('computeSha256: hasil 64 hex char dan konsisten untuk isi sama', () => {
  const f1 = path.join(tmpDir, 'a.sql');
  const f2 = path.join(tmpDir, 'b.sql');
  fs.writeFileSync(f1, 'CREATE TABLE foo (id int);');
  fs.writeFileSync(f2, 'CREATE TABLE foo (id int);');
  const h1 = computeSha256(f1);
  const h2 = computeSha256(f2);
  assert.strictEqual(h1.length, 64);
  assert.strictEqual(h1, h2);
});

test('computeSha256: isi beda menghasilkan checksum beda', () => {
  const f1 = path.join(tmpDir, 'c.sql');
  const f2 = path.join(tmpDir, 'd.sql');
  fs.writeFileSync(f1, 'CREATE TABLE foo (id int);');
  fs.writeFileSync(f2, 'CREATE TABLE bar (id int);');
  assert.notStrictEqual(computeSha256(f1), computeSha256(f2));
});

console.log('\n=== Validasi struktur dump / partial artifact handling ===');

test('looksLikeValidDump: file 0 byte ditolak (partial/gagal tidak dianggap backup)', () => {
  const f = path.join(tmpDir, 'empty.sql');
  fs.writeFileSync(f, '');
  const result = looksLikeValidDump(f);
  assert.strictEqual(result.valid, false);
  assert.match(result.reason, /0 byte/);
});

test('looksLikeValidDump: dump valid (header MySQL dump) diterima', () => {
  const f = path.join(tmpDir, 'valid1.sql');
  fs.writeFileSync(f, '-- MySQL dump 10.13\nCREATE TABLE foo (id int);\n');
  assert.strictEqual(looksLikeValidDump(f).valid, true);
});

test('looksLikeValidDump: file berisi CREATE TABLE tanpa header juga diterima', () => {
  const f = path.join(tmpDir, 'valid2.sql');
  fs.writeFileSync(f, 'CREATE TABLE foo (id int);\nINSERT INTO foo VALUES (1);\n');
  assert.strictEqual(looksLikeValidDump(f).valid, true);
});

test('looksLikeValidDump: teks acak (bukan dump) ditolak', () => {
  const f = path.join(tmpDir, 'garbage.sql');
  fs.writeFileSync(f, 'ini bukan dump sama sekali, cuma teks acak tanpa struktur SQL apapun');
  assert.strictEqual(looksLikeValidDump(f).valid, false);
});

test('partial artifact: file .sql.partial tidak boleh dianggap final sebelum rename', () => {
  const partialPath = path.join(tmpDir, 'test.sql.partial');
  fs.writeFileSync(partialPath, '-- MySQL dump\nCREATE TABLE foo(id int);');
  // Simulasikan cek "apakah backup final ada" - HARUS gagal untuk .partial.
  const finalPath = path.join(tmpDir, 'test.sql');
  assert.strictEqual(fs.existsSync(finalPath), false, 'file final belum ada sebelum rename - benar');
  assert.strictEqual(fs.existsSync(partialPath), true, 'file .partial ada sebelum rename - benar');
  fs.renameSync(partialPath, finalPath);
  assert.strictEqual(fs.existsSync(finalPath), true, 'setelah rename, file final ada');
  assert.strictEqual(fs.existsSync(partialPath), false, 'setelah rename, .partial tidak ada lagi');
});

console.log('\n=== Manifest ===');

test('buildManifest: berisi seluruh field wajib sesuai spesifikasi', () => {
  const m = buildManifest({
    backupId: 'bkp_123',
    database: 'db_epelara',
    environment: 'development',
    createdAt: '2026-08-08T07:15:00.000Z',
    completedAt: '2026-08-08T07:15:05.000Z',
    filename: 'db_epelara-development-20260808T071500Z.sql',
    sizeBytes: 12345,
    sha256: 'abc123',
    mysqldumpVersion: 'mysqldump 8.0.30',
    host: 'localhost',
    status: 'SUCCESS',
  });
  for (const field of ['backup_id', 'database', 'environment', 'created_at', 'completed_at', 'duration_ms', 'filename', 'size_bytes', 'sha256', 'mysqldump_version', 'host', 'status', 'verification_status']) {
    assert.ok(field in m, `manifest harus punya field "${field}"`);
  }
  assert.strictEqual(m.duration_ms, 5000);
  assert.strictEqual(m.verification_status, 'NOT_VERIFIED');
});

test('buildManifest: TIDAK PERNAH menyertakan password/credential', () => {
  const m = buildManifest({
    backupId: 'bkp_1', database: 'db', environment: 'dev', createdAt: 'a', completedAt: 'b',
    filename: 'f.sql', sizeBytes: 1, sha256: 'x', mysqldumpVersion: 'v', host: 'localhost', status: 'SUCCESS',
  });
  const serialized = JSON.stringify(m).toLowerCase();
  assert.ok(!serialized.includes('password'), 'manifest tidak boleh mengandung kata "password"');
});

console.log('\n=== Credential redaction ===');

test('redactConnectionStrings: mysql:// connection string password diredaksi', () => {
  const input = 'Error connecting to mysql://root:SuperSecret123@localhost:3306/db';
  const redacted = redactConnectionStrings(input);
  assert.ok(!redacted.includes('SuperSecret123'), 'password tidak boleh muncul di pesan yang diredaksi');
  assert.ok(redacted.includes('[REDACTED]'));
});

test('redactConnectionStrings: --password=xxx diredaksi', () => {
  const input = 'mysqldump --password=rahasia123 --host=localhost';
  const redacted = redactConnectionStrings(input);
  assert.ok(!redacted.includes('rahasia123'));
});

test('redactErrorInfo: key bernama password/secret/token diganti [REDACTED]', () => {
  const errorInfo = { message: 'gagal', password: 'jangan-bocor', db_secret: 'juga-jangan', normal_field: 'aman' };
  const redacted = redactErrorInfo(errorInfo);
  assert.strictEqual(redacted.password, '[REDACTED]');
  assert.strictEqual(redacted.db_secret, '[REDACTED]');
  assert.strictEqual(redacted.normal_field, 'aman');
});

test('buildSafeFailureLog: hasil tidak mengandung credential mentah', () => {
  const log = buildSafeFailureLog({
    timestamp: 'now', backupId: 'bkp_1', stage: 'mysqldump-exec', errorType: 'AUTHENTICATION_FAILED',
    error: new Error('Access denied for user root@localhost using password: --password=secret123'),
    exitCode: 1,
  });
  assert.ok(!log.safe_message.includes('secret123'));
  assert.strictEqual(log.exit_code, 1);
});

console.log('\n=== Failure result shape ===');

test('buildSafeFailureLog: field wajib lengkap (timestamp, backup_id, stage, error_type, exit_code)', () => {
  const log = buildSafeFailureLog({ timestamp: 't', backupId: 'b', stage: 's', errorType: 'E', error: new Error('x'), exitCode: 2 });
  for (const f of ['timestamp', 'backup_id', 'stage', 'error_type', 'safe_message', 'exit_code']) {
    assert.ok(f in log, `failure log harus punya field "${f}"`);
  }
});

console.log('\n=== Retention selection ===');

test('evaluateRetention: backup dalam window daily selalu disimpan', () => {
  const now = new Date('2026-08-08T00:00:00Z');
  const manifests = [{ backup_id: 'a', filename: 'a.sql', status: 'SUCCESS', created_at: new Date(now.getTime() - 2 * 86400000).toISOString() }];
  const result = evaluateRetention(manifests, { dailyDays: 14, weeklyWeeks: 8, monthlyMonths: 6 }, now);
  assert.deepStrictEqual(result.keep, ['a']);
  assert.deepStrictEqual(result.delete, []);
});

test('evaluateRetention: backup FAILED tidak pernah masuk kandidat hapus (dilewati total)', () => {
  const now = new Date('2026-08-08T00:00:00Z');
  const manifests = [{ backup_id: 'f1', filename: 'f1.sql', status: 'FAILED', created_at: new Date(now.getTime() - 500 * 86400000).toISOString() }];
  const result = evaluateRetention(manifests, { dailyDays: 14, weeklyWeeks: 8, monthlyMonths: 6 }, now);
  assert.ok(!result.keep.includes('f1'));
  assert.ok(!result.delete.includes('f1'));
});

test('evaluateRetention: backup jauh di luar semua window (>monthlyMonths) dihapus', () => {
  const now = new Date('2026-08-08T00:00:00Z');
  const manifests = [{ backup_id: 'old', filename: 'old.sql', status: 'SUCCESS', created_at: new Date(now.getTime() - 400 * 86400000).toISOString() }];
  const result = evaluateRetention(manifests, { dailyDays: 14, weeklyWeeks: 8, monthlyMonths: 6 }, now);
  assert.deepStrictEqual(result.delete, ['old']);
});

test('evaluateRetention: dua backup di minggu weekly yang sama - hanya satu disimpan', () => {
  const now = new Date('2026-08-08T00:00:00Z');
  const manifests = [
    { backup_id: 'w1', filename: 'w1.sql', status: 'SUCCESS', created_at: new Date(now.getTime() - 20 * 86400000).toISOString() },
    { backup_id: 'w2', filename: 'w2.sql', status: 'SUCCESS', created_at: new Date(now.getTime() - 21 * 86400000).toISOString() },
  ];
  const result = evaluateRetention(manifests, { dailyDays: 14, weeklyWeeks: 8, monthlyMonths: 6 }, now);
  const totalDecided = result.keep.length + result.delete.length;
  assert.strictEqual(totalDecided, 2);
  assert.strictEqual(result.keep.length, 1, 'hanya 1 representatif per minggu yang disimpan');
});

console.log('\n=== RESTORE SAFETY — guard paling kritikal ===');

test('HARD REJECT: target restore == source database (exact match)', () => {
  assert.throws(() => assertNotSourceDatabase('db_epelara', 'db_epelara'), /HARD REJECT/);
});

test('HARD REJECT: target restore == source database (case-insensitive)', () => {
  assert.throws(() => assertNotSourceDatabase('DB_EPELARA', 'db_epelara'), /HARD REJECT/);
  assert.throws(() => assertNotSourceDatabase('Db_Epelara', 'db_epelara'), /HARD REJECT/);
});

test('HARD REJECT: sesuai database AKTIF dari config, bukan literal "db_epelara" semata', () => {
  // Simulasikan environment lain dengan nama DB berbeda - guard harus tetap
  // reject berdasarkan nama yang benar-benar aktif, bukan hardcoded string.
  assert.throws(() => assertNotSourceDatabase('database_production', 'database_production'), /HARD REJECT/);
  assert.doesNotThrow(() => assertNotSourceDatabase('epelara_restore_verify_1_a', 'database_production'));
});

test('Target dengan nama berbeda dari source diizinkan lolos guard ini', () => {
  assert.doesNotThrow(() => assertNotSourceDatabase('epelara_restore_verify_123_abc', 'db_epelara'));
});

test('generateTempDatabaseName: selalu memakai prefix resmi dan unik', () => {
  const n1 = generateTempDatabaseName();
  const n2 = generateTempDatabaseName();
  assert.ok(n1.startsWith('epelara_restore_verify_'));
  assert.notStrictEqual(n1, n2, 'dua panggilan harus menghasilkan nama berbeda');
});

test('assertIsTemporaryDatabaseName: menolak nama tanpa prefix resmi', () => {
  assert.throws(() => assertIsTemporaryDatabaseName('db_epelara'), /HARD REJECT/);
  assert.throws(() => assertIsTemporaryDatabaseName('some_other_db'), /HARD REJECT/);
});

test('assertIsTemporaryDatabaseName: menerima nama hasil generateTempDatabaseName', () => {
  assert.doesNotThrow(() => assertIsTemporaryDatabaseName(generateTempDatabaseName()));
});

test('checksum mismatch -> reject', () => {
  assert.throws(() => assertChecksumMatches('aaa111', 'bbb222'), /HARD REJECT/);
});

test('checksum match -> tidak throw', () => {
  assert.doesNotThrow(() => assertChecksumMatches('samehash', 'samehash'));
});

test('invalid manifest (field wajib hilang) -> reject', () => {
  assert.throws(() => assertValidManifest({ backup_id: 'x' }), /HARD REJECT/);
});

test('manifest dengan status bukan SUCCESS -> reject', () => {
  assert.throws(
    () => assertValidManifest({ backup_id: 'x', database: 'd', environment: 'e', filename: 'f', sha256: 's', status: 'FAILED' }),
    /HARD REJECT/,
  );
});

test('manifest valid & SUCCESS -> tidak throw', () => {
  assert.doesNotThrow(() =>
    assertValidManifest({ backup_id: 'x', database: 'd', environment: 'e', filename: 'f', sha256: 's', status: 'SUCCESS' }),
  );
});

console.log('\n=== Critical tables (tidak boleh dikarang - harus sinkron dengan checkDbSchema.js) ===');

test('getCriticalTableNames: mengembalikan daftar non-kosong', () => {
  const tables = getCriticalTableNames();
  assert.ok(Array.isArray(tables) && tables.length > 0);
});

test('critical tables tetap sinkron dengan REQUIRED_SCHEMA di checkDbSchema.js', () => {
  const sync = verifySyncWithCheckDbSchema();
  assert.strictEqual(sync.inSync, true, `Drift terdeteksi, tabel hilang dari checkDbSchema.js: ${JSON.stringify(sync.missing)}`);
});

// Cleanup temp dir
fs.rmSync(tmpDir, { recursive: true, force: true });

console.log(`\n=== Hasil: ${pass} pass, ${fail} fail ===`);
process.exit(fail > 0 ? 1 : 0);
