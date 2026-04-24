/**
 * LAKIPDashboard.jsx
 * Dashboard LAKIP/LKj — entri data + generator dokumen
 */
import React from "react";
import { Container, Row, Col, Card } from "react-bootstrap";
import { FileEarmarkText } from "react-bootstrap-icons";
import LakipGeneratorPanel from "../components/LakipGeneratorPanel";

const LAKIPDashboard = () => {
  return (
    <Container fluid className="py-4 px-3">
      <div className="d-flex align-items-center gap-2 mb-4">
        <FileEarmarkText size={28} className="text-primary" />
        <div>
          <h4 className="mb-0 fw-bold">LAKIP / LKj</h4>
          <p className="mb-0 small text-muted">
            Laporan Akuntabilitas Kinerja Instansi Pemerintah
          </p>
        </div>
      </div>

      <Row className="g-4">
        <Col md={12}>
          <LakipGeneratorPanel />
        </Col>
      </Row>

      <Row className="g-4 mt-1">
        <Col md={12}>
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-light fw-semibold py-2 small">
              📋 Tentang LAKIP/LKj
            </Card.Header>
            <Card.Body className="small text-muted" style={{ lineHeight: 1.8 }}>
              <p>
                <strong>LAKIP (Laporan Akuntabilitas Kinerja Instansi Pemerintah)</strong> atau
                yang kini lebih dikenal sebagai <strong>LKj (Laporan Kinerja)</strong> adalah
                dokumen pertanggungjawaban OPD atas penggunaan anggaran dan pencapaian
                target kinerja selama satu tahun anggaran.
              </p>
              <p><strong>Dasar Hukum:</strong></p>
              <ul>
                <li>Perpres No. 29 Tahun 2014 tentang SAKIP</li>
                <li>PermenpanRB No. 53 Tahun 2014 tentang Petunjuk Teknis Perjanjian Kinerja</li>
                <li>PermenpanRB No. 88 Tahun 2021 tentang Evaluasi AKIP</li>
              </ul>
              <p>
                Gunakan tombol <strong>Preview LAKIP</strong> di atas untuk membuka laporan
                dalam format HTML yang siap dicetak. Gunakan <em>File → Print → Save as PDF</em>
                di browser untuk menghasilkan file PDF.
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default LAKIPDashboard;
