/**
 * FINAL CLOSURE MANDATE — Req #21 "Distinct Evidence State Classification".
 * MURNI FUNGSI (testable tanpa render), TIDAK menyentuh `explainableScore.js`
 * (gapType REQUIREMENT_GAP/EVIDENCE_GAP/VALIDATION_GAP tetap seperti sebelumnya
 * — mandat "Explainable score UNCHANGED except Req #21-specific refinement").
 * Ini adalah lapisan TERPISAH: klasifikasi status SATU record bukti (bukan
 * status skor keseluruhan), memakai HANYA field yang SUDAH ada di
 * `ProsnBuktiDukung` (mandat: "do not invent statuses that don't exist in
 * models"): `status` ENUM('aktif','perlu_perbaikan','digantikan','dibatalkan')
 * dan `status_verifikasi` ENUM('uploaded','valid','invalid',
 * 'needs_clarification','duplicate','expired').
 *
 * Mapping deterministik ke 4 state kanonis mandat:
 *   MISSING            — tidak ada record bukti sama sekali utk syarat ini.
 *   PRESENT_NOT_VALID   — record ada, masih aktif, tapi verifikasi belum
 *                         selesai/belum valid (uploaded / needs_clarification
 *                         / perlu_perbaikan).
 *   REJECTED            — record ada, verifikasi SUDAH selesai dgn hasil
 *                         negatif (invalid / duplicate / expired), ATAU
 *                         dibatalkan scr eksplisit oleh pengguna.
 *   SUPERSEDED          — record sudah digantikan versi lebih baru
 *                         (status='digantikan', append-only lineage via
 *                         `menggantikan_bukti_id`).
 *   null                — record ada DAN sudah valid -> tidak ada gap sama
 *                         sekali, tidak perlu ditampilkan sbg state apa pun.
 */

const REJECTED_STATUS_VERIFIKASI = new Set(['invalid', 'duplicate', 'expired']);
const PENDING_STATUS_VERIFIKASI = new Set(['uploaded', 'needs_clarification']);

export function classifyEvidenceState(bukti) {
  if (!bukti) return 'MISSING';
  if (bukti.status === 'digantikan') return 'SUPERSEDED';
  if (bukti.status === 'dibatalkan') return 'REJECTED';
  if (bukti.status_verifikasi === 'valid') return null;
  if (REJECTED_STATUS_VERIFIKASI.has(bukti.status_verifikasi)) return 'REJECTED';
  if (PENDING_STATUS_VERIFIKASI.has(bukti.status_verifikasi)) return 'PRESENT_NOT_VALID';
  // status='perlu_perbaikan' atau kombinasi lain yang belum eksplisit valid ->
  // tetap dianggap belum valid (aman: tidak pernah diam-diam dianggap OK).
  return 'PRESENT_NOT_VALID';
}

export const EVIDENCE_STATE_LABEL = {
  MISSING: 'Belum Tersedia',
  PRESENT_NOT_VALID: 'Belum Valid',
  REJECTED: 'Ditolak/Tidak Valid',
  SUPERSEDED: 'Digantikan',
};

/** Teks jelas per-state (mandat §21 contoh persis: "Notulen belum tersedia.", dst.) — TIDAK PERNAH generik "EVIDENCE_GAP". */
export function evidenceStateMessage(state, label) {
  const l = label || 'Bukti';
  switch (state) {
    case 'MISSING': return `${l} belum tersedia.`;
    case 'PRESENT_NOT_VALID': return `${l} tersedia tetapi belum Valid.`;
    case 'REJECTED': return `${l} ditolak/tidak valid.`;
    case 'SUPERSEDED': return `${l} telah digantikan oleh versi yang lebih baru.`;
    default: return null;
  }
}
