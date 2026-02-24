// src/components/Layout.js
import { Container, Row, Col, Nav } from "react-bootstrap";
import Header from "./Header";
import { Outlet, Link } from "react-router-dom";

export default function Layout() {
  return (
    <>
      <Header />
      <Container fluid>
        <Row>
          <Col md={2} className="bg-light vh-100">
            <Nav defaultActiveKey="/keterkaitan" className="flex-column">
              <Nav.Link as={Link} to="/">
                Beranda
              </Nav.Link>
              <Nav.Link as={Link} to="keterkaitan">
                Keterkaitan RPJMD
              </Nav.Link>
              <Nav.Link as={Link} to="rekap">
                Rekap Program
              </Nav.Link>
              <Nav.Link as={Link} to="aktivitas">
                Aktivitas Pengguna
              </Nav.Link>
              <Nav.Link as={Link} to="notifikasi">
                Notifikasi & Deadline
              </Nav.Link>
              <Nav.Link as={Link} to="settings">
                Pengaturan
              </Nav.Link>
            </Nav>
          </Col>
          <Col md={10} className="p-4">
            <Outlet /> {/* Area Konten Dinamis */}
          </Col>
        </Row>
      </Container>
    </>
  );
}
