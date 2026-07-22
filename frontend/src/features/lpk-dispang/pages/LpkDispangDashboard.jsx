// src/features/lpk-dispang/pages/LpkDispangDashboard.jsx
import React from 'react';
import { Card, Badge } from 'react-bootstrap';
import { ClipboardData } from 'react-bootstrap-icons';
import { useDokumen } from '../../../hooks/useDokumen';
import RealisasiKinerjaTerpadu from '../components/RealisasiKinerjaTerpadu';

const LpkDispangDashboard = () => {
  const { tahun } = useDokumen();

  return (
    <Card className="shadow-sm border-0">
      <Card.Header className="bg-primary text-white d-flex align-items-center gap-2 py-3">
        <ClipboardData size={20} />
        <span className="fw-bold">Dashboard Laporan Pengelolaan Kegiatan</span>
        {tahun && (
          <Badge bg="light" text="primary" className="ms-auto">
            Tahun {tahun}
          </Badge>
        )}
      </Card.Header>
      <Card.Body>
        <RealisasiKinerjaTerpadu />
      </Card.Body>
    </Card>
  );
};

export default LpkDispangDashboard;
