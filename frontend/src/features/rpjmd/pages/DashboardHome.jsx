import React, { useEffect, useState } from "react";
import {
  Card,
  Row,
  Col,
  Container,
  Spinner,
  Alert,
  Button,
} from "react-bootstrap";
import { useAuth } from "../../../hooks/useAuth";
import { useRequireDokumenTahun } from "../../../hooks/useRequireDokumenTahun.jsx";
import TrendChart from "../components/TrendChart";
import api from "../../../services/api";
import { extractSingleData } from "@/utils/apiResponse";

const DashboardHome = () => {
  const { user, logout } = useAuth();
  const { isReady, GuardModal } = useRequireDokumenTahun(); // ✅ Gunakan hook ini
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isReady) return; // ✅ Jangan fetch data kalau belum siap
    const fetchKinerja = async () => {
      try {
        const res = await api.get("/kinerja-rpjmd");
        setChartData(extractSingleData(res.data));
      } catch (e) {
        console.error("Gagal memuat tren kinerja", e);
        setError("Gagal memuat tren kinerja RPJMD");
      } finally {
        setLoading(false);
      }
    };
    fetchKinerja();
  }, [isReady]); // ✅ Jalankan hanya setelah dokumen & tahun tersedia

  return (
    <>
      {GuardModal}
      <Container fluid className="pt-2 pb-4 px-4 min-vh-100">
        <Row className="mt-0 pt-0 mb-3">
          <Col className="d-flex justify-content-between align-items-center">
            <div>
              <h3 className="fw-bold mb-2">
                🏠 Selamat datang, {user?.username || "Pengguna"}!
              </h3>
              <p>
                Anda login sebagai: <strong>{user?.role}</strong>
              </p>
            </div>
            <Button variant="danger" onClick={logout}>
              Keluar
            </Button>
          </Col>
        </Row>

        {!isReady && (
          <Alert variant="info">
            Silakan pilih jenis dokumen &amp; tahun terlebih dahulu.
          </Alert>
        )}

        {isReady && (
          <>
            <Row className="g-4 mb-4">
              {/* Kartu info */}
              {/* ... */}
            </Row>

            <Card className="shadow-sm border-0">
              <Card.Body>
                <h5 className="fw-bold mb-3">📈 Grafik Tren Kinerja</h5>
                {loading ? (
                  <Spinner animation="border" />
                ) : error ? (
                  <Alert variant="danger">{error}</Alert>
                ) : (
                  <TrendChart data={chartData} />
                )}
              </Card.Body>
            </Card>
          </>
        )}
      </Container>
    </>
  );
};

export default DashboardHome;
