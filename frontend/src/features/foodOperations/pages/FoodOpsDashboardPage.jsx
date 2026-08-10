import React, { useEffect, useState } from 'react';
import { Card, Col, Row, Spinner } from 'react-bootstrap';
import { getFoodOpsDocuments, getFoodOpsEvents, getFoodOpsRegulations } from '../services/foodOpsApi';

// Evidence & Operasi Pangan — Phase 0 Dashboard (mandat §44/§67). Sengaja
// minimal — hanya metrik yang bermakna dari data yang benar-benar ada,
// TIDAK ADA CPPD/MBG/Gudang/Laporan pada Phase 0 (mandat §48).
export default function FoodOpsDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalDocuments: 0, pendingVerification: 0, totalRegulations: 0, totalEvents: 0 });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [documents, regulations, events] = await Promise.all([getFoodOpsDocuments(), getFoodOpsRegulations(), getFoodOpsEvents()]);
        if (!active) return;
        setStats({
          totalDocuments: documents.length,
          pendingVerification: documents.filter((d) => d.status_verifikasi === 'uploaded' || d.status_verifikasi === 'needs_clarification').length,
          totalRegulations: regulations.length,
          totalEvents: events.length,
        });
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  if (loading) return <div className="p-4"><Spinner size="sm" /> Memuat…</div>;

  const cards = [
    { label: 'Total Dokumen', value: stats.totalDocuments },
    { label: 'Menunggu Verifikasi', value: stats.pendingVerification },
    { label: 'Total Regulasi', value: stats.totalRegulations },
    { label: 'Total Kegiatan', value: stats.totalEvents },
  ];

  return (
    <div className="p-3">
      <h4 className="mb-3">Evidence &amp; Operasi Pangan — Dashboard</h4>
      <Row className="g-3">
        {cards.map((c) => (
          <Col md={3} key={c.label}>
            <Card body className="text-center">
              <div className="fs-3 fw-bold">{c.value}</div>
              <div className="text-muted small">{c.label}</div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
