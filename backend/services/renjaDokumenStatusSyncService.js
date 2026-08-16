"use strict";

/**
 * Sprint 1 — Fase 4: Konsolidasi status RenjaDokumen (Owner, 2026-08-07).
 *
 * Keputusan Owner: `workflow_status` menjadi field authoritative untuk
 * status proses RenjaDokumen. `status` (ENUM draft/review/final) DIPERTAHANKAN
 * sebagai field legacy/deprecated (tidak dihapus). Seluruh operasi BARU wajib
 * memakai `workflow_status`. Sinkronisasi `status` <- `workflow_status` HANYA
 * boleh lewat modul terpusat ini — bukan ditulis tersebar per controller,
 * agar pemetaan nilai lama->baru konsisten di satu tempat.
 *
 * KONTEKS — mengapa dua kolom ini tidak bisa disatukan begitu saja:
 * `status` (legacy) cuma py 3 nilai: draft/review/final — dipakai validasi
 * bisnis lama (mis. `deactivateOtherRenjaFinalActive` di planningDomainService.js
 * memfilter `status: 'final'`, `updateDokumen` memblokir ubah `regulasi_acuan`
 * saat `status === 'final'`). `workflow_status` (authoritative) py 7 nilai:
 * draft/submitted/reviewed/approved/published/rejected/archived (lihat
 * `renjaWorkflowGuardService.js` STRICT_TRANSITIONS) — mesin transisi yang
 * sesungguhnya dipakai endpoint /v2/:id/{submit,review,approve,reject,publish}
 * di `renjaGovernanceController.workflowAction()`.
 *
 * PEMETAAN RESMI workflow_status -> status (legacy), eksplisit, TIDAK
 * berdasar kesamaan nama:
 *   draft                       -> draft
 *   submitted                   -> draft   (belum dianggap "review" legacy
 *                                            sampai benar-benar direview)
 *   reviewed                    -> review
 *   approved                    -> review  (sudah disetujui tapi belum
 *                                            diterbitkan -> tetap "review"
 *                                            di kacamata legacy 3-state)
 *   published                   -> final
 *   archived                    -> final   (dokumen usang tetap dianggap
 *                                            "final" secara legacy — tidak
 *                                            ada state legacy utk arsip)
 *   rejected                    -> draft   (kembali ke pengerjaan)
 *
 * BP-APP-002 (Enterprise-Workflow-State-Model, Approved v0.2.0) belum
 * mencakup RenjaDokumen secara eksplisit — addendum implementasi terbatas
 * WAJIB disusun terpisah (bukan bagian modul ini) untuk mencatat mapping di
 * atas sebagai bagian baseline arsitektur, sesuai instruksi Owner.
 */

const WORKFLOW_STATUS_TO_LEGACY_STATUS = Object.freeze({
  draft: "draft",
  submitted: "draft",
  reviewed: "review",
  approved: "review",
  published: "final",
  archived: "final",
  rejected: "draft",
});

const VALID_WORKFLOW_STATUSES = Object.freeze(Object.keys(WORKFLOW_STATUS_TO_LEGACY_STATUS));
const VALID_LEGACY_STATUSES = Object.freeze(["draft", "review", "final"]);

/**
 * Hitung nilai `status` (legacy) yang authoritative-konsisten untuk suatu
 * `workflow_status`. Dipakai satu-satunya tempat resmi untuk menurunkan
 * status legacy — JANGAN duplikasi mapping ini di controller lain.
 */
function deriveLegacyStatus(workflowStatus) {
  const normalized = String(workflowStatus || "draft").trim().toLowerCase();
  return WORKFLOW_STATUS_TO_LEGACY_STATUS[normalized] || "draft";
}

function isValidWorkflowStatus(workflowStatus) {
  return VALID_WORKFLOW_STATUSES.includes(String(workflowStatus || "").trim().toLowerCase());
}

/**
 * Bangun payload update yang menjaga `status` (legacy) tetap konsisten
 * dengan `workflow_status` (authoritative) — untuk dipakai di SETIAP tempat
 * yang menulis workflow_status pada RenjaDokumen (baik lewat
 * renjaGovernanceController.workflowAction() maupun jalur lain yang
 * ditemukan kelak).
 *
 * @param {string} nextWorkflowStatus - status tujuan (authoritative)
 * @param {object} [extra] - field tambahan lain yang mau ikut di-update
 *                           bersamaan (mis. document_phase, published_at)
 * @returns {object} payload siap dipakai row.update(...)
 */
function buildSyncedStatusPayload(nextWorkflowStatus, extra = {}) {
  if (!isValidWorkflowStatus(nextWorkflowStatus)) {
    throw new Error(
      `workflow_status tidak valid: "${nextWorkflowStatus}". Nilai valid: ${VALID_WORKFLOW_STATUSES.join(", ")}`,
    );
  }

  const workflow_status = String(nextWorkflowStatus).trim().toLowerCase();

  return {
    workflow_status,
    status: deriveLegacyStatus(workflow_status),
    ...extra,
  };
}

/**
 * Cek apakah baris RenjaDokumen desync (status legacy tidak sesuai hasil
 * derive dari workflow_status). Dipakai migrasi data & script audit —
 * TIDAK dipakai di jalur request runtime (biar tidak menambah query).
 */
function isDesynced(row) {
  const expectedLegacy = deriveLegacyStatus(row?.workflow_status);
  const actualLegacy = String(row?.status || "").trim().toLowerCase();
  return expectedLegacy !== actualLegacy;
}

/**
 * Peringkat kematangan workflow_status, dipakai untuk mencegah endpoint
 * legacy (mis. PUT /dokumen/:id yang menulis `status` langsung tanpa lewat
 * workflowGuardSvc) menurunkan workflow_status yang sudah lebih maju.
 */
const WORKFLOW_STATUS_RANK = Object.freeze({
  draft: 0,
  rejected: 0,
  submitted: 1,
  reviewed: 2,
  approved: 3,
  published: 4,
  archived: 5,
});

/**
 * PEMETAAN TERBALIK (best-effort, TIDAK presisi 1:1) legacy status ->
 * workflow_status minimum yang setara. Karena `status` legacy cuma 3 nilai
 * sementara workflow_status py 7, satu nilai legacy bisa berasal dari lebih
 * dari satu workflow_status (mis. status='review' bisa dari 'reviewed' ATAU
 * 'approved'). Dipakai HANYA sebagai jaring pengaman kompatibilitas di
 * endpoint legacy yang menulis `status` langsung (PUT /dokumen/:id) — bukan
 * pengganti mesin transisi resmi (renjaWorkflowGuardService). Tidak pernah
 * MENURUNKAN workflow_status yang sudah lebih maju dari hasil mapping ini.
 */
const LEGACY_STATUS_TO_MIN_WORKFLOW_STATUS = Object.freeze({
  draft: "draft",
  review: "reviewed",
  final: "published",
});

/**
 * Bangun payload untuk endpoint LEGACY yang menulis `status` (bukan
 * workflow_status) secara langsung — mis. PUT /dokumen/:id. Menjaga
 * workflow_status tidak mandek/desync TANPA melanggar mesin transisi resmi:
 * hanya menaikkan workflow_status jika hasil mapping legacy->workflow lebih
 * maju dari workflow_status yang sudah ada; kalau workflow_status sudah lebih
 * maju (mis. sudah 'published' lalu endpoint legacy menulis status='review'),
 * workflow_status TIDAK diturunkan — hanya `status` yang berubah sesuai
 * permintaan caller.
 *
 * @param {string} nextLegacyStatus - status tujuan (draft/review/final)
 * @param {string} currentWorkflowStatus - workflow_status baris saat ini
 * @param {object} [extra] - field tambahan lain
 */
function buildLegacyStatusWritePayload(nextLegacyStatus, currentWorkflowStatus, extra = {}) {
  const legacy = VALID_LEGACY_STATUSES.includes(String(nextLegacyStatus || "").trim().toLowerCase())
    ? String(nextLegacyStatus).trim().toLowerCase()
    : "draft";

  const suggestedWorkflow = LEGACY_STATUS_TO_MIN_WORKFLOW_STATUS[legacy] || "draft";
  const currentWorkflow = isValidWorkflowStatus(currentWorkflowStatus)
    ? String(currentWorkflowStatus).trim().toLowerCase()
    : "draft";

  const suggestedRank = WORKFLOW_STATUS_RANK[suggestedWorkflow] ?? 0;
  const currentRank = WORKFLOW_STATUS_RANK[currentWorkflow] ?? 0;

  const resolvedWorkflow = suggestedRank > currentRank ? suggestedWorkflow : currentWorkflow;

  return {
    status: legacy,
    workflow_status: resolvedWorkflow,
    ...extra,
  };
}

module.exports = {
  WORKFLOW_STATUS_TO_LEGACY_STATUS,
  LEGACY_STATUS_TO_MIN_WORKFLOW_STATUS,
  WORKFLOW_STATUS_RANK,
  VALID_WORKFLOW_STATUSES,
  VALID_LEGACY_STATUSES,
  deriveLegacyStatus,
  isValidWorkflowStatus,
  buildSyncedStatusPayload,
  buildLegacyStatusWritePayload,
  isDesynced,
};
