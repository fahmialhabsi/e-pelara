// src/shared/components/OPDPenanggungJawabForm.jsx
import React, { useState, useEffect } from "react";
import {
  Form,
  Button,
  Card,
  Row,
  Col,
  Spinner,
  Alert,
  ButtonGroup,
} from "react-bootstrap";
import api from "../../services/api";
import { useNavigate } from "react-router-dom";

export default function OPDPenanggungJawabForm({
  selectedItem,
  onSave = () => {},
}) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nama_opd: "",
    nama_bidang_opd: "",
    nama: "",
    nip: "",
    jabatan: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (selectedItem) {
      setFormData({
        nama_opd: selectedItem.nama_opd || "",
        nama_bidang_opd: selectedItem.nama_bidang_opd || "",
        nama: selectedItem.nama || "",
        nip: selectedItem.nip || "",
        jabatan: selectedItem.jabatan || "",
      });
    } else {
      setFormData({
        nama_opd: "",
        nama_bidang_opd: "",
        nama: "",
        nip: "",
        jabatan: "",
      });
    }
  }, [selectedItem]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (selectedItem) {
        await api.put(`/opd-penanggung-jawab/${selectedItem.id}`, formData);
      } else {
        await api.post("/opd-penanggung-jawab", formData);
      }
      onSave(); // Ini seharusnya merefresh data OPD di seluruh app jika diimplementasikan dengan benar
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Gagal menyimpan data.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoToList = () => {
    navigate("/opd-list");
  };

  return (
    <Card>
      <Card.Body>
        <Card.Title>
          {selectedItem ? "Edit" : "Tambah"} Penanggung Jawab OPD
        </Card.Title>
        {error && <Alert variant="danger">{error}</Alert>}
        <Form onSubmit={handleSubmit}>
          <Row className="mb-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Nama OPD</Form.Label>
                <Form.Control
                  name="nama_opd"
                  value={formData.nama_opd}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Bidang OPD</Form.Label>
                <Form.Control
                  name="nama_bidang_opd"
                  value={formData.nama_bidang_opd}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Nama Penanggung Jawab</Form.Label>
                <Form.Control
                  name="nama"
                  value={formData.nama}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>NIP</Form.Label>
                <Form.Control
                  name="nip"
                  value={formData.nip}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-4">
            <Form.Label>Jabatan</Form.Label>
            <Form.Control
              name="jabatan"
              value={formData.jabatan}
              onChange={handleChange}
              required
            />
          </Form.Group>

          <ButtonGroup className="w-100">
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? <Spinner size="sm" animation="border" /> : "Simpan"}
            </Button>
            <Button variant="secondary" onClick={handleGoToList}>
              Daftar OPD
            </Button>
          </ButtonGroup>
        </Form>
      </Card.Body>
    </Card>
  );
}
