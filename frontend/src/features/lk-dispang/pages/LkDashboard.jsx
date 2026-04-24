/**
 * LkDashboard.jsx — Dashboard Laporan Keuangan Dinas (LKD)
 * Full-featured: filter, chart, tabel, export CSV/Excel
 */
import React from "react";
import { Container } from "react-bootstrap";
import { BarChart as BsBarChart } from "react-bootstrap-icons";
import LkdDashboardPanel from "../components/LkdDashboardPanel";

const LkDashboard = () => (
  <Container fluid className="py-4 px-3">
    <div className="d-flex align-items-center gap-2 mb-4">
      <BsBarChart size={28} className="text-primary" />
      <div>
        <h4 className="mb-0 fw-bold">Dashboard LKD</h4>
        <p className="mb-0 small text-muted">
          Laporan Keuangan Dinas Ketahanan Pangan — Anggaran &amp; Realisasi Real-Time
        </p>
      </div>
    </div>
    <LkdDashboardPanel />
  </Container>
);

export default LkDashboard;
