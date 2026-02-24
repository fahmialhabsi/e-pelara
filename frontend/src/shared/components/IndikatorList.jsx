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
import { FaPlus, FaEdit, FaInfoCircle, FaTrash } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useDarkMode } from "../../hooks/useDarkMode";
import { CSVLink } from "react-csv";
import * as XLSX from "xlsx";
import IndikatorRPJMDForm from "./IndikatorRPJMDForm";
import {
  LEVEL_DOKUMEN_OPTIONS,
  JENIS_IKU_OPTIONS,
} from "../../utils/constants";

const types = [
  { value: "tujuan", label: "Indikator Tujuan", endpoint: "indikator-tujuans" },
  {
    value: "sasaran",
    label: "Indikator Sasaran",
    endpoint: "indikator-sasaran",
  },
  {
    value: "program",
    label: "Indikator Program",
    endpoint: "indikator-program",
  },
  {
    value: "kegiatan",
    label: "Indikator Kegiatan",
    endpoint: "indikator-kegiatan",
  },
];

export default function IndikatorList() {
  const navigate = useNavigate();
  const location = useLocation();
  const query = new URLSearchParams(location.search);

  const [selectedType, setSelectedType] = useState(
    query.get("type") || "tujuan"
  );
  const [items, setItems] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [darkMode, setDarkMode] = useDarkMode();
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [formKey, setFormKey] = useState(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(5);
  const [totalPages, setTotalPages] = useState(1);
  const [filterLevelDokumen, setFilterLevelDokumen] = useState("");
  const [filterJenisIKU, setFilterJenisIKU] = useState("");

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const typeObj = types.find((t) => t.value === selectedType);
      const res = await api.get(`/${typeObj.endpoint}`, {
        params: {
          page,
          limit: pageSize,
          search: searchTerm,
          level_dokumen: filterLevelDokumen,
          jenis_iku: filterJenisIKU,
        },
      });
      const data = Array.isArray(res.data) ? res.data : res.data.data;
      setItems(data);
      setTotalPages(res.data.meta?.totalPages || 1);
    } catch (err) {
      console.error(err);
      setErrorMsg(`Gagal memuat data ${selectedType}.`);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [
    selectedType,
    searchTerm,
    page,
    pageSize,
    filterLevelDokumen,
    filterJenisIKU,
  ]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleAdd = () => {
    setEditData(null);
    setFormKey((k) => k + 1);
    setShowForm(true);
  };

  const handleEdit = (row) => {
    setEditData(row);
    setFormKey((k) => k + 1);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus data ini?")) return;
    setLoading(true);
    try {
      const typeObj = types.find((t) => t.value === selectedType);
      await api.delete(`/${typeObj.endpoint}/${id}`);
      fetchItems();
    } catch (err) {
      console.error(err);
      setErrorMsg("Gagal menghapus data.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      items.map((i, idx) => ({
        No: idx + 1,
        Kode: i.kode_indikator,
        Nama: i.nama_indikator,
        Satuan: i.satuan,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Indikator");
    XLSX.writeFile(wb, `${selectedType}-indikator.xlsx`);
  };

  return (
    <div className={`container ${darkMode ? "dark-mode" : ""}`}>
      <Breadcrumb className="mt-3">
        <Breadcrumb.Item href="/">Home</Breadcrumb.Item>
        <Breadcrumb.Item active>Indikator</Breadcrumb.Item>
      </Breadcrumb>
      <Card className="mt-2 mb-4">
        <Card.Body>
          <Card.Title>
            Daftar {types.find((t) => t.value === selectedType)?.label}
          </Card.Title>

          <div className="d-flex flex-wrap align-items-center mb-3">
            <Form.Select
              className="me-2 mb-2"
              style={{ maxWidth: 150 }}
              value={filterLevelDokumen}
              onChange={(e) => {
                setFilterLevelDokumen(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Semua Level</option>
              {LEVEL_DOKUMEN_OPTIONS.map((lvl) => (
                <option key={lvl.value} value={lvl.value}>
                  {lvl.label}
                </option>
              ))}
            </Form.Select>

            <Form.Select
              className="me-2 mb-2"
              style={{ maxWidth: 150 }}
              value={filterJenisIKU}
              onChange={(e) => {
                setFilterJenisIKU(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Semua Jenis</option>
              {JENIS_IKU_OPTIONS.map((j) => (
                <option key={j.value} value={j.value}>
                  {j.label}
                </option>
              ))}
            </Form.Select>

            <InputGroup style={{ maxWidth: 300 }} className="me-2 mb-2">
              <Form.Control
                placeholder="Cari kode atau nama..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setPage(1)}
              />
              <Button variant="outline-secondary" onClick={() => setPage(1)}>
                Cari
              </Button>
            </InputGroup>

            <Button variant="success" className="mb-2 me-2" onClick={handleAdd}>
              <FaPlus /> Tambah
            </Button>
            <Button
              variant="secondary"
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
                    <th>No</th>
                    <th>Kode</th>
                    <th>Nama</th>
                    <th>Satuan</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length > 0 ? (
                    items.map((i, idx) => (
                      <tr key={i.id}>
                        <td>{idx + 1 + (page - 1) * pageSize}</td>
                        <td>{i.kode_indikator}</td>
                        <td>{i.nama_indikator}</td>
                        <td>{i.satuan}</td>
                        <td>
                          <Button
                            size="sm"
                            variant="warning"
                            onClick={() => handleEdit(i)}
                            className="me-2"
                          >
                            <FaEdit />
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDelete(i.id)}
                          >
                            <FaTrash />
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center">
                        Tidak ada data.
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
        show={showForm}
        onHide={() => setShowForm(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>{editData ? "Edit" : "Tambah"} Indikator</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <IndikatorRPJMDForm
            key={formKey}
            existingData={editData}
            onSubmitSuccess={() => {
              setShowForm(false);
              fetchItems();
            }}
          />
        </Modal.Body>
      </Modal>
    </div>
  );
}
