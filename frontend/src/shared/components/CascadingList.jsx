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
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import CascadingForm from "./CascadingForm";
import CascadingNestedView from "./CascadingNestedView";
import CascadingEdit from "./CascadingEdit";
import { useDokumen } from "../../hooks/useDokumen";

export function CascadingList() {
  const navigate = useNavigate();

  const [cascadings, setCascadings] = useState([]);
  const { dokumen, tahun } = useDokumen();
  const [errorMsg, setErrorMsg] = useState("");
  const [darkMode, setDarkMode] = useDarkMode();

  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formKey, setFormKey] = useState(0);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(5);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterValues, setFilterValues] = useState({});

  const fetchCascadings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/cascading", {
        params: {
          page,
          limit: pageSize,
          search: searchTerm,
          jenis_dokumen: dokumen,
          tahun,
          ...filterValues,
        },
      });
      const dataList = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data.data)
        ? res.data.data
        : [];
      setCascadings(dataList);
      setTotalPages(res.data.meta?.totalPages || 1);
      setErrorMsg("");
    } catch (err) {
      console.error("Error fetching cascading:", err);
      setErrorMsg("Gagal memuat data cascading.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchTerm, filterValues]);

  useEffect(() => {
    fetchCascadings();
  }, [fetchCascadings]);

  const handleAdd = () => {
    setSelectedItem(null);
    setFormKey((k) => k + 1);
    setShowModal(true);
  };

  const handleEdit = (item) => {
    navigate(`/rpjmd/cascading-edit/${item.id}`);
  };

  const handleDetail = (item) => {
    navigate(`/rpjmd/cascading-detail/${item.id}`);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Yakin hapus cascading ini?")) return;
    try {
      await api.delete(`/cascading/${id}`);
      fetchCascadings();
    } catch (err) {
      console.error(err);
      alert("Gagal menghapus data cascading.");
    }
  };

  const handleSave = () => {
    setShowModal(false);
    fetchCascadings();
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      cascadings.map((c, i) => ({
        No: i + 1,
        Misi: c.misi ? `${c.misi.no_misi} - ${c.misi.isi_misi}` : "",
        PrioritasNasional: c.priorNasional
          ? `${c.priorNasional.kode_prionas} - ${c.priorNasional.nama_prionas}`
          : "",
        PrioritasDaerah: c.priorDaerah
          ? `${c.priorDaerah.kode_prioda} - ${c.priorDaerah.nama_prioda}`
          : "",
        PrioritasKepda: c.priorKepda
          ? `${c.priorKepda.kode_priogub} - ${c.priorKepda.nama_priogub}`
          : "",
        Tujuan: c.tujuan
          ? `${c.tujuan.no_tujuan} - ${c.tujuan.isi_tujuan}`
          : "",
        Sasaran: c.sasaran
          ? `${c.sasaran.nomor} - ${c.sasaran.isi_sasaran}`
          : "",
        Strategi: c.strategi
          ? `${c.strategi.kode_strategi} - ${c.strategi.nama_strategi}`
          : "",
        ArahKebijakan: c.arahKebijakan
          ? `${c.arahKebijakan.kode_arah} - ${c.arahKebijakan.nama_arah}`
          : "",
        Program: c.program
          ? `${c.program.kode_program} - ${c.program.nama_program}`
          : "",
        Kegiatan: c.kegiatan
          ? `${c.kegiatan.kode_kegiatan} - ${c.kegiatan.nama_kegiatan}`
          : "",
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cascading");
    XLSX.writeFile(wb, "cascading.xlsx");
  };

  useEffect(() => {
    document.body.classList.toggle("dark-mode", darkMode);
  }, [darkMode]);

  return (
    <div className={`container ${darkMode ? "dark-mode" : ""}`}>
      <Breadcrumb className="mt-3">
        <Breadcrumb.Item onClick={() => navigate("/dashboard")}>
          Home
        </Breadcrumb.Item>
        <Breadcrumb.Item active>Daftar Cascading</Breadcrumb.Item>
      </Breadcrumb>

      <Card className="mt-2 mb-4">
        <CascadingNestedView
          onFilterChange={(filters) => {
            setFilterValues(filters);
            setPage(1);
          }}
        />
        <Card.Body>
          <Card.Title>Daftar Cascading</Card.Title>

          <div className="d-flex flex-wrap align-items-center mb-3">
            <InputGroup style={{ maxWidth: 300 }} className="me-2 mb-2">
              <Form.Control
                placeholder="Cari misi/kegiatan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setPage(1);
                    fetchCascadings();
                  }
                }}
              />
              <Button
                variant="outline-secondary"
                onClick={() => {
                  setPage(1);
                  fetchCascadings();
                }}
              >
                Cari
              </Button>
            </InputGroup>
            <Button variant="success" className="mb-2 me-2" onClick={handleAdd}>
              Tambah Cascading
            </Button>
            <OverlayTrigger
              placement="top"
              overlay={<Tooltip>Tambah atau edit data cascading</Tooltip>}
            >
              <Button variant="info" className="mb-2 me-2">
                <span>
                  <BsInfoCircle />
                </span>
              </Button>
            </OverlayTrigger>
            <Button variant="secondary" className="mb-2 me-2">
              <CSVLink
                data={cascadings.map((c, i) => ({
                  No: i + 1,
                  misi: c.misi ? `${c.misi.no_misi} - ${c.misi.isi_misi}` : "",
                  priorNasional: c.priorNasional
                    ? `${c.priorNasional.kode_prionas} - ${c.priorNasional.nama_prionas}`
                    : "",
                  priorDaerah: c.priorDaerah
                    ? `${c.priorDaerah.kode_prioda} - ${c.priorDaerah.nama_prioda}`
                    : "",
                  priorKepda: c.priorKepda
                    ? `${c.priorKepda.kode_priogub} - ${c.priorKepda.nama_priogub}`
                    : "",
                  tujuan: c.tujuan
                    ? `${c.tujuan.no_tujuan} - ${c.tujuan.isi_tujuan}`
                    : "",
                  sasaran: c.sasaran
                    ? `${c.sasaran.nomor} - ${c.sasaran.isi_sasaran}`
                    : "",
                  strategi: c.strategi
                    ? `${c.strategi.kode_strategi} - ${c.strategi.nama_strategi}`
                    : "",
                  arahKebijakan: c.arahKebijakan
                    ? `${c.arahKebijakan.kode_arah} - ${c.arahKebijakan.nama_arah}`
                    : "",
                  program: c.program
                    ? `${c.program.kode_program} - ${c.program.nama_program}`
                    : "",
                  kegiatan: c.kegiatan?.nama_kegiatan || "",
                }))}
                filename="cascading.csv"
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
              onClick={() => navigate("/dashboard")}
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
              <CascadingNestedView
                data={cascadings}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDetail={handleDetail}
              />

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
            {selectedItem ? "Edit Cascading" : "Tambah Cascading"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedItem ? (
            <CascadingEdit
              key={formKey}
              onSaved={handleSave}
              existingData={selectedItem}
            />
          ) : (
            <CascadingForm key={formKey} onSaved={handleSave} />
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default CascadingList;
