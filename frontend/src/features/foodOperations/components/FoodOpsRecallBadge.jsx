import React from 'react';
import { Badge } from 'react-bootstrap';

// Evidence & Operasi Pangan — Phase 0 (mandat §35/§68). Murni presentasi
// provenance recall — TIDAK PERNAH auto-apply, hanya menampilkan "Data
// ditemukan dari X" agar user membuat keputusan eksplisit.
export function getConfidenceVariant(confidence) {
  return { HIGH: 'success', MEDIUM: 'warning', LOW: 'secondary', NONE: 'secondary' }[confidence] || 'secondary';
}

export default function FoodOpsRecallBadge({ envelope }) {
  if (!envelope) return null;
  const confidenceVariant = getConfidenceVariant(envelope.confidence);
  return (
    <div className="d-flex align-items-center gap-2 flex-wrap small">
      <Badge bg={confidenceVariant}>Data ditemukan dari {envelope.source_domain}</Badge>
      <span className="text-muted">
        Confidence: {envelope.confidence} · Authority: {envelope.authority}
        {envelope.requires_review && ' · Perlu ditinjau sebelum dipakai'}
      </span>
    </div>
  );
}
