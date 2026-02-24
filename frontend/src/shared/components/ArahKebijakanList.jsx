// src/components/ArahKebijakanList.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
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
  Container,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { CSVLink } from "react-csv";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { BsInfoCircle } from "react-icons/bs";
import { FaEdit, FaTrash } from "react-icons/fa";
import api from "../../services/api";
import { useDarkMode } from "../../hooks/useDarkMode";
import { useAuth } from "../../hooks/useAuth";
import { usePeriodeAktif } from "@/features/rpjmd/hooks/usePeriodeAktif";
import ArahKebijakanForm from "./ArahKebijakanForm";

export default function ArahKebijakanList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { dokumen, tahun } = usePeriodeAktif();
  const [darkMode, setDarkMode] = useDarkMode();
  const tableRef = useRef(null);

  const [arahList, setArahList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [periodeValid, setPeriodeValid] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [selectedArah, setSelectedArah] = useState(null);
  const [formKey, setFormKey] = useState(0);

  const [page, setPage] = useState(1);
  const limit = 10;
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const normalizedSearch = search.trim().toLowerCase();

  useEffect(() => {
    document.body.classList.toggle("dark-mode", darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (tableRef.current) {
      const el = tableRef.current.querySelector(".match-highlight");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [arahList]);

  useEffect(() => {
    async function checkPeriode() {
      try {
        const res = await api.get("/periode-rpjmd");
        const valid = res.data.some(
          (p) => user?.tahun >= p.tahun_awal && user?.tahun <= p.tahun_akhir
        );
        setPeriodeValid(valid);
      } catch {
        setPeriodeValid(false);
      }
    }
    if (user?.tahun) checkPeriode();
  }, [user]);

  const fetchArah = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/arah-kebijakan", {
        params: {
          page,
          limit,
          search,
          jenis_dokumen: dokumen,
          tahun,
        },
      });

      const data = res.data;
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.data)
        ? data.data
        : [];

      list.sort((a, b) => {
        const aMatch =
          normalizedSearch &&
          `${a.kode_arah} ${a.deskripsi}`
            .toLowerCase()
            .includes(normalizedSearch);
        const bMatch =
          normalizedSearch &&
          `${b.kode_arah} ${b.deskripsi}`
            .toLowerCase()
            .includes(normalizedSearch);
        return bMatch - aMatch;
      });

      const meta = data.meta || {};
      setArahList(list);
      setTotalPages(meta.totalPages || 1);
      setErrorMsg("");
    } catch (err) {
      console.error("❌ Fetch arah kebijakan error:", err);
      setErrorMsg("Gagal memuat data arah kebijakan.");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, dokumen, tahun, normalizedSearch]);

  useEffect(() => {
    if (periodeValid) fetchArah();
  }, [periodeValid, fetchArah]);

  useEffect(() => {
    if (search) setPage(1);
  }, [search]);

  const highlightText = (text) => {
    if (typeof text !== "string" || !normalizedSearch) return text || "";

    const re = new RegExp(
      `(${normalizedSearch.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")})`,
      "gi"
    );

    return text.split(re).map((part, i) =>
      re.test(part) ? (
        <mark key={i} className="bg-success text-white match-highlight">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const handleAdd = () => {
    setSelectedArah(null);
    setFormKey((k) => k + 1);
    setShowModal(true);
  };
  const handleEdit = (item) => {
    setSelectedArah(item);
    setFormKey((k) => k + 1);
    setShowModal(true);
  };
  const handleDelete = async (id) => {
    if (!window.confirm("Yakin hapus data ini?")) return;
    try {
      await api.delete(`/arah-kebijakan/${id}`);
      fetchArah();
    } catch (err) {
      alert(err.response?.data?.message || "Gagal menghapus data.");
    }
  };
  const handleSave = () => {
    setShowModal(false);
    fetchArah();
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      arahList.map((a) => ({
        Strategi: a.Strategi?.kode_strategi ?? "",
        KodeArah: a.kode_arah,
        Deskripsi: a.deskripsi,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ArahKebijakan");
    XLSX.writeFile(wb, "arah_kebijakan.xlsx");
  };
  const exportPdf = () => {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [["No", "Strategi", "Kode Arah", "Uraian"]],
      body: arahList.map((a, i) => [
        i + 1,
        a.Strategi?.kode_strategi ?? "",
        a.kode_arah,
        a.deskripsi,
      ]),
    });
    doc.save("arah_kebijakan.pdf");
  };

  if (periodeValid === false) {
    return (
      <Container className="mt-5">
        <Alert variant="danger">
          Tahun tidak termasuk periode RPJMD. Hubungi admin atau login ulang.
        </Alert>
      </Container>
    );
  }
  if (periodeValid === null || loading) {
    return (
      <Container className="text-center my-5">
        <Spinner animation="border" />
      </Container>
    );
  }

  const grouped = {};
  let matchFound = false;

  arahList.forEach((a) => {
    const strategiId = a.Strategi?.id;
    const match =
      normalizedSearch &&
      `${a.kode_arah} ${a.deskripsi}`.toLowerCase().includes(normalizedSearch);
    if (match) matchFound = true;
    if (!strategiId) return;

    if (!grouped[strategiId]) {
      grouped[strategiId] = {
        strategi: a.Strategi,
        arah: [],
      };
    }

    grouped[strategiId].arah.push({ ...a, match });
  });

  Object.values(grouped).forEach((group) => {
    group.arah.sort((a, b) => b.match - a.match);
  });

  return (
    <Container className={darkMode ? "dark-mode" : ""}>
      <Breadcrumb className="mt-3">
        <Breadcrumb.Item onClick={() => navigate("/dashboard-rpjmd")}>
          Home
        </Breadcrumb.Item>
        <Breadcrumb.Item active>Arah Kebijakan</Breadcrumb.Item>
      </Breadcrumb>

      <Card className="mb-4">
        <Card.Body>
          <Card.Title>Daftar Arah Kebijakan</Card.Title>

          <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
            <InputGroup style={{ maxWidth: 300 }}>
              <Form.Control
                placeholder="Cari..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setSearch(searchInput);
                  }
                }}
              />
              <Button
                variant="outline-secondary"
                onClick={() => setSearch(searchInput)}
              >
                Cari
              </Button>
            </InputGroup>

            <Button variant="success" onClick={handleAdd}>
              Tambah Arah
            </Button>
            <OverlayTrigger overlay={<Tooltip>Tambah atau edit</Tooltip>}>
              <Button variant="info">
                <BsInfoCircle />
              </Button>
            </OverlayTrigger>
            <Button variant="secondary">
              <CSVLink data={arahList} filename="arah_kebijakan.csv">
                Ekspor CSV
              </CSVLink>
            </Button>
            <Button variant="success" onClick={exportExcel}>
              Ekspor Excel
            </Button>
            <Button variant="danger" onClick={exportPdf}>
              Ekspor PDF
            </Button>
            <Button
              variant={darkMode ? "dark" : "light"}
              onClick={() => setDarkMode((d) => !d)}
            >
              {darkMode ? "Light Mode" : "Dark Mode"}
            </Button>
          </div>

          {errorMsg && <Alert variant="danger">{errorMsg}</Alert>}
          {normalizedSearch && !loading && !matchFound && (
            <Alert variant="warning">
              Tidak ada yang cocok dengan pencarian.
            </Alert>
          )}

          <Table striped bordered hover responsive ref={tableRef}>
            <thead>
              <tr>
                <th style={{ width: "15%" }}>Kode</th>
                <th>Uraian Sasaran/Strategi dan Arah Kebijakan</th>
                <th style={{ width: "10%" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(grouped).map(({ strategi, arah }) => (
                <React.Fragment key={strategi.id}>
                  <tr>
                    <td>{strategi.Sasaran?.nomor}</td>
                    <td colSpan={2}>
                      <strong>Sasaran:</strong> {strategi.Sasaran?.isi_sasaran}
                    </td>
                  </tr>
                  <tr>
                    <td>{highlightText(strategi.kode_strategi)}</td>
                    <td colSpan={2}>
                      <strong>Strategi:</strong>{" "}
                      {highlightText(strategi.deskripsi)}
                    </td>
                  </tr>
                  {arah.map((a) => (
                    <tr key={a.id}>
                      <td className="ps-4">{highlightText(a.kode_arah)}</td>
                      <td colSpan={2}>
                        <strong>Arah Kebijakan:</strong>{" "}
                        {highlightText(a.deskripsi)}
                      </td>
                      <td className="text-center">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="me-2"
                          onClick={() => handleEdit(a)}
                        >
                          <FaEdit />
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleDelete(a.id)}
                        >
                          <FaTrash />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
              {arahList.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center">
                    Tidak ada data
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
            {Array.from({ length: totalPages }).map((_, idx) => (
              <Pagination.Item
                key={idx + 1}
                active={idx + 1 === page}
                onClick={() => setPage(idx + 1)}
              >
                {idx + 1}
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
            {selectedArah ? "Edit Arah Kebijakan" : "Tambah Arah Kebijakan"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ArahKebijakanForm
            key={formKey}
            existingData={selectedArah}
            onSubmitSuccess={handleSave}
            onCancel={() => setShowModal(false)}
          />
        </Modal.Body>
      </Modal>
    </Container>
  );
}
