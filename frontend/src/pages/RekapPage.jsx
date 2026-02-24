// src/pages/RekapPage.js
import React from "react";
import { Container, Card } from "react-bootstrap";
import RekapStatistik from "../../pages/statistik/Modul2_RekapStatistik";

export default function RekapPage() {
  return (
    <Container>
      <Card className="mb-4">
        <Card.Header>
          <strong>Rekap Program & Kegiatan</strong>
        </Card.Header>
        <Card.Body>
          <RekapStatistik />
        </Card.Body>
      </Card>
    </Container>
  );
}
