// src/components/OpdList.js
import React, { useState, useEffect, useMemo } from "react";
import {
  Table,
  Button,
  Card,
  Spinner,
  Breadcrumb,
  InputGroup,
  Form,
  Pagination,
  Modal,
} from "react-bootstrap";
import { CSVLink } from "react-csv";
import * as XLSX from "xlsx";
import api from "../../services/api";
import { useNavigate } from "react-router-dom";
import OPDPenanggungJawabForm from "./OPDPenanggungJawabForm";

export default function OpdList() {
  const navigate = useNavigate();
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formKey, setFormKey] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await api.get("/opd-penanggung-jawab", {
          params: { page: 1, limit: 1000 },
        });
        setAllData(res.data.data || []);
      } catch (err) {
        console.error("Gagal memuat data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [showModal]);

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return allData.filter(
      (item) =>
        item.nama_opd.toLowerCase().includes(term) ||
        item.nama_bidang_opd.toLowerCase().includes(term) ||
        item.nama.toLowerCase().includes(term) ||
        item.nip.toLowerCase().includes(term) ||
        item.jabatan.toLowerCase().includes(term)
    );
  }, [allData, searchTerm]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const currentPageData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  const handleAdd = () => {
    setSelectedItem(null);
    setFormKey((k) => k + 1);
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setFormKey((k) => k + 1);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Yakin hapus data OPD ini?")) return;
    try {
      await api.delete(`/opd-penanggung-jawab/${id}`);
      setAllData((prev) => prev.filter((item) => item.id !== id));
    } catch {
      alert("Gagal menghapus data.");
    }
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      filtered.map((d) => ({
        "Nama OPD": d.nama_opd,
        "Bidang OPD": d.nama_bidang_opd,
        "Nama Pejabat": d.nama,
        NIP: d.nip,
        Jabatan: d.jabatan,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "OPD Penanggung Jawab");
    XLSX.writeFile(wb, "opd_penanggung_jawab.xlsx");
  };

  if (loading)
    return (
      <div className="text-center my-5">
        <Spinner animation="border" />
      </div>
    );

  return (
    <div className="container">
      <Breadcrumb className="mt-3">
        <Breadcrumb.Item onClick={() => navigate("/dashboard-rpjmd")}>
          Dashboard
        </Breadcrumb.Item>
        <Breadcrumb.Item active>OPD Penanggung Jawab</Breadcrumb.Item>
      </Breadcrumb>

      <Card className="mt-2 mb-4">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5>Daftar OPD Penanggung Jawab</h5>
            <div>
              <Button className="me-2" onClick={handleAdd}>
                Tambah
              </Button>
              <Button className="me-2" onClick={handleExportExcel}>
                Ekspor Excel
              </Button>
              <CSVLink
                data={filtered}
                filename="opd_penanggung_jawab.csv"
                className="btn btn-outline-secondary me-2"
              >
                Ekspor CSV
              </CSVLink>
              <Button onClick={() => navigate("/dashboard-rpjmd")}>
                Tutup
              </Button>
            </div>
          </div>

          <InputGroup className="mb-2">
            <Form.Control
              placeholder="Cari berdasarkan nama OPD, bidang, nama pejabat, NIP, atau jabatan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>

          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>#</th>
                <th>Nama OPD</th>
                <th>Bidang OPD</th>
                <th>Nama Pejabat</th>
                <th>NIP</th>
                <th>Jabatan</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {currentPageData.map((item, idx) => (
                <tr key={item.id}>
                  <td>{(page - 1) * pageSize + idx + 1}</td>
                  <td>{item.nama_opd}</td>
                  <td>{item.nama_bidang_opd}</td>
                  <td>{item.nama}</td>
                  <td>{item.nip}</td>
                  <td>{item.jabatan}</td>
                  <td>
                    <Button
                      size="sm"
                      variant="warning"
                      onClick={() => handleEdit(item)}
                      className="me-2"
                    >
                      Edit
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
              {currentPageData.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center">
                    Tidak ada data ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>

          <Pagination className="justify-content-center">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
              <Pagination.Item
                key={num}
                active={num === page}
                onClick={() => setPage(num)}
              >
                {num}
              </Pagination.Item>
            ))}
          </Pagination>
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedItem
              ? "Edit Penanggung Jawab OPD"
              : "Tambah Penanggung Jawab OPD"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <OPDPenanggungJawabForm
            key={formKey}
            selectedItem={selectedItem}
            onSave={() => setShowModal(false)}
          />
        </Modal.Body>
      </Modal>
    </div>
  );
}
