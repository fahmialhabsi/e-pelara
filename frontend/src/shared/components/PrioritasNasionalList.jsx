import React, { useState, useEffect, useCallback } from "react";
import {
  Table,
  Button,
  Card,
  Alert,
  Tooltip,
  OverlayTrigger,
  Modal,
  Spinner,
  Breadcrumb,
  InputGroup,
  Form,
  Pagination,
} from "react-bootstrap";
import api from "../../services/api";
import { CSVLink } from "react-csv";
import { BsInfoCircle } from "react-icons/bs";
import { useDarkMode } from "../../hooks/useDarkMode";
import { usePeriodeAktif } from "../../features/rpjmd/hooks/usePeriodeAktif";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import PrioritasNasionalForm from "./PrioritasNasionalForm";

function PrioritasNasionalList() {
  const navigate = useNavigate();

  // 1. States utama
  const { dokumen, tahun, loading: periodeLoading } = usePeriodeAktif();
  const [prioritasNasional, setPrioritasNasional] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [darkMode, setDarkMode] = useDarkMode();

  // modal/form
  const [showModal, setShowModal] = useState(false);
  const [selectedPrioritas, setSelectedPrioritas] = useState(null);
  const [formKey, setFormKey] = useState(0);
  const [loading, setLoading] = useState(true);

  // ui controls
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchPrioritasNasional = useCallback(async () => {
    setLoading(true);

    if (periodeLoading || !dokumen || !tahun) {
      setLoading(false);
      return;
    }

    try {
      console.log("Kirim params:", {
        page,
        limit: pageSize,
        search: searchTerm,
        jenis_dokumen: dokumen,
        tahun: tahun,
      });

      const res = await api.get("/prioritas-nasional", {
        params: {
          page,
          limit: pageSize,
          search: searchTerm,
          jenis_dokumen: dokumen,
          tahun,
        },
      });
      // Server might return array directly or under data.data
      const dataList = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data.data)
        ? res.data.data
        : [];
      setPrioritasNasional(dataList);
      setTotalPages(res.data.meta?.totalPages || 1);
      setErrorMsg("");
    } catch (err) {
      console.error("Error fetching data:", err);
      setErrorMsg("Gagal memuat data prioritas nasional.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchTerm, dokumen, tahun, periodeLoading]);

  useEffect(() => {
    fetchPrioritasNasional();
  }, [fetchPrioritasNasional]);

  const handleAdd = () => {
    setSelectedPrioritas(null);
    setFormKey((k) => k + 1);
    setShowModal(true);
  };

  const handleEdit = (prioritas) => {
    setSelectedPrioritas(prioritas);
    setFormKey((k) => k + 1);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Yakin hapus prioritas nasional ini?")) return;
    try {
      await api.delete(`/prioritas-nasional/${id}`);
      fetchPrioritasNasional();
    } catch (err) {
      console.error(err);
      alert("Gagal menghapus prioritas nasional.");
    }
  };

  const handleSave = () => {
    setShowModal(false);
    fetchPrioritasNasional();
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      prioritasNasional.map((p) => ({
        Kode: p.kode_prionas,
        Uraian: p.uraian_prionas,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Prioritas Nasional");
    XLSX.writeFile(wb, "prioritas_nasional.xlsx");
  };

  useEffect(() => {
    document.body.classList.toggle("dark-mode", darkMode);
  }, [darkMode]);

  return (
    <div className={`container ${darkMode ? "dark-mode" : ""}`}>
      <Breadcrumb className="mt-3">
        <Breadcrumb.Item onClick={() => navigate("/dashboard-rpjmd")}>
          Balik ke beranda
        </Breadcrumb.Item>
        <Breadcrumb.Item active>Daftar Prioritas Nasional</Breadcrumb.Item>
      </Breadcrumb>

      <Card className="mt-2 mb-4">
        <Card.Body>
          <Card.Title>Daftar Prioritas Nasional</Card.Title>

          <div className="d-flex flex-wrap align-items-center mb-3">
            <InputGroup style={{ maxWidth: 300 }} className="me-2 mb-2">
              <Form.Control
                placeholder="Cari kode/uraian..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setPage(1);
                    fetchPrioritasNasional();
                  }
                }}
              />
              <Button
                variant="outline-secondary"
                onClick={() => {
                  setPage(1);
                  fetchPrioritasNasional();
                }}
              >
                Cari
              </Button>
            </InputGroup>
            <Button variant="success" className="mb-2 me-2" onClick={handleAdd}>
              Tambah Prioritas
            </Button>
            <OverlayTrigger
              placement="top"
              overlay={<Tooltip>Tambah atau edit prioritas nasional</Tooltip>}
            >
              <Button variant="info" className="mb-2 me-2">
                <span>
                  <BsInfoCircle />
                </span>
              </Button>
            </OverlayTrigger>
            <Button variant="secondary" className="mb-2 me-2">
              <CSVLink
                data={prioritasNasional}
                filename="prioritas_nasional.csv"
                style={{ color: "inherit", textDecoration: "none" }}
              >
                Ekspor CSV
              </CSVLink>
            </Button>
            <Button
              variant="success"
              className="mb-2 me-2"
              onClick={handleExportExcel}
            >
              Ekspor Excel
            </Button>
            <Button
              variant="outline-dark"
              className="mb-2 me-2"
              onClick={() => navigate("/rpjmd/prionas")}
            >
              Tutup
            </Button>
            <Button
              variant={darkMode ? "dark" : "light"}
              className="mb-2"
              onClick={() => setDarkMode((d) => !d)}
            >
              {darkMode ? "Light Mode" : "Dark Mode"}
            </Button>
          </div>

          {errorMsg && <Alert variant="danger">{errorMsg}</Alert>}

          {loading ? (
            <div className="text-center my-5">
              <Spinner animation="border" role="status" />
            </div>
          ) : (
            <>
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th>Nama Prioritas</th>
                    <th>Uraian Prioritas</th>
                    <th>Sumber</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {prioritasNasional.length > 0 ? (
                    prioritasNasional.map((prioritas) => (
                      <tr key={prioritas.id}>
                        <td>{prioritas.kode_prionas}</td>
                        <td>{prioritas.nama_prionas}</td>
                        <td>{prioritas.uraian_prionas}</td>
                        <td>{prioritas.sumber}</td>
                        <td>
                          <Button
                            size="sm"
                            onClick={() => handleEdit(prioritas)}
                            className="me-2"
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDelete(prioritas.id)}
                          >
                            Hapus
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center">
                        Tidak ada data prioritas nasional.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>

              <Pagination className="justify-content-center">
                <Pagination.First
                  disabled={page === 1}
                  onClick={() => setPage(1)}
                />
                <Pagination.Prev
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                />
                {Array.from({ length: totalPages }, (_, i) => (
                  <Pagination.Item
                    key={i + 1}
                    active={i + 1 === page}
                    onClick={() => setPage(i + 1)}
                  >
                    {i + 1}
                  </Pagination.Item>
                ))}
                <Pagination.Next
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                />
                <Pagination.Last
                  disabled={page === totalPages}
                  onClick={() => setPage(totalPages)}
                />
              </Pagination>
            </>
          )}
        </Card.Body>
      </Card>

      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedPrioritas
              ? "Edit Prioritas Nasional"
              : "Tambah Prioritas Nasional"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <PrioritasNasionalForm
            key={formKey}
            existingData={selectedPrioritas}
            onSubmitSuccess={handleSave}
          />
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default PrioritasNasionalList;
