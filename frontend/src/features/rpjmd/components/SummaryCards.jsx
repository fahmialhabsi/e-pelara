import React from "react";
import { Row, Col, Card } from "react-bootstrap";

export default function SummaryCards({ data }) {
  return (
    <Row className="mb-3">
      <Col>
        <Card>
          <Card.Body>
            <h5>Total Program</h5>
            <p>{data.totalProgram}</p>
          </Card.Body>
        </Card>
      </Col>
      <Col>
        <Card>
          <Card.Body>
            <h5>Total Kegiatan</h5>
            <p>{data.totalKegiatan}</p>
          </Card.Body>
        </Card>
      </Col>
      <Col>
        <Card>
          <Card.Body>
            <h5>Rata-rata Pencapaian (%)</h5>
            <p>{data.avgAchievement}</p>
          </Card.Body>
        </Card>
      </Col>
      <Col>
        <Card>
          <Card.Body>
            <h5>Baseline vs Target</h5>
            <p>
              {data.baseline} vs {data.target}
            </p>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}
