// src/components/Dashboard/VisiMisiSection.js
import React from "react";
import { Container, Row, Col, Card, Carousel } from "react-bootstrap";

const VisiMisiSection = ({ visi = "", misi = [] }) => (
  <section className="p-3">
    <Container fluid>
      <Row>
        <Col md={6}>
          <Card>
            <Card.Header>Visi</Card.Header>
            <Card.Body>
              {visi || <span className="text-muted">Belum ada visi</span>}
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card>
            <Card.Header>Misi</Card.Header>
            <Card.Body style={{ minHeight: "160px", position: "relative" }}>
              {Array.isArray(misi) && misi.length > 0 ? (
                <Carousel
                  fade
                  controls={false}
                  indicators={false}
                  interval={5000}
                  pause="hover"
                  slide={false}
                >
                  {misi.map((m) => (
                    <Carousel.Item key={m.id}>
                      <div className="d-flex h-100 align-items-center justify-content-center">
                        <blockquote className="blockquote text-center mb-0 px-3">
                          <p className="fs-5 fst-italic">“{m.isi_misi}”</p>
                        </blockquote>
                      </div>
                    </Carousel.Item>
                  ))}
                </Carousel>
              ) : (
                <div className="text-muted text-center">Belum ada misi</div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  </section>
);

export default VisiMisiSection;
