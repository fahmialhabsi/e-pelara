import React, { useContext } from "react";
import { Container, Row, Col, Card, Badge } from "react-bootstrap";
import NotificationPanel from "../../../shared/components/NotificationPanel";
import { NotificationContext } from "../../../contexts/NotificationProvider";
import CascadingFilter from "../../../pages/cascading/Modul1_CascadingView";
import RekapStatistik from "../../../pages/statistik/Modul2_RekapStatistik";
import AktivitasPengguna from "../../../pages/aktivitas/Modul3_AktivitasPengguna";
import DeadlinePanel from "../../../pages/notifications/Modul4_DeadlinePanel";
import { useAuth } from "../../../hooks/useAuth";

export default function DashboardRPJMD() {
  const { user } = useAuth();
  const { notifications } = useContext(NotificationContext);

  if (!["ADMINISTRATOR", "PENGAWAS"].includes(user?.role)) {
    return (
      <div className="d-flex justify-content-center align-items-center p-5">
        <Alert variant="danger" className="text-center w-100 fw-bold fs-5">
          ❌ Akses ditolak. Anda tidak memiliki izin untuk melihat dashboard
          monitoring RPJMD.
        </Alert>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Container fluid className="mt-3">
      <Row>
        <Col md={10}>
          <h2 className="text-dark mb-4">Dashboard Monitoring RPJMD</h2>

          {/* Modul 1: Cascading View */}
          <Card className="mb-4">
            <Card.Header>
              <strong>Keterkaitan RPJMD (Cascading View)</strong>
            </Card.Header>
            <Card.Body>
              {/* Provider for cascading filters should wrap this */}
              <CascadingFilter />
            </Card.Body>
          </Card>

          {/* Modul 2: Rekap Program & Kegiatan */}
          <Card className="mb-4">
            <Card.Header>
              <strong>Rekap Program & Kegiatan</strong>
            </Card.Header>
            <Card.Body>
              <RekapStatistik />
            </Card.Body>
          </Card>

          {/* Modul 3: Aktivitas Pengguna */}
          <Card className="mb-4">
            <Card.Header>
              <strong>Aktivitas Pengguna</strong>
            </Card.Header>
            <Card.Body>
              <AktivitasPengguna />
            </Card.Body>
          </Card>

          {/* Modul 4: Deadline & Notifikasi */}
          <Card className="mb-4">
            <Card.Header>
              <strong>Notifikasi & Tracking Deadline</strong>
              <Badge bg="danger" className="ms-2">
                {unreadCount}
              </Badge>
            </Card.Header>
            <Card.Body>
              <DeadlinePanel />
            </Card.Body>
          </Card>
        </Col>

        {/* Sidebar notifikasi */}
        <Col md={2} className="bg-light">
          <h5 className="mt-3">Notifikasi</h5>
          <NotificationPanel />
        </Col>
      </Row>
    </Container>
  );
}
