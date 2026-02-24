import React, { useState } from "react";
import { Container, Row, Col, Nav, NavItem, NavLink } from "react-bootstrap";

import Dashboard from "../components/Dashboard";

const MainDashboard = () => {
  const [selectedTab, setSelectedTab] = useState("planning"); // Untuk menyimpan tab yang aktif

  return (
    <Container fluid>
      <Row>
        <Col
          xs={3}
          className="bg-dark text-white"
          style={{ height: "100vh", padding: "20px" }}
        >
          {/* Sidebar */}
          <Nav className="flex-column">
            <NavItem>
              <NavLink
                className={selectedTab === "planning" ? "active" : ""}
                onClick={() => setSelectedTab("planning")}
                style={{ color: "white", cursor: "pointer" }}
              >
                Perencanaan
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                className={selectedTab === "monitoring" ? "active" : ""}
                onClick={() => setSelectedTab("monitoring")}
                style={{ color: "white", cursor: "pointer" }}
              >
                Evaluasi/Monitoring
              </NavLink>
            </NavItem>
            {/* Menambahkan menu Dashboard */}
            <NavItem>
              <NavLink
                className={selectedTab === "dashboard" ? "active" : ""}
                onClick={() => setSelectedTab("dashboard")}
                style={{ color: "white", cursor: "pointer" }}
              >
                Dashboard
              </NavLink>
            </NavItem>
            {/* Menambahkan menu DashboardMonev */}
            <NavItem>
              <NavLink
                className={selectedTab === "dashboardMonev" ? "active" : ""}
                onClick={() => setSelectedTab("dashboardMonev")}
                style={{ color: "white", cursor: "pointer" }}
              >
                Dashboard Monev
              </NavLink>
            </NavItem>
            {/* Tambahkan menu lainnya sesuai kebutuhan */}
          </Nav>
        </Col>
        <Col xs={9} style={{ padding: "20px" }}>
          {/* Konten Utama */}

          {/* Tampilan untuk tab Dashboard */}
          {selectedTab === "dashboard" && <Dashboard />}
          {/* Tampilan untuk tab DashboardMonev */}

          {/* Tampilan untuk tab lainnya dapat ditambahkan sesuai kebutuhan */}
        </Col>
      </Row>
    </Container>
  );
};

export default MainDashboard;
