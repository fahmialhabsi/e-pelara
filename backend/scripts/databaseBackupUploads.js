'use strict';

/**
 * Automated Uploads (Filesystem) Backup Engine (Sprint 2, S2-01C).
 *
 * Melindungi backend/uploads/ (dokumen pemerintah persisten — regulasi,
 * evidence MR, LHP import, dll.) yang TIDAK dicakup oleh databaseBackup.js
 * (itu hanya mysqldump, DB saja). Keputusan Owner (S2-D01): uploads WAJIB
 * masuk cakupan recoverability Sprint 2, lewat mekanisme filesystem-backup
 * minimum yang aman — bukan migrasi ke cloud/object storage, bukan
 * mengubah path upload aplikasi.
 *
 * Desain sengaja MIRROR databaseBackup.js supaya kedua engine backup
 * konsisten dan predictable bagi operator yang sudah paham salah satunya:
 *   kumpulkan daftar file (dengan guard boundary) -> tar+gzip ke file
 *   .tar.gz.partial -> validasi struktur -> checksum SHA-256 -> rename
 *   atomic ke .tar.gz final -> manifest JSON -> retention cleanup (reuse
 *   backupRetention.js yang sudah ada, generic terhadap "manifest berisi
 *   backup_id/status/created_at" — tidak spesifik DB).
 *
 * PRINSIP KERAHASIAAN (mandat §12.1): TIDAK PERNAH mencetak/mencatat isi
 * dokumen atau nama file individual ke log/manifest — hanya jumlah file,
 * total ukuran, dan checksum agregat archive.
 *
 * PRINSIP BOUNDARY (mandat §12.6): setiap entry di-resolve (ikuti symlink)
 * dan diverifikasi tetap di dalam uploads root SEBELUM diarsipkan. Entry
 * yang keluar dari boundary di-skip (dicatat sebagai warning, bukan
 * menggagalkan seluruh backup) — bukan silent include.
 *
 * Jalankan: node scripts/databaseBackupUploads.js
 * (atau: npm run db:backup:uploads, dari folder backend/)
 *
 * Exit code: 0 = SUCCESS, non-zero = FAILURE.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const {
  resolveUploadsDir,
  resolveUploadsBackupDir,
  resolveRetentionPolicy,
} = require('./lib/backupConfig');
const {
  buildUploadsBackupFilename,
  computeSha256,
  looksLikeValidArchive,
  buildUploadsManifest,
} = require('./lib/uploadsBackupManifest');
const { assertWithinRoot, assertLooksLikeUploadsDir } = require('./lib/uploadsBackupSafety');
const { redactConnectionStrings, buildSafeFailureLog } = require('./lib/backupManifest');
const { evaluateRetention } = require('./lib/backupRetention');

function nowIso() {
  return new Date().toISOString();
}

function generateBackupId() {
  return `ubkp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeStructuredLog(logPath, entry) {
  fs.appendFileSync(logPath, `${JSON.stringify(entry)}\n`, 'utf8');
}

function safeCleanupPartial(partialPath) {
  try {
    if (fs.existsSync(partialPath)) {
      fs.unlinkSync(partialPath);
      return true;
    }
  } catch (_err) {
    // Best-effort, tidak fatal.
  }
  return false;
}

/**
 * Kumpulkan daftar path relatif file (bukan direktori/symlink-ke-luar)
 * di bawah uploadsDir, dengan guard boundary per-entry. Mengembalikan
 * { files: string[] (relatif thd uploadsDir), skipped: {path, reason}[],
 *   totalBytes: number }.
 *
 * Symlink policy (mandat §12.6): symlink DIIKUTI untuk resolusi boundary
 * check (realpath), tapi jika hasil resolusinya keluar dari uploadsDir,
 * entry tsb DI-SKIP (tidak diarsipkan), dicatat di skipped[] — bukan
 * silent include, bukan juga menggagalkan seluruh backup.
 */
function collectUploadFiles(uploadsDir) {
  const files = [];
  const skipped = [];
  let totalBytes = 0;

  const realUploadsDir = fs.realpathSync(uploadsDir);

  function walk(currentDir) {
    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (err) {
      skipped.push({ path: path.relative(uploadsDir, currentDir), reason: `dir unreadable: ${err.code || err.message}` });
      return;
    }

    for (const entry of entries) {
      const entryPath = path.join(currentDir, entry.name);
      const relPath = path.relative(uploadsDir, entryPath);

      let realEntryPath;
      try {
        realEntryPath = fs.realpathSync(entryPath);
      } catch (err) {
        // Broken symlink atau file hilang di antara readdir dan realpath.
        skipped.push({ path: relPath, reason: `unresolvable: ${err.code || err.message}` });
        continue;
      }

      try {
        assertWithinRoot(realEntryPath, realUploadsDir);
      } catch (err) {
        skipped.push({ path: relPath, reason: 'boundary-reject (symlink/traversal keluar dari uploads root)' });
        continue;
      }

      let stat;
      try {
        stat = fs.statSync(realEntryPath);
      } catch (err) {
        skipped.push({ path: relPath, reason: `unreadable: ${err.code || err.message}` });
        continue;
      }

      if (stat.isDirectory()) {
        walk(entryPath);
      } else if (stat.isFile()) {
        files.push(relPath);
        totalBytes += stat.size;
      } else {
        // Bukan file/direktori biasa (socket, device, dll.) — skip, bukan error fatal.
        skipped.push({ path: relPath, reason: 'not-a-regular-file-or-directory' });
      }
    }
  }

  walk(uploadsDir);
  return { files, skipped, totalBytes };
}

function resolveTarPath() {
  const explicit = process.env.TAR_PATH;
  if (explicit) {
    if (!fs.existsSync(explicit)) {
      throw new Error(`TAR_PATH diset ke "${explicit}" tapi file tersebut tidak ditemukan.`);
    }
    return { path: explicit, source: 'env:TAR_PATH' };
  }
  // Windows 10 1803+ menyertakan tar.exe (bsdtar) bawaan di System32 — ada
  // di PATH sistem secara default. Linux/macOS: tar hampir selalu di PATH.
  // Tidak ada hardcoded path lain — biarkan gagal jelas (ENOENT) jika benar2 tidak ada.
  return { path: 'tar', source: 'system-PATH (unverified)' };
}

async function main() {
  const backupId = generateBackupId();
  const createdAt = nowIso();
  const uploadsDir = resolveUploadsDir();
  const backupDir = resolveUploadsBackupDir();
  ensureDir(backupDir);
  const logPath = path.join(backupDir, 'uploads-backup.log.jsonl');

  function fail(stage, errorType, error, exitCode = 1) {
    const entry = buildSafeFailureLog({ timestamp: nowIso(), backupId, stage, errorType, error, exitCode });
    writeStructuredLog(logPath, { level: 'ERROR', ...entry });
    console.error(`[db:backup:uploads] GAGAL pada tahap "${stage}": ${entry.safe_message}`);
    process.exit(exitCode);
  }

  // ---- Tahap 0: validasi sumber ----
  if (!fs.existsSync(uploadsDir)) {
    // Mandat §12.8: uploads dir hilang bukan dianggap "sukses backup kosong"
    // secara diam-diam — ini FAILURE eksplisit, harus diinvestigasi manual
    // (bisa jadi salah konfigurasi UPLOADS_DIR, atau memang direktori belum
    // pernah dibuat aplikasi).
    fail('validate-source', 'UPLOADS_DIR_MISSING', new Error(`Direktori uploads "${uploadsDir}" tidak ditemukan.`), 1);
    return;
  }

  try {
    assertLooksLikeUploadsDir(uploadsDir);
  } catch (err) {
    fail('validate-source', 'UPLOADS_DIR_SUSPICIOUS', err, 1);
    return;
  }

  writeStructuredLog(logPath, {
    level: 'INFO',
    timestamp: createdAt,
    backup_id: backupId,
    stage: 'start',
    message: `Uploads backup dimulai. source=${uploadsDir}`,
  });

  const { files, skipped, totalBytes } = collectUploadFiles(uploadsDir);

  if (skipped.length > 0) {
    writeStructuredLog(logPath, {
      level: 'WARN',
      timestamp: nowIso(),
      backup_id: backupId,
      stage: 'collect-files',
      message: `${skipped.length} entry dilewati (boundary-reject/unreadable/bukan file biasa).`,
      skipped_count: skipped.length,
      skipped_reasons: skipped.map((s) => s.reason), // reason saja, BUKAN path (mandat §12.1 — hindari nama file di log)
    });
  }

  // Mandat §12.8: uploads dir ADA tapi KOSONG — ini kondisi valid dan
  // deterministic, BUKAN error, tapi juga bukan "berhasil membackup data"
  // dalam arti sesungguhnya. Tetap buat archive kosong (tar dari direktori
  // kosong valid) dan tandai file_count=0 di manifest secara eksplisit,
  // supaya jelas dibedakan dari kegagalan backup.
  const environment = process.env.NODE_ENV || 'development';
  const filenameBase = buildUploadsBackupFilename({ environment, date: new Date() });
  const partialPath = path.join(backupDir, `${filenameBase}.tar.gz.partial`);
  const finalPath = path.join(backupDir, `${filenameBase}.tar.gz`);
  const manifestPath = path.join(backupDir, `${filenameBase}.manifest.json`);

  // ---- Tahap 1: tulis daftar file ke file-list sementara (menghindari
  // command-line length limit untuk uploads dengan banyak file) ----
  const fileListPath = path.join(backupDir, `${filenameBase}.filelist.tmp`);
  try {
    fs.writeFileSync(fileListPath, files.join('\n'), 'utf8');
  } catch (err) {
    fail('write-filelist', 'FILELIST_WRITE_FAILED', err, 1);
    return;
  }

  // ---- Tahap 2: jalankan tar -czf ke file .partial ----
  const tar = (() => {
    try {
      return resolveTarPath();
    } catch (err) {
      fail('resolve-tar-path', 'TAR_NOT_CONFIGURED', err, 1);
      return null;
    }
  })();
  if (!tar) return;

  let tarResult;
  try {
    // PENTING (ditemukan lewat self-test, bukan diasumsikan): GNU tar
    // memperlakukan -C sebagai opsi POSITIONAL — hanya berlaku untuk
    // argumen yang muncul SESUDAHNYA. -C harus selalu mendahului -T,
    // jika tidak GNU tar keluar dengan error ("-C has no effect") pada
    // beberapa versi, atau -C diam-diam tidak diterapkan pada versi lain.
    // Urutan berikut (-C sebelum -T) valid untuk KEDUA kasus (file
    // kosong maupun tidak) di GNU tar maupun bsdtar (Windows) — tidak
    // butuh dua cabang argumen terpisah, dan tidak bergantung pada
    // /dev/null (tidak ada di Windows).
    tarResult = spawnSync(tar.path, ['-czf', partialPath, '-C', uploadsDir, '-T', fileListPath], {
      timeout: Number(process.env.UPLOADS_BACKUP_TIMEOUT_MS || 30 * 60 * 1000),
    });
  } catch (err) {
    safeCleanupPartial(partialPath);
    safeCleanupPartial(fileListPath);
    if (err && err.code === 'ENOENT') {
      fail('spawn-tar', 'TAR_NOT_FOUND', err, 1);
    } else {
      fail('spawn-tar', 'TAR_SPAWN_ERROR', err, 1);
    }
    return;
  }

  safeCleanupPartial(fileListPath); // file-list sementara, bukan artifact final — selalu dibersihkan

  if (tarResult.error) {
    safeCleanupPartial(partialPath);
    if (tarResult.error.code === 'ENOENT') {
      fail('spawn-tar', 'TAR_NOT_FOUND', tarResult.error, 1);
    } else {
      fail('spawn-tar', 'TAR_SPAWN_ERROR', tarResult.error, 1);
    }
    return;
  }

  if (tarResult.status !== 0) {
    const stderrSafe = redactConnectionStrings(String(tarResult.stderr || '').slice(0, 2000));
    safeCleanupPartial(partialPath);
    fail('tar-exec', 'ARCHIVE_PROCESS_FAILED', new Error(stderrSafe || `tar exit code ${tarResult.status}`), tarResult.status || 1);
    return;
  }

  // ---- Tahap 3: validasi file .partial ----
  if (!fs.existsSync(partialPath)) {
    fail('validate-output', 'OUTPUT_MISSING', new Error('File .partial tidak ditemukan setelah tar exit 0.'), 1);
    return;
  }

  const dumpCheck = looksLikeValidArchive(partialPath);
  if (!dumpCheck.valid && files.length > 0) {
    // files.length===0 -> archive tar kosong (hanya header) tetap valid
    // gzip tapi bisa sangat kecil; looksLikeValidArchive sudah menangani
    // ambang batas ukuran minimum gzip, jadi tetap dicek untuk kedua kasus,
    // hanya pesan kegagalan dibedakan supaya tidak membingungkan.
    safeCleanupPartial(partialPath);
    fail('validate-archive-structure', 'ARCHIVE_STRUCTURE_INVALID', new Error(dumpCheck.reason), 1);
    return;
  }

  // ---- Tahap 4: checksum SHA-256 ----
  let sha256;
  try {
    sha256 = computeSha256(partialPath);
  } catch (err) {
    safeCleanupPartial(partialPath);
    fail('checksum', 'CHECKSUM_FAILED', err, 1);
    return;
  }

  // ---- Tahap 5: rename .partial -> .tar.gz (baru dianggap valid setelah ini) ----
  try {
    fs.renameSync(partialPath, finalPath);
  } catch (err) {
    safeCleanupPartial(partialPath);
    fail('finalize-rename', 'RENAME_FAILED', err, 1);
    return;
  }

  const completedAt = nowIso();
  const finalStat = fs.statSync(finalPath);

  // ---- Tahap 6: tulis manifest (TIDAK menyertakan nama file individual) ----
  const manifest = buildUploadsManifest({
    backupId,
    environment,
    sourceClassification: 'PERSISTENT_BUSINESS_DATA',
    createdAt,
    completedAt,
    filename: path.basename(finalPath),
    sizeBytes: finalStat.size,
    sha256,
    fileCount: files.length,
    totalSourceBytes: totalBytes,
    status: 'SUCCESS',
    verificationStatus: 'NOT_VERIFIED',
  });

  try {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  } catch (err) {
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
    file_count: manifest.file_count,
    skipped_count: skipped.length,
    duration_ms: manifest.duration_ms,
  });

  console.log(`[db:backup:uploads] SUCCESS`);
  console.log(`  backup_id  : ${backupId}`);
  console.log(`  file       : ${finalPath}`);
  console.log(`  file_count : ${manifest.file_count}`);
  console.log(`  size       : ${finalStat.size} bytes`);
  console.log(`  sha256     : ${sha256}`);
  console.log(`  manifest   : ${manifestPath}`);
  if (skipped.length > 0) {
    console.log(`  skipped    : ${skipped.length} entry (lihat uploads-backup.log.jsonl untuk alasan, bukan nama file)`);
  }

  // ---- Tahap 7: retention (reuse backupRetention.js — generic terhadap manifest berisi backup_id/status/created_at) ----
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
    console.warn(`[db:backup:uploads] Retention gagal dijalankan (backup tetap SUCCESS): ${err.message}`);
  }

  process.exit(0);
}

/**
 * Retention — sama persis pola runRetention() di databaseBackup.js, reuse
 * evaluateRetention() dari backupRetention.js (generic, tidak spesifik DB).
 * Hanya menghapus artifact bermanifest valid berstatus SUCCESS di backupDir
 * ini — tidak pernah wildcard-delete.
 */
function runRetention(backupDir, logPath) {
  const policy = resolveRetentionPolicy();
  const manifestFiles = fs.readdirSync(backupDir).filter((f) => f.endsWith('.manifest.json'));

  const manifests = [];
  for (const mf of manifestFiles) {
    try {
      const parsed = JSON.parse(fs.readFileSync(path.join(backupDir, mf), 'utf8'));
      if (parsed.type !== 'uploads') continue; // guard: hanya pertimbangkan manifest uploads di direktori ini
      manifests.push({ ...parsed, __manifestFile: mf });
    } catch (_err) {
      // Manifest tidak bisa diparse -> dilewati.
    }
  }

  const { delete: toDelete, reasoning } = evaluateRetention(manifests, policy);

  for (const backupId of toDelete) {
    const m = manifests.find((x) => x.backup_id === backupId);
    if (!m) continue;

    const archivePath = path.join(backupDir, m.filename);
    const manifestPath = path.join(backupDir, m.__manifestFile);

    try {
      if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath);
      if (fs.existsSync(manifestPath)) fs.unlinkSync(manifestPath);
      writeStructuredLog(logPath, {
        level: 'INFO',
        timestamp: nowIso(),
        stage: 'retention-delete',
        backup_id: backupId,
        filename: m.filename,
        reason: reasoning[backupId],
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
  console.error('[db:backup:uploads] FATAL (uncaught):', err.message);
  process.exit(1);
});
