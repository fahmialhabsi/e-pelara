// src/features/renstra/pages/RenstraDashboard.jsx
import { Card, CardBody, Row, Col } from "react-bootstrap";
import { useAuth } from "../../../hooks/useAuth";
import { useDokumen } from "../../../hooks/useDokumen";
import { Navigate } from "react-router-dom";

const quickStats = [
  { label: "Tujuan", value: 4, color: "primary" },
  { label: "Sasaran", value: 12, color: "success" },
  { label: "Program", value: 6, color: "info" },
  { label: "Kegiatan", value: 21, color: "warning" },
];

const RenstraDashboard = () => {
  const { dokumen, tahun } = useDokumen();
  const { user } = useAuth();

  if (!dokumen || !tahun) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <div className="mb-4">
        <h2 className="fw-bold text-primary mb-2">
          📊 Dashboard Renstra Dinas Pangan
        </h2>
      </div>

      {user && (
        <Card className="mb-3 shadow-sm border-0">
          <CardBody>
            <Row>
              <Col md={6}>
                <strong>Dokumen Aktif:</strong> {dokumen || "-"}
                <br />
                <strong>Periode:</strong> {tahun || "2025-2029"}
              </Col>
              <Col md={6}>
                <strong>User:</strong> {user.nama || user.email}
              </Col>
            </Row>
          </CardBody>
        </Card>
      )}

      {/* Statistik */}
      <Row className="mb-4">
        {quickStats.map((stat, idx) => (
          <Col key={idx} xs={6} md={3} className="mb-3">
            <Card className={`text-center shadow border-${stat.color}`}>
              <CardBody>
                <div className={`fs-3 fw-bold text-${stat.color}`}>
                  {stat.value}
                </div>
                <div className="text-muted">{stat.label}</div>
              </CardBody>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Info */}
      <Card className="shadow-sm border-0 mb-4">
        <CardBody className="bg-light">
          <div className="text-muted small">
            Dashboard ini dikembangkan untuk mendukung pengelolaan, monitoring,
            dan pelaporan Renstra Dinas Pangan Provinsi Maluku Utara.
            <br />
            <span className="fw-semibold">Kontak IT: </span>
            <a href="mailto:support@dinaspangan.com">support@dinaspangan.com</a>
          </div>
        </CardBody>
      </Card>
    </>
  );
};

export default RenstraDashboard;
