// src/components/Dashboard/HeaderSection.js
import React from "react";
import { Container, Row, Col, Image } from "react-bootstrap";
import api from "../../services/api";

const HeaderSection = ({ rpjmd }) => {
  const baseUrl = api.defaults.baseURL?.replace(/\/api$/, "") || "";
  const getSrc = (p) => (p?.startsWith("http") ? p : `${baseUrl}/uploads/${p}`);

  return (
    <section className="p-3 bg-white">
      <Container fluid>
        <Row className="text-center">
          <Col>
            <Image
              src={getSrc(rpjmd.foto_kepala_daerah)}
              roundedCircle
              width={80}
              height={80}
            />
            <div>
              <strong>{rpjmd.kepala_daerah}</strong>
            </div>
            <small>WISE PRINCESS</small>
          </Col>
          <Col>
            <h4>
              <strong>{rpjmd.akronim}</strong>
            </h4>
          </Col>
          <Col>
            <Image
              src={getSrc(rpjmd.foto_wakil_kepala_daerah)}
              roundedCircle
              width={80}
              height={80}
            />
            <div>
              <strong>{rpjmd.wakil_kepala_daerah}</strong>
            </div>
            <small>KNIGHTLY PRINCESS</small>
          </Col>
        </Row>
      </Container>
    </section>
  );
};

export default HeaderSection;
