'use strict';

/**
 * Self-test UNIT (tanpa DB) untuk logika Sprint 1 Fase 3 & Fase 4:
 *   - planningWorkflowService (Renja: buildStatusFields, resolveCurrentWorkflowStatus)
 *   - renjaDokumenStatusSyncService (RenjaDokumen: buildSyncedStatusPayload,
 *     buildLegacyStatusWritePayload, deriveLegacyStatus)
 *
 * Murni test fungsi pure (tidak menyentuh database), aman dijalankan kapan
 * saja tanpa koneksi MySQL. Untuk verifikasi end-to-end dengan data nyata,
 * lihat renjaStatusSyncIntegrationSelfTest.js (butuh DB).
 *
 * Jalankan: node scripts/renjaStatusSyncSelfTest.js
 */

const assert = require('assert');
const {
  WORKFLOW_STATUS,
  normalizeStatus,
  buildStatusFields,
  toApprovalStatus,
} = require('../services/planningWorkflowService');
const statusSyncSvc = require('../services/renjaDokumenStatusSyncService');

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

console.log('=== Fase 3: Renja (planningWorkflowService) ===');

test('buildStatusFields: draft -> submitted menulis status+approval_status konsisten', () => {
  const fields = buildStatusFields(WORKFLOW_STATUS.SUBMITTED, 99, { status: 'draft', approval_status: 'DRAFT' });
  assert.strictEqual(fields.status, 'submitted');
  assert.strictEqual(fields.approval_status, 'SUBMITTED');
});

test('buildStatusFields: approved mengisi disetujui_oleh/disetujui_at', () => {
  const fields = buildStatusFields(WORKFLOW_STATUS.APPROVED, 7, { status: 'submitted', approval_status: 'SUBMITTED' });
  assert.strictEqual(fields.status, 'approved');
  assert.strictEqual(fields.approval_status, 'APPROVED');
  assert.strictEqual(fields.disetujui_oleh, 7);
  assert.ok(fields.disetujui_at instanceof Date);
});

test('buildStatusFields: revisi ke draft dari approved mengosongkan disetujui_*', () => {
  const fields = buildStatusFields(WORKFLOW_STATUS.DRAFT, 7, {
    status: 'approved',
    approval_status: 'APPROVED',
    disetujui_oleh: 7,
    disetujui_at: new Date('2026-01-01'),
  });
  assert.strictEqual(fields.status, 'draft');
  assert.strictEqual(fields.disetujui_oleh, null);
  assert.strictEqual(fields.disetujui_at, null);
});

test('normalizeStatus: nilai tak dikenal fallback ke draft', () => {
  assert.strictEqual(normalizeStatus('nilai_ngawur'), 'draft');
});

test('toApprovalStatus: konsisten uppercase dari normalizeStatus', () => {
  assert.strictEqual(toApprovalStatus('submitted'), 'SUBMITTED');
  assert.strictEqual(toApprovalStatus('SUBMITTED'), 'SUBMITTED');
});

console.log('\n=== Fase 3: Migrasi rekonsiliasi Renja — replikasi logika precedence ===');

test('precedence: status=draft + approval_status=APPROVED (desync lama) -> approval menang', () => {
  // Replikasi logika resolveCurrentWorkflowStatus() dari renjaController.js:
  // status='draft' tapi approval_status sudah maju -> approval_status dipakai.
  const STATUS_RANK = { DRAFT: 0, SUBMITTED: 1, APPROVED: 2, REJECTED: 2 };
  const statusAsApproval = 'DRAFT'; // dari status='draft'
  const currentApproval = 'APPROVED';
  const resolved = STATUS_RANK[currentApproval] >= STATUS_RANK[statusAsApproval] ? currentApproval : statusAsApproval;
  assert.strictEqual(resolved, 'APPROVED');
});

console.log('\n=== Fase 4: RenjaDokumen (renjaDokumenStatusSyncService) ===');

test('deriveLegacyStatus: seluruh 7 workflow_status terpetakan sesuai tabel resmi', () => {
  assert.strictEqual(statusSyncSvc.deriveLegacyStatus('draft'), 'draft');
  assert.strictEqual(statusSyncSvc.deriveLegacyStatus('submitted'), 'draft');
  assert.strictEqual(statusSyncSvc.deriveLegacyStatus('reviewed'), 'review');
  assert.strictEqual(statusSyncSvc.deriveLegacyStatus('approved'), 'review');
  assert.strictEqual(statusSyncSvc.deriveLegacyStatus('published'), 'final');
  assert.strictEqual(statusSyncSvc.deriveLegacyStatus('archived'), 'final');
  assert.strictEqual(statusSyncSvc.deriveLegacyStatus('rejected'), 'draft');
});

test('deriveLegacyStatus: nilai tak dikenal fallback ke draft', () => {
  assert.strictEqual(statusSyncSvc.deriveLegacyStatus('nilai_ngawur'), 'draft');
  assert.strictEqual(statusSyncSvc.deriveLegacyStatus(undefined), 'draft');
});

test('buildSyncedStatusPayload: published -> status final + field tambahan ikut', () => {
  const payload = statusSyncSvc.buildSyncedStatusPayload('published', { document_phase: 'final' });
  assert.strictEqual(payload.workflow_status, 'published');
  assert.strictEqual(payload.status, 'final');
  assert.strictEqual(payload.document_phase, 'final');
});

test('buildSyncedStatusPayload: menolak workflow_status tidak valid', () => {
  assert.throws(() => statusSyncSvc.buildSyncedStatusPayload('nilai_ngawur'), /tidak valid/);
});

test('isDesynced: baris konsisten -> false', () => {
  assert.strictEqual(statusSyncSvc.isDesynced({ workflow_status: 'published', status: 'final' }), false);
});

test('isDesynced: baris desync (published tapi status masih review) -> true', () => {
  assert.strictEqual(statusSyncSvc.isDesynced({ workflow_status: 'published', status: 'review' }), true);
});

test('buildLegacyStatusWritePayload: endpoint legacy naikkan workflow_status jika lebih maju', () => {
  // status='final' ditulis langsung, workflow_status saat ini masih 'draft'
  // -> workflow_status dinaikkan ke 'published' (setara minimum utk final).
  const payload = statusSyncSvc.buildLegacyStatusWritePayload('final', 'draft');
  assert.strictEqual(payload.status, 'final');
  assert.strictEqual(payload.workflow_status, 'published');
});

test('buildLegacyStatusWritePayload: TIDAK menurunkan workflow_status yang sudah lebih maju', () => {
  // workflow_status sudah 'published', lalu endpoint legacy menulis status='review'
  // (mundur) -> workflow_status TIDAK ikut turun ke 'reviewed'.
  const payload = statusSyncSvc.buildLegacyStatusWritePayload('review', 'published');
  assert.strictEqual(payload.status, 'review');
  assert.strictEqual(payload.workflow_status, 'published');
});

test('buildLegacyStatusWritePayload: status draft dari workflow_status draft tetap draft', () => {
  const payload = statusSyncSvc.buildLegacyStatusWritePayload('draft', 'draft');
  assert.strictEqual(payload.status, 'draft');
  assert.strictEqual(payload.workflow_status, 'draft');
});

test('buildLegacyStatusWritePayload: field tambahan (extra) ikut terbawa', () => {
  const payload = statusSyncSvc.buildLegacyStatusWritePayload('draft', 'draft', { judul: 'Test' });
  assert.strictEqual(payload.judul, 'Test');
});

console.log(`\n=== Hasil: ${pass} pass, ${fail} fail ===`);
process.exit(fail > 0 ? 1 : 0);
