'use strict';

/**
 * Self-test UNIT (tanpa DB) — Sprint 3, S3-1: RPJMD Approval Synchronization.
 *
 * Tujuan (acceptance criterion S3-1, Owner 2026-08-08):
 * "approval RPJMD → status authoritative dokumen dapat ditelusuri dan tidak
 * ada lagi silent no-op". Test ini secara EKSPLISIT GAGAL apabila entity_type
 * "rpjmd" diterima oleh validasi (VALID_ENTITY_TYPES) TAPI tidak ada handler
 * sinkronisasi terdaftar untuknya (ENTITY_TABLE_MAP / TABLE_STATUS_MAP) —
 * persis kondisi gap yang ditemukan pada Sprint 3 Existing-State Assessment
 * dan diperbaiki pada migration 20260808090001-add-rpjmd-approval-status.js.
 *
 * Tidak me-require approvalController.js/guardApproved.js langsung karena
 * keduanya require('../models') yang men-trigger load penuh models/index.js
 * (termasuk asosiasi MR/ProSN yang butuh DB) — bukan bug, tapi tidak relevan
 * untuk test ini dan pernah menyebabkan crash tidak relevan di Sprint 1.
 * Sebagai gantinya, test ini membaca source file kedua modul tersebut secara
 * statis dan mem-parse literal object JS-nya, sehingga tetap 100% DB-independent
 * namun tetap memverifikasi KONTEN NYATA dari file yang benar-benar dipakai
 * runtime (bukan salinan/asumsi terpisah yang bisa drift dari kode asli).
 *
 * Jalankan: node scripts/rpjmdApprovalSyncRegressionSelfTest.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

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

function extractArrayLiteral(source, varName) {
  // Ambil isi array literal dari `const <varName> = [ ... ];` (tanpa eval kode berbahaya lain).
  const re = new RegExp(`const\\s+${varName}\\s*=\\s*\\[([\\s\\S]*?)\\];`);
  const m = source.match(re);
  if (!m) return null;
  // eslint-disable-next-line no-eval -- input adalah source file lokal terpercaya, bukan input eksternal
  return eval(`[${m[1]}]`);
}

function extractObjectLiteral(source, varName) {
  const re = new RegExp(`const\\s+${varName}\\s*=\\s*\\{([\\s\\S]*?)\\};`);
  const m = source.match(re);
  if (!m) return null;
  // eslint-disable-next-line no-eval -- input adalah source file lokal terpercaya, bukan input eksternal
  return eval(`({${m[1]}})`);
}

const approvalControllerPath = path.join(__dirname, '..', 'controllers', 'approvalController.js');
const guardApprovedPath = path.join(__dirname, '..', 'middlewares', 'guardApproved.js');
const rpjmdModelPath = path.join(__dirname, '..', 'models', 'rpjmdModel.js');
const rpjmdRoutesPath = path.join(__dirname, '..', 'routes', 'rpjmdRoutes.js');

const approvalControllerSrc = fs.readFileSync(approvalControllerPath, 'utf8');
const guardApprovedSrc = fs.readFileSync(guardApprovedPath, 'utf8');
const rpjmdModelSrc = fs.readFileSync(rpjmdModelPath, 'utf8');
const rpjmdRoutesSrc = fs.readFileSync(rpjmdRoutesPath, 'utf8');

console.log('=== S3-1: RPJMD Approval Synchronization — regression guard ===');

test('VALID_ENTITY_TYPES (approvalController.js) menyertakan "rpjmd"', () => {
  const validTypes = extractArrayLiteral(approvalControllerSrc, 'VALID_ENTITY_TYPES');
  assert.ok(Array.isArray(validTypes), 'VALID_ENTITY_TYPES harus berupa array yang bisa di-parse');
  assert.ok(validTypes.includes('rpjmd'), 'VALID_ENTITY_TYPES harus menyertakan "rpjmd"');
});

test(
  'REGRESSION GUARD KRITIS: jika "rpjmd" diterima VALID_ENTITY_TYPES, WAJIB ada di ENTITY_TABLE_MAP (bukan silent no-op)',
  () => {
    const validTypes = extractArrayLiteral(approvalControllerSrc, 'VALID_ENTITY_TYPES');
    const tableMap = extractObjectLiteral(approvalControllerSrc, 'ENTITY_TABLE_MAP');
    assert.ok(tableMap, 'ENTITY_TABLE_MAP harus bisa di-parse dari approvalController.js');

    if (validTypes.includes('rpjmd')) {
      assert.ok(
        typeof tableMap.rpjmd === 'string' && tableMap.rpjmd.length > 0,
        'GAGAL: entity_type "rpjmd" diterima oleh validasi tapi TIDAK ADA di ENTITY_TABLE_MAP — ' +
          'ini persis kondisi silent no-op yang diperbaiki S3-1. syncStatusToTable() akan diam-diam ' +
          'tidak melakukan apa pun untuk approval RPJMD.',
      );
    }
  },
);

test('ENTITY_TABLE_MAP.rpjmd mengarah ke tabel "rpjmd" (bukan tabel lain yang salah)', () => {
  const tableMap = extractObjectLiteral(approvalControllerSrc, 'ENTITY_TABLE_MAP');
  assert.strictEqual(tableMap.rpjmd, 'rpjmd');
});

test(
  'REGRESSION GUARD: guardApproved.js TABLE_STATUS_MAP juga menyertakan "rpjmd" (konsisten dengan ENTITY_TABLE_MAP)',
  () => {
    const tableMap = extractObjectLiteral(approvalControllerSrc, 'ENTITY_TABLE_MAP');
    const statusMap = extractObjectLiteral(guardApprovedSrc, 'TABLE_STATUS_MAP');
    assert.ok(statusMap, 'TABLE_STATUS_MAP harus bisa di-parse dari guardApproved.js');

    if (tableMap.rpjmd) {
      assert.ok(
        typeof statusMap.rpjmd === 'string' && statusMap.rpjmd.length > 0,
        'GAGAL: rpjmd ada di ENTITY_TABLE_MAP (approvalController.js) tapi tidak ada di ' +
          'TABLE_STATUS_MAP (guardApproved.js) — guardApproved akan fallback ke approval_logs ' +
          'saja, tidak konsisten dengan primary check tabel yang sudah tersedia.',
      );
    }
  },
);

test('Model rpjmdModel.js mendefinisikan kolom approval_status dengan ENUM 4-state yang benar', () => {
  assert.ok(
    /approval_status\s*:\s*\{/.test(rpjmdModelSrc),
    'rpjmdModel.js harus mendefinisikan field approval_status',
  );
  assert.ok(
    /DataTypes\.ENUM\(\s*"DRAFT",\s*"SUBMITTED",\s*"APPROVED",\s*"REJECTED"\s*\)/.test(rpjmdModelSrc),
    'approval_status harus ENUM DRAFT/SUBMITTED/APPROVED/REJECTED — sama persis dengan modul lain ' +
      '(dpa/rka/lakip/renja/rkpd/renstra) agar tidak menciptakan vocabulary status baru yang berbeda',
  );
});

test('Migration 20260808090001 ada dan idempotent (skip jika kolom sudah ada)', () => {
  const migrationPath = path.join(__dirname, '..', 'migrations', '20260808090001-add-rpjmd-approval-status.js');
  assert.ok(fs.existsSync(migrationPath), 'Migration file harus ada');
  const src = fs.readFileSync(migrationPath, 'utf8');
  assert.ok(/describeTable\('rpjmd'\)/.test(src), 'Migration harus mengecek describeTable sebelum ALTER (idempotent)');
  assert.ok(/desc\.approval_status/.test(src), 'Migration harus skip jika approval_status sudah ada');
  assert.ok(/async down/.test(src), 'Migration harus punya down() untuk rollback');
});

test('rpjmdRoutes.js memasang guardApproved("rpjmd") pada PUT dan DELETE', () => {
  const putBlockMatch = rpjmdRoutesSrc.match(/router\.put\(\s*"\/:id"[\s\S]*?\);/);
  const deleteBlockMatch = rpjmdRoutesSrc.match(/router\.delete\(\s*"\/:id"[\s\S]*?\);/);
  assert.ok(putBlockMatch, 'Route PUT /:id harus ditemukan');
  assert.ok(deleteBlockMatch, 'Route DELETE /:id harus ditemukan');
  assert.ok(
    /guardApproved\(\s*"rpjmd"\s*\)/.test(putBlockMatch[0]),
    'PUT /:id harus memasang guardApproved("rpjmd") — sebelumnya RPJMD adalah satu-satunya modul ' +
      'di ENTITY_TABLE_MAP tanpa enforcement guardApproved',
  );
  assert.ok(
    /guardApproved\(\s*"rpjmd"\s*\)/.test(deleteBlockMatch[0]),
    'DELETE /:id harus memasang guardApproved("rpjmd")',
  );
});

test('rpjmd_dokumen.status (orphan model, di luar scope S3-1) TIDAK diubah oleh perbaikan ini', () => {
  // Guard negatif: memastikan kita tidak secara tidak sengaja menyatukan/mengubah
  // vocabulary status rpjmd_dokumen (draft/review/final) sebagai bagian S3-1 —
  // itu di luar scope (Phase A menemukan model ini orphan, tidak dipakai controller).
  const rpjmdDokumenModelPath = path.join(__dirname, '..', 'models', 'rpjmdDokumenModel.js');
  const src = fs.readFileSync(rpjmdDokumenModelPath, 'utf8');
  assert.ok(
    /DataTypes\.ENUM\("draft",\s*"review",\s*"final"\)/.test(src),
    'rpjmd_dokumen.status harus tetap ENUM(draft,review,final) — TIDAK disentuh oleh S3-1 (di luar scope)',
  );
});

console.log(`\n=== Hasil: ${pass} pass, ${fail} fail ===`);
process.exit(fail > 0 ? 1 : 0);
