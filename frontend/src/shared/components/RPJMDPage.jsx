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
import api from "../../services/api";
import RPJMDForm from "../components/RPJMDForm";
import { useAuth } from "../../hooks/useAuth";

export default function RPJMDList() {
  const { user } = useAuth();
  const allowedRoles = ["SUPER_ADMIN", "ADMINISTRATOR"];
  const [list, setList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState("add");
  const [currentItem, setCurrentItem] = useState(null);

  useEffect(() => {
    fetchList();
  }, []);

  const fetchList = async () => {
    try {
      const res = await api.get("/rpjmd");
      setList(res.data);
    } catch (err) {
      console.error("Error fetching RPJMD list:", err);
      alert("Gagal memuat daftar RPJMD.");
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
    if (!window.confirm("Yakin ingin menghapus data RPJMD ini?")) return;
    try {
      await api.delete(`/rpjmd/${id}`);
      alert("RPJMD berhasil dihapus.");
      fetchList();
    } catch (err) {
      console.error("Failed to delete:", err);
      alert("Gagal menghapus RPJMD.");
    }
  };

  const handleClose = () => setShowModal(false);

  // Kirim data sebagai FormData agar file terupload
  const handleSubmit = async (data) => {
    try {
      const form = new FormData();
      // Append teks
      Object.entries(data).forEach(([key, value]) => {
        if (value !== null && !(value instanceof File)) {
          form.append(key, value);
        }
      });
      // Append file jika ada
      if (data.foto_kepala_daerah) {
        form.append("foto_kepala_daerah", data.foto_kepala_daerah);
      }
      if (data.foto_wakil_kepala_daerah) {
        form.append("foto_wakil_kepala_daerah", data.foto_wakil_kepala_daerah);
      }

      if (mode === "edit") {
        await api.put(`/rpjmd/${currentItem.id}`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        alert("RPJMD berhasil diperbarui.");
      } else {
        await api.post("/rpjmd/create", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        alert("RPJMD berhasil ditambahkan.");
      }
      fetchList();
      setShowModal(false);
    } catch (err) {
      console.error("Save error:", err);
      alert("Gagal menyimpan RPJMD.");
    }
  };

  if (!allowedRoles.includes(user?.role)) {
    return (
      <Container className="p-5 d-flex justify-content-center align-items-center">
        <Alert variant="danger" className="text-center w-100 fw-bold fs-5">
          ❌ Maaf, Anda tidak berwenang untuk membuka halaman RPJMD ini.
        </Alert>
      </Container>
    );
  }

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
          <RPJMDForm mode={mode} data={currentItem} onSubmit={handleSubmit} />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Tutup
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
