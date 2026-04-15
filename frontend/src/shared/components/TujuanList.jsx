// components/rpjmd/TujuanList.jsx
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
import { BsInfoCircle } from "react-icons/bs";
import * as XLSX from "xlsx";
import api from "@/services/api";
import { useDarkMode } from "@/hooks/useDarkMode";
import { useAuth } from "@/hooks/useAuth";
import { usePeriodeAktif } from "@/features/rpjmd/hooks/usePeriodeAktif";
import TujuanForm from "./TujuanForm";
import {
  extractListData,
  extractListMeta,
  normalizeListItems,
} from "@/utils/apiResponse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const highlightText = (text, keyword) => {
  if (!keyword) return text;
  const regex = new RegExp(`(${keyword})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    part.toLowerCase() === keyword.toLowerCase() ? (
      <span
        key={i}
        style={{ backgroundColor: "lightgreen", fontWeight: "bold" }}
      >
        {part}
      </span>
    ) : (
      part
    )
  );
};

export default function TujuanList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { dokumen, tahun } = usePeriodeAktif();
  const [darkMode, setDarkMode] = useDarkMode();

  const [periodeIdValid, setPeriodeIdValid] = useState(null);
  const matchRefs = useRef([]);
  const [tujuanList, setTujuanList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [selectedTujuan, setSelectedTujuan] = useState(null);
  const [formKey, setFormKey] = useState(0);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [totalPages, setTotalPages] = useState(1);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState("excel");
  const [exportScope, setExportScope] = useState("all");

  useEffect(() => {
    document.body.classList.toggle("dark-mode", darkMode);
  }, [darkMode]);

  useEffect(() => {
    const fetchPeriode = async () => {
      try {
        const res = await api.get("/periode-rpjmd");
        const periodeList = extractListData(res.data);
        const valid = periodeList.some(
          (p) =>
            Number(user?.tahun) >= Number(p.tahun_awal) &&
            Number(user?.tahun) <= Number(p.tahun_akhir)
        );
        setPeriodeIdValid(valid);
      } catch (err) {
        console.error("Periode fetch error:", err);
        setPeriodeIdValid(false);
      }
    };
    if (user?.tahun) fetchPeriode();
  }, [user]);

  const fetchTujuan = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/tujuan", {
        params: {
          jenis_dokumen: dokumen,
          tahun,
          page,
          limit,
          search: searchQuery,
        },
      });
      const list = normalizeListItems(res.data);
      const meta = extractListMeta(res.data);

      const keyword = searchQuery.toLowerCase().trim();
      const matched = [];
      const others = [];

      list.forEach((item) => {
        const isi = item.isi_tujuan?.toLowerCase() || "";
        if (keyword && isi.includes(keyword)) {
          matched.push(item);
        } else {
          others.push(item);
        }
      });

      const sortedList = [...matched, ...others];
      setTujuanList(sortedList);
      setTotalPages(meta.totalPages || 1);

      if (keyword && matched.length === 0) {
        setErrorMsg("Tidak ada yang cocok dengan pencarian.");
      } else {
        setErrorMsg("");
      }

      return sortedList;
    } catch (err) {
      console.error("Fetch Tujuan Error:", err);
      setErrorMsg("Gagal memuat data tujuan.");
    } finally {
      setLoading(false);
      setSearchLoading(false);
    }
  }, [page, limit, searchQuery, dokumen, tahun]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchQuery(searchTerm);
      setPage(1);
    }, 500);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  useEffect(() => {
    matchRefs.current = [];
    fetchTujuan().then(() => {
      const keyword = searchQuery.toLowerCase().trim();
      const targetRef = matchRefs.current.find((ref) =>
        ref?.text?.toLowerCase().includes(keyword)
      );
      if (targetRef?.element) {
        targetRef.element.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    });
  }, [fetchTujuan]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setSearchLoading(true);
  };

  const handleResetSearch = () => {
    setSearchTerm("");
    setSearchQuery("");
    setPage(1);
  };

  const handleAdd = () => {
    setSelectedTujuan(null);
    setFormKey((k) => k + 1);
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setSelectedTujuan(item);
    setFormKey((k) => k + 1);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Hapus tujuan ini?")) return;
    try {
      await api.delete(`/tujuan/${id}`);
      fetchTujuan();
    } catch (err) {
      console.error("Delete gagal:", err);
      alert("Gagal menghapus data.");
    }
  };

  const handleSave = () => {
    setShowModal(false);
    fetchTujuan();
  };

  const handleExportExcel = (currentOnly = false) => {
    const dataToExport = currentOnly ? tujuanList : tujuanList.slice();

    const rows = [
      ["", `DAFTAR TUJUAN RPJMD TAHUN ${tahun}`],
      ["", "Dibuat oleh: Badan Perencanaan Dan Pembangunan Daerah"],
      [],
      ["Kode", "Uraian Misi & Tujuan"],
    ];

    const misiSeen = new Set();
    dataToExport.forEach((t) => {
      if (!misiSeen.has(t.Misi?.no_misi)) {
        rows.push([t.Misi.no_misi, t.Misi.isi_misi.toUpperCase()]);
        misiSeen.add(t.Misi.no_misi);
      }
      rows.push([t.no_tujuan, t.isi_tujuan]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tujuan RPJMD");
    XLSX.writeFile(wb, "tujuan_rpjmd.xlsx");
  };

  const handleExportPDF = (currentOnly = false) => {
    const dataToExport = currentOnly ? tujuanList : tujuanList.slice();
    const doc = new jsPDF();

    doc.setFontSize(14);
    doc.text(`DAFTAR TUJUAN RPJMD TAHUN ${tahun}`, 14, 15);
    doc.setFontSize(10);
    doc.text("Dibuat oleh: Badan Perencanaan Dan Pembangunan Daerah", 14, 22);

    const rows = [];
    const misiSeen = new Set();

    dataToExport.forEach((t) => {
      if (!misiSeen.has(t.Misi?.no_misi)) {
        rows.push([`${t.Misi.no_misi}`, t.Misi.isi_misi.toUpperCase()]);
        misiSeen.add(t.Misi.no_misi);
      }
      rows.push([t.no_tujuan, t.isi_tujuan]);
    });

    autoTable(doc, {
      startY: 30,
      head: [["Kode", "Uraian Misi & Tujuan"]],
      body: rows,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [100, 100, 100] },
    });

    doc.save("tujuan_rpjmd.pdf");
  };

  if (periodeIdValid === false) {
    return (
      <Container className="my-5">
        <Alert variant="danger">
          Tahun periode login tidak sesuai. Silakan hubungi admin atau login
          ulang dengan tahun RPJMD yang aktif.
        </Alert>
      </Container>
    );
  }

  if (periodeIdValid === null || loading) {
    return (
      <Container className="my-5 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  return (
    <Container className={darkMode ? "dark-mode" : ""}>
      <Breadcrumb className="mt-3">
        <Breadcrumb.Item onClick={() => navigate("/dashboard-rpjmd")}>
          Dashboard
        </Breadcrumb.Item>
        <Breadcrumb.Item active>Tujuan RPJMD</Breadcrumb.Item>
      </Breadcrumb>

      <Card className="my-3">
        <Card.Body>
          <Card.Title>Daftar Tujuan RPJMD</Card.Title>

          <div className="d-flex flex-wrap align-items-center mb-3 gap-2">
            <InputGroup style={{ maxWidth: 300 }}>
              <Form.Control
                placeholder="Cari tujuan..."
                value={searchTerm}
                onChange={handleSearchChange}
              />
              <Button variant="outline-secondary" disabled>
                {searchLoading ? <Spinner size="sm" animation="border" /> : ""}
              </Button>
              <Button variant="outline-danger" onClick={handleResetSearch}>
                Reset
              </Button>
            </InputGroup>

            <Button variant="success" onClick={handleAdd}>
              Tambah Tujuan
            </Button>

            <OverlayTrigger
              placement="top"
              overlay={<Tooltip>Informasi fitur ini</Tooltip>}
            >
              <Button variant="info">
                <BsInfoCircle />
              </Button>
            </OverlayTrigger>

            <Button variant="secondary">
              <CSVLink
                data={tujuanList}
                filename="tujuan_rpjmd.csv"
                style={{ color: "inherit", textDecoration: "none" }}
              >
                Ekspor CSV
              </CSVLink>
            </Button>

            <Button
              variant="success"
              onClick={() => {
                if (exportType === "excel") {
                  handleExportExcel(exportScope === "current");
                } else {
                  handleExportPDF(exportScope === "current"); // ✅ benar
                }
              }}
            >
              Ekspor Excel
            </Button>

            <Button
              variant="danger"
              onClick={() => {
                if (totalPages <= 1) {
                  handleExportPDF(true); // ✅ benar
                } else {
                  setExportType("pdf");
                  setShowExportModal(true);
                }
              }}
            >
              Ekspor PDF
            </Button>

            <Button
              variant={darkMode ? "dark" : "light"}
              onClick={() => setDarkMode((prev) => !prev)}
            >
              {darkMode ? "Light Mode" : "Dark Mode"}
            </Button>

            <Form.Select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              style={{ width: "auto" }}
            >
              {[5, 10, 20, 50].map((num) => (
                <option key={num} value={num}>{`${num} baris`}</option>
              ))}
            </Form.Select>
          </div>

          {errorMsg && <Alert variant="danger">{errorMsg}</Alert>}

          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th style={{ width: "10%" }}>Kode</th>
                <th>Uraian Misi/Tujuan</th>
                <th style={{ width: "15%" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {tujuanList.length > 0 ? (
                tujuanList.map((t) => {
                  const isi = t.isi_tujuan.toLowerCase();
                  const keyword = searchQuery.toLowerCase();
                  const match = keyword && isi.includes(keyword);

                  return (
                    <React.Fragment key={t.id}>
                      <tr>
                        <td>{t.Misi?.no_misi || ""}</td>
                        <td colSpan={2}>{t.Misi?.isi_misi || ""}</td>
                      </tr>
                      <tr
                        ref={(el) => {
                          if (match) {
                            matchRefs.current.push({
                              element: el,
                              text: t.isi_tujuan,
                            });
                          }
                        }}
                      >
                        <td>{t.no_tujuan}</td>
                        <td>{highlightText(t.isi_tujuan, searchQuery)}</td>
                        <td>
                          <Button
                            size="sm"
                            className="me-2"
                            onClick={() => handleEdit(t)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDelete(t.id)}
                          >
                            Hapus
                          </Button>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={3} className="text-center text-danger">
                    {searchQuery
                      ? "Tidak ada yang cocok dengan pencarian."
                      : "Tidak ada data."}
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
                active={page === i + 1}
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
            {selectedTujuan ? "Edit Tujuan" : "Tambah Tujuan"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <TujuanForm
            key={formKey}
            initialData={selectedTujuan}
            onSuccess={handleSave}
          />
        </Modal.Body>
      </Modal>
      <Modal show={showExportModal} onHide={() => setShowExportModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Pilih Opsi Ekspor</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Check
              type="radio"
              name="exportScope"
              label="Ekspor semua halaman"
              defaultChecked
              onChange={() => setExportScope("all")}
            />
            <Form.Check
              type="radio"
              name="exportScope"
              label={`Ekspor halaman ini saja (halaman ${page})`}
              onChange={() => setExportScope("current")}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowExportModal(false)}>
            Batal
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setShowExportModal(false);
              if (exportType === "excel") {
                handleExportExcel(exportScope === "current");
              } else {
                handleExportPDF(exportScope === "current");
              }
            }}
          >
            Ekspor
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
