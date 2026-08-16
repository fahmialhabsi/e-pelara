'use strict';

/**
 * Isolated Uploads Restore Verification Engine (Sprint 2, S2-01C / mirrors
 * S2-02's databaseRestoreVerify.js pattern for filesystem backups).
 *
 * PRINSIP PALING PENTING: restore verification TIDAK PERNAH mengekstrak ke
 * backend/uploads/ (direktori uploads aplikasi yang sesungguhnya). Selalu
 * membuat direktori TEMPORARY dengan nama ter-generate di bawah OS temp dir,
 * ekstrak ke situ, verifikasi, lalu hapus — di dalam try/finally.
 *
 * Alur: pilih backup SUCCESS terbaru -> verifikasi SHA-256 -> buat temp dir
 * -> ekstrak archive ke situ -> integrity verification (jumlah file, ukuran
 * agregat) -> catat hasil -> hapus temp dir.
 *
 * Jalankan: node scripts/uploadsRestoreVerify.js [--backup-id=<id>]
 * (atau: npm run uploads:restore:verify, dari folder backend/)
 *
 * Exit code: 0 = RESTORE_VERIFIED, non-zero = RESTORE_FAILED.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const { resolveUploadsDir, resolveUploadsBackupDir } = require('./lib/backupConfig');
const { computeSha256 } = require('./lib/uploadsBackupManifest');
const { redactConnectionStrings } = require('./lib/backupManifest');
const {
  assertWithinRoot,
  assertNotRealUploadsDir,
  assertIsTemporaryRestoreDir,
} = require('./lib/uploadsBackupSafety');

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

function generateTempRestoreDirName(prefix = 'epelara_uploads_restore_verify') {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

function findLatestSuccessBackup(backupDir, explicitBackupId) {
  const manifestFiles = fs.readdirSync(backupDir).filter((f) => f.endsWith('.manifest.json'));
  const manifests = [];
  for (const mf of manifestFiles) {
    try {
      const parsed = JSON.parse(fs.readFileSync(path.join(backupDir, mf), 'utf8'));
      if (parsed.type !== 'uploads') continue;
      manifests.push(parsed);
    } catch (_err) {
      // Manifest korup dilewati.
    }
  }

  const successOnly = manifests.filter((m) => m.status === 'SUCCESS');

  if (explicitBackupId) {
    const found = successOnly.find((m) => m.backup_id === explicitBackupId);
    if (!found) {
      throw new Error(`Backup uploads dengan backup_id="${explicitBackupId}" tidak ditemukan atau bukan status SUCCESS.`);
    }
    return found;
  }

  if (successOnly.length === 0) {
    throw new Error('Tidak ada backup uploads berstatus SUCCESS ditemukan. Jalankan db:backup:uploads terlebih dahulu.');
  }

  successOnly.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return successOnly[0];
}

function resolveTarPath() {
  const explicit = process.env.TAR_PATH;
  if (explicit && fs.existsSync(explicit)) return explicit;
  return 'tar';
}

async function main() {
  const args = parseArgs(process.argv);
  const backupDir = resolveUploadsBackupDir();
  const resultLogPath = path.join(backupDir, 'uploads-restore-verify.log.jsonl');

  function logResult(entry) {
    fs.appendFileSync(resultLogPath, `${JSON.stringify(entry)}\n`, 'utf8');
  }

  const record = {
    backup_id: null,
    restore_target: null, // hanya basename temp dir, bukan absolute path lengkap (hindari kebocoran struktur filesystem operator)
    started_at: nowIso(),
    completed_at: null,
    checksum_match: null,
    files_expected: null,
    files_found: null,
    verification_results: {},
    cleanup_status: 'NOT_ATTEMPTED',
    outcome: null,
  };

  let manifest;
  let tempDir = null;
  const realUploadsDir = (() => {
    try {
      return fs.realpathSync(resolveUploadsDir());
    } catch (_err) {
      return null; // uploads dir mungkin belum ada — tetap lanjut, guard tidak bergantung pada ini secara keras
    }
  })();

  try {
    manifest = findLatestSuccessBackup(backupDir, args['backup-id']);
    record.backup_id = manifest.backup_id;

    const archivePath = path.join(backupDir, manifest.filename);
    if (!fs.existsSync(archivePath)) {
      throw new Error(`File archive "${manifest.filename}" tidak ditemukan di ${backupDir} (manifest ada tapi file hilang).`);
    }

    const computedChecksum = computeSha256(archivePath);
    if (computedChecksum !== manifest.sha256) {
      throw new Error(
        `HARD REJECT: checksum SHA-256 archive tidak cocok dengan manifest (mungkin corrupt/berubah). computed=${computedChecksum} manifest=${manifest.sha256}`,
      );
    }
    record.checksum_match = true;

    // ---- Buat direktori temp disposable, DI LUAR backend/uploads/ ----
    const tempDirName = generateTempRestoreDirName();
    tempDir = path.join(os.tmpdir(), tempDirName);
    assertIsTemporaryRestoreDir(tempDir);
    if (realUploadsDir) {
      assertNotRealUploadsDir(tempDir, realUploadsDir);
    }
    fs.mkdirSync(tempDir, { recursive: true });
    record.restore_target = tempDirName; // basename saja

    console.log(`[uploads:restore:verify] backup_id=${manifest.backup_id} -> temp dir=${tempDirName} (di bawah OS temp, BUKAN backend/uploads/)`);

    // ---- Ekstrak archive ke temp dir ----
    const tar = resolveTarPath();
    const extractResult = spawnSync(tar, ['-xzf', archivePath, '-C', tempDir], {
      timeout: Number(process.env.UPLOADS_RESTORE_TIMEOUT_MS || 30 * 60 * 1000),
    });

    if (extractResult.error) {
      throw new Error(`Gagal menjalankan tar untuk ekstraksi: ${redactConnectionStrings(extractResult.error.message)}`);
    }
    if (extractResult.status !== 0) {
      const stderrSafe = redactConnectionStrings(String(extractResult.stderr || '').slice(0, 2000));
      throw new Error(`Ekstraksi archive gagal (exit code ${extractResult.status}): ${stderrSafe}`);
    }

    // ---- Integrity verification: hitung file hasil ekstraksi, guard tiap entry tetap di dalam tempDir ----
    const realTempDir = fs.realpathSync(tempDir);
    let filesFound = 0;
    let totalBytesFound = 0;
    let boundaryViolation = false;

    function walkCount(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const entryPath = path.join(dir, entry.name);
        let realEntryPath;
        try {
          realEntryPath = fs.realpathSync(entryPath);
        } catch (_err) {
          continue;
        }
        try {
          assertWithinRoot(realEntryPath, realTempDir);
        } catch (_err) {
          boundaryViolation = true;
          continue;
        }
        const stat = fs.statSync(realEntryPath);
        if (stat.isDirectory()) {
          walkCount(entryPath);
        } else if (stat.isFile()) {
          filesFound += 1;
          totalBytesFound += stat.size;
        }
      }
    }
    walkCount(tempDir);

    record.files_expected = manifest.file_count;
    record.files_found = filesFound;

    record.verification_results.extraction_ok = true;
    record.verification_results.file_count_matches = filesFound === manifest.file_count;
    record.verification_results.no_boundary_violation_on_extract = !boundaryViolation;
    record.verification_results.total_bytes_found = totalBytesFound;

    const passed =
      record.verification_results.extraction_ok &&
      record.verification_results.file_count_matches &&
      record.verification_results.no_boundary_violation_on_extract;

    record.outcome = passed ? 'RESTORE_VERIFIED' : 'RESTORE_FAILED';
    record.completed_at = nowIso();

    console.log(`[uploads:restore:verify] files_found=${filesFound} files_expected=${manifest.file_count}`);
  } catch (err) {
    record.outcome = 'RESTORE_FAILED';
    record.completed_at = nowIso();
    record.error = redactConnectionStrings(err.message);
    console.error(`[uploads:restore:verify] GAGAL: ${record.error}`);
  } finally {
    // ---- Cleanup: hapus temp dir, selalu dicoba walau verifikasi gagal ----
    if (tempDir) {
      try {
        if (realUploadsDir) assertNotRealUploadsDir(tempDir, realUploadsDir);
        assertIsTemporaryRestoreDir(tempDir);
        fs.rmSync(tempDir, { recursive: true, force: true });
        record.cleanup_status = 'SUCCESS';
        console.log(`[uploads:restore:verify] Cleanup: hapus temp dir berhasil.`);
      } catch (cleanupErr) {
        record.cleanup_status = 'FAILED';
        record.cleanup_error = redactConnectionStrings(cleanupErr.message);
        console.error(`[uploads:restore:verify] PERINGATAN: cleanup gagal — ${tempDir} mungkin masih ada. Hapus manual jika perlu.`);
      }
    } else {
      record.cleanup_status = 'NOT_APPLICABLE';
    }

    logResult(record);

    console.log(`\n[uploads:restore:verify] === HASIL: ${record.outcome} ===`);
    console.log(JSON.stringify(record, null, 2));

    process.exit(record.outcome === 'RESTORE_VERIFIED' ? 0 : 1);
  }
}

main().catch((err) => {
  console.error('[uploads:restore:verify] FATAL (uncaught):', err.message);
  process.exit(1);
});
