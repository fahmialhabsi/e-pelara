// components/rpjmd/StrategiList.jsx
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
import api from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { useDarkMode } from "@/hooks/useDarkMode";
import { usePeriodeAktif } from "@/features/rpjmd/hooks/usePeriodeAktif";
import StrategiForm from "./StrategiForm";
import {
  extractListData,
  extractListMeta,
  normalizeListItems,
} from "@/utils/apiResponse";

export default function StrategiList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { dokumen, tahun } = usePeriodeAktif();
  const [darkMode, setDarkMode] = useDarkMode();
  const tableRef = useRef(null);

  const [strategiList, setStrategiList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [periodeValid, setPeriodeValid] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState({});
  const [formKey, setFormKey] = useState(0);

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const normalizedSearch = search.trim().toLowerCase();

  useEffect(() => {
    document.body.classList.toggle("dark-mode", darkMode);
  }, [darkMode]);

  useEffect(() => {
    const fetchPeriode = async () => {
      try {
        const res = await api.get("/periode-rpjmd");
        const periodeData = extractListData(res.data);
        const valid = periodeData.some(
          (p) =>
            Number(user?.tahun) >= Number(p.tahun_awal) &&
            Number(user?.tahun) <= Number(p.tahun_akhir)
        );
        setPeriodeValid(valid);
      } catch (err) {
        console.error("Periode fetch error:", err);
        setPeriodeValid(false);
      }
    };
    if (user?.tahun) fetchPeriode();
  }, [user]);

  const fetchStrategi = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/strategi", {
        params: { page, limit, search, jenis_dokumen: dokumen, tahun },
      });

      const list = normalizeListItems(res.data);
      const meta = extractListMeta(res.data);

      setStrategiList(list);
      setTotalPages(meta?.totalPages || 1);
    } catch (err) {
      console.error("Fetch error:", err);
      setErrorMsg("Gagal memuat data Strategi.");
      setStrategiList([]); // batal daftar
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, dokumen, tahun]);

  useEffect(() => {
    fetchStrategi();
  }, [fetchStrategi, page]);

  useEffect(() => {
    if (tableRef.current) {
      const el = tableRef.current.querySelector(".match-highlight");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [strategiList]);

  const highlightText = (text) => {
    if (!normalizedSearch) return text;
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

  useEffect(() => {
    setPage(1);
  }, [search]);

  const handleAdd = () => {
    setSelected(null);
    setFormKey((k) => k + 1);
    setShowModal(true);
  };

  const handleEdit = (item) => {
    const itemWithSasaranId = {
      ...item,
      sasaran_id: item.Sasaran?.id || null,
    };
    setSelected(itemWithSasaranId);
    setFormKey((k) => k + 1);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Yakin hapus data ini?")) return;
    try {
      await api.delete(`/strategi/${id}`);
      fetchStrategi();
    } catch {
      alert("Gagal menghapus data.");
    }
  };

  const handleSave = () => {
    setShowModal(false);
    fetchStrategi();
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      strategiList.map((s) => ({
        Uraian_Tujuan_Sasaran: [
          s.Sasaran?.Tujuan?.isi_tujuan || "-",
          s.Sasaran
            ? `${s.Sasaran.nomor || ""} – ${s.Sasaran.isi_sasaran || ""}`
            : "-",
        ].join(" | "),
        Kode_Uraian_Strategi: [s.kode_strategi || "-", s.deskripsi || "-"].join(
          " | "
        ),
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Strategi");
    XLSX.writeFile(wb, "strategi_rpjmd.xlsx");
  };

  const handleExportPdf = () => {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [["No", "Uraian Tujuan/Sasaran", "Kode & Uraian Strategi"]],
      body: strategiList.map((s, i) => {
        const t = s.Sasaran?.Tujuan?.isi_tujuan || "-";
        const sasaranUraian = s.Sasaran
          ? `${s.Sasaran.nomor || ""} – ${s.Sasaran.isi_sasaran || ""}`
          : "-";
        const tsBlock = `${t}\n${sasaranUraian}`;
        const kodStr = `${s.kode_strategi || "-"}\n${s.deskripsi || "-"}`;
        return [i + 1, tsBlock, kodStr];
      }),
    });
    doc.save("strategi_rpjmd.pdf");
  };

  if (periodeValid === false) {
    return (
      <Container className="mt-5">
        <Alert variant="danger">
          Konteks periode login tidak selaras dengan periode RPJMD aktif. Silakan login ulang atau hubungi admin.
        </Alert>
      </Container>
    );
  }

  if (periodeValid === null || loading) {
    return (
      <Container className="my-5 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  const matchFound = strategiList.some((st) => {
    if (!normalizedSearch) return false;
    const q = normalizedSearch;
    const sas = st.Sasaran;
    const tujuan = sas?.Tujuan;
    const blob = [
      st.kode_strategi,
      st.deskripsi,
      sas?.nomor,
      sas?.isi_sasaran,
      tujuan?.no_tujuan,
      tujuan?.isi_tujuan,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return blob.includes(q);
  });

  return (
    <Container className={darkMode ? "dark-mode" : ""}>
      <Breadcrumb className="mt-3">
        <Breadcrumb.Item onClick={() => navigate("/dashboard-rpjmd")}>
          Dashboard
        </Breadcrumb.Item>
        <Breadcrumb.Item active>Strategi RPJMD</Breadcrumb.Item>
      </Breadcrumb>

      <Card className="mt-2 mb-4">
        <Card.Body>
          <Card.Title>Daftar Strategi RPJMD</Card.Title>

          <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
            <InputGroup style={{ maxWidth: 300 }}>
              <Form.Control
                placeholder="Cari strategi..."
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
                onClick={() => {
                  setSearch(searchInput);
                }}
              >
                Cari
              </Button>
            </InputGroup>

            <Button variant="success" onClick={handleAdd}>
              Tambah Strategi
            </Button>
            <OverlayTrigger
              overlay={<Tooltip>Tambah atau ubah strategi</Tooltip>}
            >
              <Button variant="info">
                <BsInfoCircle />
              </Button>
            </OverlayTrigger>

            <Button variant="secondary">
              <CSVLink
                data={strategiList}
                filename="strategi.csv"
                style={{ color: "inherit", textDecoration: "none" }}
              >
                Ekspor CSV
              </CSVLink>
            </Button>
            <Button variant="success" onClick={handleExportExcel}>
              Ekspor Excel
            </Button>
            <Button variant="danger" onClick={handleExportPdf}>
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
          {normalizedSearch && !loading && !errorMsg && !matchFound && (
            <Alert variant="warning">
              Tidak ada yang cocok dengan pencarian.
            </Alert>
          )}

          <Table striped bordered hover responsive ref={tableRef}>
            <thead>
              <tr>
                <th style={{ width: "42%" }}>Uraian Tujuan/Sasaran</th>
                <th>Kode &amp; Uraian Strategi</th>
                <th style={{ width: "10%" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {strategiList.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center text-muted">
                    Tidak ada data strategi.
                  </td>
                </tr>
              ) : (
                strategiList.map((st) => {
                  const sas = st.Sasaran;
                  const tujuan = sas?.Tujuan;
                  const uraianTS =
                    sas && tujuan ? (
                      <>
                        <strong>Tujuan ({tujuan.no_tujuan || "-"}):</strong>{" "}
                        {highlightText(tujuan.isi_tujuan || "-")}
                        <br />
                        <strong>Sasaran ({sas.nomor || "-"}):</strong>{" "}
                        {highlightText(sas.isi_sasaran || "-")}
                      </>
                    ) : (
                      <span className="text-muted">
                        Relasi tujuan/sasaran tidak tersedia
                      </span>
                    );

                  return (
                    <tr key={st.id}>
                      <td>{uraianTS}</td>
                      <td>
                        <strong>{highlightText(st.kode_strategi || "-")}</strong>
                        <br />
                        {highlightText(st.deskripsi || "-")}
                      </td>
                      <td className="text-center">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="me-2"
                          onClick={() => handleEdit(st)}
                        >
                          <FaEdit />
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleDelete(st.id)}
                        >
                          <FaTrash />
                        </Button>
                      </td>
                    </tr>
                  );
                })
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
                key={`page-${i + 1}`}
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
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {selected?.id ? "Edit Strategi" : "Tambah Strategi"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <StrategiForm
            key={formKey}
            existingData={selected}
            onSubmitSuccess={handleSave}
            onCancel={() => setShowModal(false)}
          />
        </Modal.Body>
      </Modal>
    </Container>
  );
}
