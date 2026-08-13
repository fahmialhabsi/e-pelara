import React, { useEffect, useState } from 'react';
import { Badge, Button, ListGroup } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { getFoodOpsEvidenceCandidates } from '../services/foodOpsApi';
import { CANDIDATE_RELEVANCE_LABEL, CANDIDATE_RELEVANCE_VARIANT, DOCUMENT_TYPE_LABEL, STATUS_VERIFIKASI_LABEL } from '../services/foodOpsConstants';

/**
 * Evidence & Operasi Pangan — Phase 1 (mandat §25-§27 "Evidence Candidate
 * UX"). Sistem HANYA mengusulkan (recall-first, mandat §24) — TIDAK PERNAH
 * auto-link (mandat §64). Pengguna wajib eksplisit klik "Gunakan/Tautkan".
 *
 * CORRECTIVE MANDATE UAT-01D — `findCandidates` (backend) SUDAH SEJAK Req #1
 * menghitung `already_bound` per kandidat (identitas kanonis
 * food_ops_document_id, tenant+entity_type+entity_id-scoped), tapi field ini
 * TIDAK PERNAH dibaca di sini — tombol "Gunakan/Tautkan" selalu dirender
 * tanpa syarat, membuat dokumen yg SUDAH tertaut ke target yang SAMA tetap
 * terlihat bisa ditautkan lagi (relevansinya bahkan naik jadi EXACT/"Cocok
 * Persis" krn identityMatch, justru makin meyakinkan secara visual — akar
 * defect Owner UAT-01D). Relevansi (seberapa cocok) dan status tertaut
 * (apakah sudah dipakai utk target ini) adalah DUA konsep terpisah — badge
 * relevansi tetap tampil, hanya AKSI-nya yang berubah saat already_bound.
 */
export default function FoodOpsEvidenceCandidatePanel({ criteria, onUse, onResult }) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getFoodOpsEvidenceCandidates(criteria)
      .then((rows) => {
        if (!active) return;
        setCandidates(rows);
        onResult?.(rows);
      })
      .catch(() => {
        if (!active) return;
        toast.error('Gagal mencari kandidat evidence.');
        onResult?.([]);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(criteria)]);

  if (loading) return <div className="text-muted small p-2">Mencari kandidat evidence…</div>;
  if (!candidates.length) return <div className="text-muted small p-2">Tidak ditemukan dokumen yang cocok di Evidence &amp; Operasi Pangan.</div>;

  return (
    <ListGroup>
      {candidates.map((c) => (
        <ListGroup.Item key={c.document_id} className="d-flex justify-content-between align-items-start flex-wrap gap-2">
          <div>
            <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
              <Badge bg={CANDIDATE_RELEVANCE_VARIANT[c.relevance] || 'secondary'}>{CANDIDATE_RELEVANCE_LABEL[c.relevance] || c.relevance}</Badge>
              <strong>{c.judul}</strong>
            </div>
            <div className="small text-muted">
              {DOCUMENT_TYPE_LABEL[c.document_type] || c.document_type} · {c.tanggal_dokumen || 'tanggal tidak diketahui'} · Verifikasi: {STATUS_VERIFIKASI_LABEL[c.verification_status] || c.verification_status}
              {c.authority_level && <> · Authority: {c.authority_level}</>}
              {c.requires_review && <span className="text-warning"> · Perlu ditinjau</span>}
            </div>
            <ul className="small text-muted mb-0 mt-1">
              {c.reasons.map((reason, index) => <li key={index}>{reason}</li>)}
            </ul>
          </div>
          <div className="d-flex gap-1">
            {c.already_bound ? (
              <Badge bg="secondary">Sudah Ditautkan</Badge>
            ) : (
              <Button size="sm" onClick={() => onUse(c)}>Gunakan/Tautkan</Button>
            )}
          </div>
        </ListGroup.Item>
      ))}
    </ListGroup>
  );
}
