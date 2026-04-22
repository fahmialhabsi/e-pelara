import React, { useState, useEffect } from "react";
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
import { CSVLink } from "react-csv";
import { FaEdit, FaTrash } from "react-icons/fa";
import { BsInfoCircle } from "react-icons/bs";
import { useNavigate } from "react-router-dom";
import { usePeriodeAktif } from "../../features/rpjmd/hooks/usePeriodeAktif";
import * as XLSX from "xlsx";
import { useDarkMode } from "../../hooks/useDarkMode";
import api from "../../services/api";
import PrioritasGubForm from "./PrioritasGubernurForm"; // Pastikan path ini benar
import { normalizeListItems } from "@/utils/apiResponse";
import { isDokumenLevelPeriode } from "@/utils/planningDokumenUtils";

export default function PrioritasGubernurList() {
  const navigate = useNavigate();
  const { dokumen, tahun, loading: periodeLoading } = usePeriodeAktif();
  const [darkMode, setDarkMode] = useDarkMode();
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [formKey, setFormKey] = useState(0);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // State untuk data prioritas gubernur, loading, dan error
  const [prioritasGub, setPrioritasGub] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch data prioritas gubernur secara langsung menggunakan api.get
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      if (!dokumen || !tahun) {
        setError(
          isDokumenLevelPeriode(dokumen)
            ? "Jenis dokumen / periode belum lengkap. Atur konteks di header."
            : "Dokumen dan konteks waktu belum dipilih.",
        );
        setLoading(false);
        return;
      }

      try {
        const res = await api.get("/prioritas-gubernur", {
          params: {
            jenis_dokumen: dokumen,
            tahun,
          },
        });

        const extractedData = normalizeListItems(res.data);
        setPrioritasGub(extractedData);
      } catch (err) {
        console.error("PrioritasGubernurList - Gagal fetch data:", err);
        setError("Gagal memuat data prioritas gubernur.");
        setPrioritasGub([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [reloadKey, dokumen, tahun, periodeLoading]); // Fetch ulang ketika reloadKey berubah

  useEffect(() => {
    document.body.classList.toggle("dark-mode", darkMode);
  }, [darkMode]);

  // --- Bagian Paginasi dan Filtering ---
  const pageSize = 5;
  const filtered = prioritasGub.filter(
    (item) =>
      item.kode_priogub?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.uraian_priogub?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / pageSize);
  const pageData = filtered.slice((page - 1) * pageSize, page * pageSize);

  // --- Handler ---
  const handleAdd = () => {
    setSelected(null);
    setFormKey((k) => k + 1);
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setSelected(item);
    setFormKey((k) => k + 1);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Yakin hapus prioritas gubernur ini?")) return;
    try {
      await api.delete(`/prioritas-gubernur/${id}`);
      setReloadKey((k) => k + 1);
    } catch (err) {
      console.error("PrioritasGubernurList - Gagal menghapus:", err);
      alert("Gagal menghapus prioritas gubernur.");
    }
  };

  const handleSave = () => {
    setShowModal(false);
    setReloadKey((k) => k + 1);
  };

  const handleExportExcel = () => {
    const dataToExport = prioritasGub.map((item) => ({
      Sasaran: item.Sasaran
        ? `${item.Sasaran.nomor} – ${item.Sasaran.isi_sasaran}`
        : "-",
      Kode_Prioritas: item.kode_priogub || "-",
      Uraian_Prioritas: item.uraian_priogub || "-",
      OPD_Tujuan: item.opd_tujuan || "-",
      Nama_Prioritas: item.nama_priogub || "-",
      Standar_Layanan_OPD: item.standar_layanan_opd || "-",
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PrioritasGubernur");
    XLSX.writeFile(wb, "prioritas_gubernur.xlsx");
  };

  // --- Render Logic ---
  if (loading && prioritasGub.length === 0) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" />
      </div>
    );
  }

  if (error && prioritasGub.length === 0) {
    return (
      <div className="container mt-3">
        <Alert variant="danger">{error}</Alert>
        <Button variant="primary" onClick={() => window.location.reload()}>
          Coba Muat Ulang
        </Button>
      </div>
    );
  }

  return (
    <div className={`container ${darkMode ? "dark-mode" : ""}`}>
      <Breadcrumb className="mt-3">
        <Breadcrumb.Item onClick={() => navigate("/dashboard-rpjmd")}>
          Home
        </Breadcrumb.Item>
        <Breadcrumb.Item active>Daftar Prioritas Gubernur</Breadcrumb.Item>
      </Breadcrumb>

      <Card className="mt-2 mb-4">
        <Card.Body>
          <Card.Title>Daftar Prioritas Gubernur</Card.Title>
          <div className="d-flex flex-wrap align-items-center mb-3">
            <InputGroup style={{ maxWidth: 300 }} className="me-2 mb-2">
              <Form.Control
                placeholder="Cari kode/uraian..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setPage(1);
                  }
                }}
              />
              <Button variant="outline-secondary" onClick={() => setPage(1)}>
                Cari
              </Button>
            </InputGroup>

            <Button variant="success" className="mb-2 me-2" onClick={handleAdd}>
              Tambah Prioritas Gubernur
            </Button>
            <OverlayTrigger
              placement="top"
              overlay={<Tooltip>Tambah atau edit prioritas gubernur</Tooltip>}
            >
              <Button variant="info" className="mb-2 me-2">
                <BsInfoCircle />
              </Button>
            </OverlayTrigger>
            <Button variant="secondary" className="mb-2 me-2">
              <CSVLink
                data={prioritasGub}
                filename="prioritas_gubernur.csv"
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
              onClick={() => navigate("/dashboard-rpjmd")}
            >
              Kembali
            </Button>
            <Button
              variant={darkMode ? "dark" : "light"}
              className="mb-2"
              onClick={() => setDarkMode((d) => !d)}
            >
              {darkMode ? "Light Mode" : "Dark Mode"}
            </Button>
          </div>

          {error && prioritasGub.length === 0 && (
            <Alert variant="danger">{error}</Alert>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="text-center py-4">
              {searchTerm ? (
                <p>Tidak ada prioritas gubernur yang cocok dengan pencarian.</p>
              ) : (
                <p>Tidak ada data prioritas gubernur.</p>
              )}
            </div>
          )}

          {filtered.length > 0 && (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Sasaran</th>
                  <th>Prioritas Gubernur</th>
                  <th>OPD Tujuan</th>
                  <th>Nama Prioritas</th>
                  <th>Standar Layanan OPD</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pageData.map((item, i) => (
                  <tr key={item.id}>
                    <td>{i + 1 + (page - 1) * pageSize}</td>
                    <td>
                      {item.Sasaran
                        ? `${item.Sasaran.nomor} – ${item.Sasaran.isi_sasaran}`
                        : "–"}
                    </td>
                    <td>
                      {item.kode_priogub
                        ? `${item.kode_priogub} – ${item.uraian_priogub}`
                        : "–"}
                    </td>
                    <td>{item.opd_tujuan || "-"}</td>
                    <td>{item.nama_priogub || "-"}</td>
                    <td>{item.standar_layanan_opd || "-"}</td>
                    <td>
                      <Button
                        size="sm"
                        variant="warning"
                        onClick={() => handleEdit(item)}
                        className="me-2"
                      >
                        <FaEdit />
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(item.id)}
                      >
                        <FaTrash />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}

          {totalPages > 1 && (
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
            {selected ? "Edit Prioritas Gubernur" : "Tambah Prioritas Gubernur"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <PrioritasGubForm
            key={formKey}
            existingData={selected}
            onSubmitSuccess={handleSave}
            onCancel={() => setShowModal(false)}
          />
        </Modal.Body>
      </Modal>
    </div>
  );
}
