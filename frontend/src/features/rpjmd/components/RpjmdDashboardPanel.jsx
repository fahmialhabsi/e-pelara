import React from "react";
import { Card, Row, Col, Button } from "react-bootstrap";
import { NavLink } from "react-router-dom";
import {
  Eye,
  People,
  Flag,
  Bullseye,
  Lightbulb,
  BarChartLine,
  Diagram3,
  ClipboardCheck,
} from "react-bootstrap-icons";

const rpjmdMenu = [
  { label: "Visi", path: "/rpjmd/visi", icon: <Eye className="me-2" /> },
  { label: "Misi", path: "/rpjmd/misi", icon: <People className="me-2" /> },
  { label: "Tujuan", path: "/rpjmd/tujuan", icon: <Flag className="me-2" /> },
  {
    label: "Sasaran",
    path: "/rpjmd/sasaran",
    icon: <Bullseye className="me-2" />,
  },
  {
    label: "Strategi",
    path: "/rpjmd/strategi",
    icon: <Lightbulb className="me-2" />,
  },
  {
    label: "Arah Kebijakan",
    path: "/rpjmd/arah-kebijakan",
    icon: <BarChartLine className="me-2" />,
  },
  {
    label: "Prioritas Nasional",
    path: "/rpjmd/prioritas-nasional",
    icon: <Diagram3 className="me-2" />,
  },
  {
    label: "Prioritas Daerah",
    path: "/rpjmd/prioritas-daerah",
    icon: <Diagram3 className="me-2" />,
  },
  {
    label: "Prioritas Gubernur",
    path: "/rpjmd/prioritas-gubernur",
    icon: <Diagram3 className="me-2" />,
  },
  {
    label: "Program",
    path: "/rpjmd/program",
    icon: <ClipboardCheck className="me-2" />,
  },
  {
    label: "Kegiatan",
    path: "/rpjmd/kegiatan",
    icon: <ClipboardCheck className="me-2" />,
  },
  {
    label: "Sub Kegiatan",
    path: "/rpjmd/sub-kegiatan",
    icon: <ClipboardCheck className="me-2" />,
  },
  // Tambahkan jika ada entitas lain
];

const RpjmdDashboardPanel = () => (
  <Card className="mb-4 shadow-sm border-0">
    <Card.Header as="h5" className="bg-primary text-white">
      🚀 Panel Pengelolaan Data RPJMD
    </Card.Header>
    <Card.Body>
      <Row className="g-3">
        {rpjmdMenu.map((item, idx) => (
          <Col xs={12} sm={6} md={4} lg={3} key={idx}>
            <Button
              as={NavLink}
              to={item.path}
              variant="outline-primary"
              className="w-100 d-flex align-items-center justify-content-center"
              size="lg"
            >
              {item.icon}
              <span>{item.label}</span>
            </Button>
          </Col>
        ))}
      </Row>
    </Card.Body>
  </Card>
);

export default RpjmdDashboardPanel;
