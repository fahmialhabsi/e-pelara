import React from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Badge,
  ProgressBar,
} from "react-bootstrap";
import {
  HouseDoor,
  BarChart,
  ClipboardCheck,
  GraphUp,
  PersonCircle,
  InfoCircle,
  People,
} from "react-bootstrap-icons";
import { useAuth } from "./contexts/AuthContext";
import { useDokumen } from "./contexts/DokumenContext";
// Chart
import { Line } from "react-chartjs-2";
import "chart.js/auto"; // untuk chartjs v3+

const menu = [
  {
    label: "Dashboard",
    path: "/",
    icon: <HouseDoor className="me-2" />,
    end: true,
  },
  {
    label: "RPJMD",
    path: "/dashboard-rpjmd",
    icon: <BarChart className="me-2" />,
  },
  {
    label: "Renstra",
    path: "/dashboard-renstra",
    icon: <GraphUp className="me-2" />,
  },
  {
    label: "RKPD",
    path: "/dashboard-rkpd",
    icon: <ClipboardCheck className="me-2" />,
  },
  {
    label: "Renja",
    path: "/dashboard-renja",
    icon: <ClipboardCheck className="me-2" />,
  },
  {
    label: "RKA",
    path: "/dashboard-rka",
    icon: <ClipboardCheck className="me-2" />,
  },
  {
    label: "DPA",
    path: "/dashboard-dpa",
    icon: <ClipboardCheck className="me-2" />,
  },
  // ...lanjutkan menu lain
];

// Statistik Dummy - ganti dengan fetch API sesuai kebutuhan
const stats = [
  {
    icon: <BarChart className="fs-3 text-primary" />,
    value: 12,
    label: "Total Dokumen",
    variant: "primary",
  },
  {
    icon: <ClipboardCheck className="fs-3 text-success" />,
    value: 3,
    label: "RPJMD Aktif",
    variant: "success",
  },
  {
    icon: <GraphUp className="fs-3 text-warning" />,
    value: "86%",
    label: "Rata-rata Progres",
    variant: "warning",
  },
  {
    icon: <People className="fs-3 text-info" />,
    value: 42,
    label: "Total Pengguna",
    variant: "info",
  },
];

const chartData = {
  labels: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun"],
  datasets: [
    {
      label: "Kinerja (%)",
      data: [80, 82, 85, 86, 90, 91],
      borderColor: "#2a9d8f",
      backgroundColor: "rgba(42,157,143,0.1)",
      fill: true,
      tension: 0.4,
    },
  ],
};

const WelcomeHeader = ({ user }) => (
  <div className="d-flex align-items-center mb-4">
    <PersonCircle size={50} className="me-3 text-primary" />
    <div>
      <h4 className="mb-0 fw-bold">
        Selamat datang, {user?.username || "Pengguna"}!
      </h4>
      <div className="text-muted">
        <small>
          Role: <Badge bg="info">{user?.role || "-"}</Badge> | Dokumen aktif:{" "}
          <Badge bg="success">{user?.jenis_dokumen || "-"}</Badge> | Tahun:{" "}
          <Badge bg="secondary">{user?.tahun || "-"}</Badge>
        </small>
      </div>
    </div>
  </div>
);

const QuickActions = () => (
  <Card className="shadow-sm mb-4 border-0">
    <Card.Body className="d-flex gap-3 flex-wrap">
      <Button variant="outline-primary" className="d-flex align-items-center">
        <BarChart className="me-2" /> Input Rencana Baru
      </Button>
      <Button variant="outline-success" className="d-flex align-items-center">
        <ClipboardCheck className="me-2" /> Lihat Realisasi
      </Button>
      <Button variant="outline-warning" className="d-flex align-items-center">
        <GraphUp className="me-2" /> Statistik Kinerja
      </Button>
      {/* Tambahkan lagi jika perlu */}
    </Card.Body>
  </Card>
);

const StatsCards = () => (
  <Row className="g-4 mb-4">
    {stats.map((item, i) => (
      <Col md={3} sm={6} key={i}>
        <Card className={`shadow-sm border-0 text-center bg-light`}>
          <Card.Body>
            <div className="mb-2">{item.icon}</div>
            <div className={`fw-bold fs-3 text-${item.variant}`}>
              {item.value}
            </div>
            <div className="text-muted">{item.label}</div>
            {item.label === "Rata-rata Progres" && (
              <ProgressBar
                now={86}
                label="86%"
                variant={item.variant}
                className="mt-2"
              />
            )}
          </Card.Body>
        </Card>
      </Col>
    ))}
  </Row>
);

const ChartPanel = () => (
  <Card className="shadow-sm mb-4 border-0">
    <Card.Body>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h5 className="fw-bold mb-0">📈 Tren Kinerja Tahun Berjalan</h5>
        <Button size="sm" variant="outline-secondary">
          <InfoCircle className="me-1" /> Detail
        </Button>
      </div>
      <div style={{ minHeight: 240 }}>
        <Line data={chartData} />
      </div>
    </Card.Body>
  </Card>
);

const AnnouncementPanel = () => (
  <Card className="shadow-sm mb-4 border-info border-2">
    <Card.Body>
      <div className="d-flex align-items-center mb-2">
        <InfoCircle className="me-2 text-info" size={22} />
        <span className="fw-bold text-info">Informasi Penting</span>
      </div>
      <div className="small">
        Sistem akan maintenance pada 31 Juni 2024, jam 23.00 – 24.00.
        <br />
        Hubungi <a href="mailto:support@dinaspangan.com">IT Support</a> jika ada
        kendala.
      </div>
    </Card.Body>
  </Card>
);

const MyDashboard = () => {
  const { user } = useAuth();
  const { dokumen, tahun } = useDokumen();
  const location = useLocation();

  console.log("DEBUG SIDEBAR", { dokumen, tahun, user });

  // isHome true jika sedang di "/"
  const isHome = location.pathname === "/" || location.pathname === "";

  return (
    <div className="d-flex min-vh-100 bg-light">
      {/* Sidebar */}
      <aside
        className="d-flex flex-column flex-shrink-0 p-3 bg-dark text-white"
        style={{ width: 230 }}
      >
        <div className="fs-4 mb-4 fw-bold text-center">
          e-PLANNING DISPANG MALUT
        </div>
        <ul className="nav nav-pills flex-column mb-auto">
          {menu.map((item) => {
            const locked = (!dokumen || !tahun) && item.path !== "/";
            // Tambah log di sini:
            console.log(
              `[MENU] ${item.label} | locked? ${locked} | dokumen: "${dokumen}", tahun: "${tahun}"`
            );
            return (
              <li className="nav-item" key={item.path}>
                {locked ? (
                  <span
                    tabIndex={-1}
                    className="nav-link d-flex align-items-center mb-1 disabled text-muted"
                    style={{
                      opacity: 0.5,
                      cursor: "not-allowed",
                      userSelect: "none",
                      pointerEvents: "auto",
                    }}
                    title="Silakan pilih jenis dokumen dan tahun dulu"
                  >
                    {item.icon}
                    {item.label}
                  </span>
                ) : (
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      "nav-link d-flex align-items-center mb-1" +
                      (isActive &&
                      item.path !== "/" &&
                      location.pathname === item.path
                        ? " active bg-primary text-white"
                        : " text-white-50")
                    }
                    end={item.end}
                  >
                    {item.icon}
                    {item.label}
                  </NavLink>
                )}
              </li>
            );
          })}
        </ul>

        <hr className="border-secondary" />
        <div className="small mt-auto text-center">
          <span className="text-muted">Login sebagai:</span>
          <br />
          <span className="fw-bold">{user?.username || "-"}</span>
        </div>
      </aside>

      {/* Main Dashboard Content */}
      <main className="flex-grow-1 bg-light" style={{ minHeight: "100vh" }}>
        <Container fluid className="py-4">
          {isHome && (
            <>
              <WelcomeHeader user={user} />
              <StatsCards />
              <QuickActions />
              <ChartPanel />
              <AnnouncementPanel />
            </>
          )}
          {!isHome && <Outlet />}
        </Container>
      </main>
    </div>
  );
};

export default MyDashboard;
