// src/components/RPJMDList.js
import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Modal,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import RPJMDForm from "./RPJMDForm";
import { normalizeListItems } from "@/utils/apiResponse";

export default function RPJMDList() {
  const [list, setList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState("add");
  const [currentItem, setCurrentItem] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchList();
  }, []);

  const fetchList = async () => {
    try {
      const res = await api.get("/rpjmd");
      setList(normalizeListItems(res.data));
    } catch (err) {
      console.error("Error fetching RPJMD list:", err);
    }
  };

  const handleAdd = () => {
    setMode("add");
    setCurrentItem(null);
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setMode("edit");
    setCurrentItem(item);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Yakin ingin menghapus data RPJMD ini?")) {
      try {
        await api.delete(`/rpjmd/${id}`);
        fetchList();
      } catch (err) {
        console.error("Failed to delete:", err);
      }
    }
  };

  const handleClose = () => {
    setShowModal(false);
    navigate("/");
  };

  const handleSubmit = async (data) => {
    try {
      if (mode === "edit") await api.put(`/rpjmd/${currentItem.id}`, data);
      else await api.post("/rpjmd", data);
      fetchList();
      setShowModal(false);
      navigate("/");
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  return (
    <Container className="mt-4">
      <Row className="mb-3 align-items-center">
        <Col>
          <h4>Daftar RPJMD Provinsi</h4>
        </Col>
        <Col className="text-end">
          <Button variant="primary" onClick={handleAdd}>
            Tambah RPJMD
          </Button>
        </Col>
      </Row>

      <Card>
        <Card.Body>
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Tema</th>
                <th>Kepala Daerah</th>
                <th>Wakil Kepala</th>
                <th>Periode Awal</th>
                <th>Periode Akhir</th>
                <th>Tahun Penetapan</th>
                <th>Akronim</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {list.map((item) => (
                <tr key={item.id}>
                  <td>{item.nama_rpjmd}</td>
                  <td>{item.kepala_daerah}</td>
                  <td>{item.wakil_kepala_daerah}</td>
                  <td>{item.periode_awal}</td>
                  <td>{item.periode_akhir}</td>
                  <td>{item.tahun_penetapan}</td>
                  <td>{item.akronim}</td>
                  <td>
                    <Button
                      size="sm"
                      variant="info"
                      onClick={() => handleEdit(item)}
                      className="me-2"
                    >
                      Ubah
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(item.id)}
                    >
                      Hapus
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={handleClose} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {mode === "edit" ? "Ubah RPJMD" : "Tambah RPJMD"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <RPJMDForm
            mode={mode}
            data={currentItem}
            onSubmit={handleSubmit}
            onCancel={handleClose}
          />
          <div className="text-end mt-3">
            <Button variant="secondary" onClick={handleClose}>
              Close
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </Container>
  );
}
