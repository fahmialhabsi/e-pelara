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
} from "react-bootstrap";
import { CSVLink } from "react-csv";
import * as XLSX from "xlsx";
import api from "../../services/api";
import { useNavigate } from "react-router-dom";
import { usePeriodeAktif } from "../../features/rpjmd/hooks/usePeriodeAktif";
import PrioritasDaerahForm from "./PrioritasDaerahForm";
import { Modal } from "react-bootstrap";

export default function PrioritasDaerahList() {
  const navigate = useNavigate();
  const { dokumen, tahun, loading: periodeLoading } = usePeriodeAktif();
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formKey, setFormKey] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      if (periodeLoading || !dokumen || !tahun) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.get("/prioritas-daerah", {
          params: { page: 1, limit: 1000, jenis_dokumen: dokumen, tahun },
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
        item.kode_prioda?.toLowerCase().includes(term) ||
        item.nama_prioda?.toLowerCase().includes(term) ||
        item.uraian_prioda?.toLowerCase().includes(term)
    );
  }, [allData, searchTerm]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const currentPageData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, dokumen, tahun, periodeLoading]);

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
    if (!window.confirm("Yakin hapus data ini?")) return;
    try {
      await api.delete(`/prioritas-daerah/${id}`);
      setAllData((prev) => prev.filter((item) => item.id !== id));
    } catch {
      alert("Gagal menghapus data.");
    }
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      filtered.map((d) => ({
        "Kode Prioda": d.kode_prioda,
        "Nama Prioda": d.nama_prioda,
        Uraian: d.uraian_prioda,
        "OPD Tujuan": d.opd_tujuan,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Prioritas Daerah");
    XLSX.writeFile(wb, "prioritas_daerah.xlsx");
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
        <Breadcrumb.Item active>Prioritas Daerah</Breadcrumb.Item>
      </Breadcrumb>

      <Card className="mt-2 mb-4">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5>Daftar Prioritas Daerah</h5>
            <div>
              <Button className="me-2" onClick={handleAdd}>
                Tambah
              </Button>
              <Button className="me-2" onClick={handleExportExcel}>
                Ekspor Excel
              </Button>
              <CSVLink
                data={filtered}
                filename="prioritas_daerah.csv"
                className="btn btn-outline-secondary"
              >
                Ekspor CSV
              </CSVLink>
              <Button
                onClick={() => navigate("/dashboard-rpjmd")}
                className="me-2"
              >
                Tutup
              </Button>
            </div>
          </div>

          <InputGroup className="mb-2">
            <Form.Control
              placeholder="Cari berdasarkan kode, nama atau uraian..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>

          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>#</th>
                <th>Kode</th>
                <th>Nama</th>
                <th>Uraian</th>
                <th>OPD Tujuan</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {currentPageData.map((item, idx) => (
                <tr key={item.id}>
                  <td>{(page - 1) * pageSize + idx + 1}</td>
                  <td>{item.kode_prioda}</td>
                  <td>{item.nama_prioda}</td>
                  <td>{item.uraian_prioda}</td>
                  <td>{item.opd_tujuan}</td>
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
                  <td colSpan="6" className="text-center">
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

      {/* Modal Header and Body */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedItem ? "Edit Prioritas Daerah" : "Tambah Prioritas Daerah"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <PrioritasDaerahForm
            key={formKey}
            existingData={selectedItem}
            onSubmitSuccess={() => setShowModal(false)}
          />
        </Modal.Body>
      </Modal>
    </div>
  );
}
