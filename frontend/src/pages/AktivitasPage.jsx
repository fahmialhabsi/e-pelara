// src/pages/AktivitasPage.js
import React from "react";
import { Container, Card } from "react-bootstrap";
import AktivitasPengguna from "../../pages/aktivitas/Modul3_AktivitasPengguna";

export default function AktivitasPage() {
  return (
    <Container>
      <Card className="mb-4">
        <Card.Header>
          <strong>Aktivitas Pengguna</strong>
        </Card.Header>
        <Card.Body>
          <AktivitasPengguna />
        </Card.Body>
      </Card>
    </Container>
  );
}
