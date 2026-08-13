import React from 'react';
import { Badge } from 'react-bootstrap';

/**
 * Corrective "ProSN Semester-II Readiness — Cross-Module Metadata
 * Consistency / Explicit Override Marker" (mandat Req #9) — MURNI derived
 * state di frontend (TIDAK ADA kolom DB baru, mandat §11 "prefer transient/
 * derived state"): `baseline` adalah nilai PERSIS yg diisi otomatis dari
 * dokumen kanonis saat user klik "Gunakan" pada `PreBindEvidencePicker`
 * (disimpan di state lokal komponen pemanggil, BUKAN di server — canonical
 * source TIDAK PERNAH dimutasi oleh field ProSN ini, keduanya tabel
 * terpisah). Selama nilai form field masih PERSIS SAMA dgn baseline itu ->
 * "Dari Evidence" (source-derived). Begitu user mengetik nilai BERBEDA ->
 * "Override Pengguna" — TIDAK PERNAH direset otomatis (tidak ada mekanisme
 * background yg menjalankan ulang autofill field-field ini, beda dgn Sumber
 * Data yg punya `is_auto` server-side krn memang di-refresh berkala).
 * MURNI FUNGSI klasifikasi, testable tanpa render.
 */
export function classifyFieldProvenance(baseline, currentValue) {
  if (baseline === undefined || baseline === null || baseline === '') return 'MANUAL';
  const baselineStr = String(baseline).trim();
  const currentStr = String(currentValue ?? '').trim();
  return baselineStr === currentStr ? 'SOURCE' : 'OVERRIDE';
}

const LABEL = { SOURCE: 'Dari Evidence', OVERRIDE: 'Override Pengguna', MANUAL: null };
const VARIANT = { SOURCE: 'info', OVERRIDE: 'secondary' };

/** `baseline` undefined/null -> tidak render apa pun (field belum pernah diisi otomatis, murni manual — tidak perlu badge). */
export default function FieldProvenanceBadge({ baseline, currentValue, onReset }) {
  const state = classifyFieldProvenance(baseline, currentValue);
  if (state === 'MANUAL') return null;
  return (
    <Badge bg={VARIANT[state]} className="ms-2" style={{ fontWeight: 'normal', fontSize: '0.7em', verticalAlign: 'middle' }}>
      {LABEL[state]}
      {state === 'OVERRIDE' && onReset && (
        <Badge bg="link" as="button" type="button" onClick={onReset} className="ms-1 p-0 border-0 bg-transparent text-decoration-underline" style={{ cursor: 'pointer', color: 'inherit' }}>
          pulihkan
        </Badge>
      )}
    </Badge>
  );
}
