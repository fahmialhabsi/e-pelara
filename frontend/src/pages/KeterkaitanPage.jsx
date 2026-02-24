// src/pages/KeterkaitanPage.js
import React from "react";
import { Container, Card } from "react-bootstrap";
import Modul1CascadingView from "../pages/cascading/Modul1_CascadingView";
import { FilterContext } from "../contexts/FilterContext";
// 👈 pastikan path benar

export default function KeterkaitanPage() {
  return (
    <FilterContext>
      <Container>
        <Card className="mb-4">
          <Card.Header>
            <strong>Keterkaitan RPJMD (Cascading View)</strong>
          </Card.Header>
          <Card.Body>
            <Modul1CascadingView />
          </Card.Body>
        </Card>
      </Container>
    </FilterContext>
  );
}
