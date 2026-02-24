import React from "react";
import { Row, Col, Card, Carousel } from "react-bootstrap"; // Tambahkan impor Card dan Carousel

const VisiMisiCard = ({ visi, misiList }) => {
  return (
    <Row>
      <Col md={6} className="mb-4 mb-md-0">
        <Card className="h-100 shadow-sm">
          <Card.Header className="bg-primary text-white">
            Visi Singkat
          </Card.Header>
          <Card.Body>
            <Card.Text>{visi || "(Belum ada data visi)"}</Card.Text>
          </Card.Body>
        </Card>
      </Col>
      <Col md={6}>
        <Card className="h-100 shadow-sm">
          <Card.Header className="bg-primary text-white">
            Misi Utama
          </Card.Header>
          <Card.Body>
            {misiList.length > 0 ? (
              <Carousel
                indicators={false}
                controls={false}
                interval={4000}
                fade
              >
                {misiList.map((item) => (
                  <Carousel.Item key={item.id}>
                    <h6>
                      <strong>{item.id}.</strong> {item.isi_misi}
                    </h6>
                  </Carousel.Item>
                ))}
              </Carousel>
            ) : (
              <Card.Text>(Belum ada data misi)</Card.Text>
            )}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default VisiMisiCard;
