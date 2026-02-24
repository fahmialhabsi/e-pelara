// KPISection.jsx
import React from "react";
import { Card, Row, Col } from "react-bootstrap";

const KPISection = ({ data }) => {
  if (!data) return null;

  const kpis = [
    { label: "Jumlah Program", value: data.programs, variant: "primary" },
    { label: "Jumlah Kegiatan", value: data.activities, variant: "success" },
    { label: "Total Indikator", value: data.indicators, variant: "warning" },
  ];

  return (
    <Row>
      {kpis.map((kpi, idx) => (
        <Col key={idx} md={4} className="mb-3">
          <Card bg={kpi.variant} text="white" className="text-center shadow">
            <Card.Body>
              <Card.Title className="fs-4">{kpi.value}</Card.Title>
              <Card.Text>{kpi.label}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default KPISection;
