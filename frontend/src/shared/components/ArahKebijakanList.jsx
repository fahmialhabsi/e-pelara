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
import {
  extractListData,
  extractListMeta,
  normalizeListItems,
} from "@/utils/apiResponse";

/** Ukuran unduhan per request (harus ≤ batas backend getAll). */
const ARAH_CHUNK = 1000;
const ARAH_MAX_PAGES = 50;

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
  const pageSize = 10;
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

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
        const periodeList = extractListData(res.data);
        const valid = periodeList.some(
          (p) => user?.tahun >= p.tahun_awal && user?.tahun <= p.tahun_akhir
        );
        setPeriodeValid(valid);
      } catch {
        setPeriodeValid(false);
      }
    }
    if (user?.tahun) checkPeriode();
  }, [user]);

  /** Ambil semua baris dengan beberapa request berurutan (tanpa paginasi UI). */
  const loadAllArahChunks = useCallback(async () => {
    const merged = [];
    let truncated = false;
    for (let p = 1; p <= ARAH_MAX_PAGES; p += 1) {
      const res = await api.get("/arah-kebijakan", {
        params: {
          page: p,
          limit: ARAH_CHUNK,
          search,
          jenis_dokumen: dokumen,
          tahun,
        },
      });
      const batch = normalizeListItems(res.data);
      if (!batch.length) break;
      merged.push(...batch);
      if (batch.length < ARAH_CHUNK) break;
      if (p === ARAH_MAX_PAGES && batch.length === ARAH_CHUNK) {
        truncated = true;
        break;
      }
    }
    return { rows: merged, truncated };
  }, [search, dokumen, tahun]);

  const fetchArah = useCallback(
    async (overrides = {}) => {
      const pageNum = overrides.page != null ? overrides.page : page;
      setLoading(true);
      try {
        if (!dokumen || !tahun) {
          setArahList([]);
          setTotalPages(1);
          setTotalItems(0);
          setErrorMsg("");
          return;
        }

        const res = await api.get("/arah-kebijakan", {
          params: {
            page: pageNum,
            limit: pageSize,
            search,
            jenis_dokumen: dokumen,
            tahun,
          },
        });

        const list = normalizeListItems(res.data);
        const meta = extractListMeta(res.data);

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

        setArahList(list);
        setTotalPages(meta.totalPages || 1);
        setTotalItems(Number(meta.totalItems) || list.length);
        setErrorMsg("");
      } catch (err) {
        console.error("❌ Fetch arah kebijakan error:", err);
        setErrorMsg("Gagal memuat data arah kebijakan.");
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, search, dokumen, tahun, normalizedSearch]
  );

  useEffect(() => {
    if (periodeValid) fetchArah();
  }, [periodeValid, fetchArah]);

  useEffect(() => {
    setPage(1);
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
    setPage(1);
    fetchArah({ page: 1 });
  };

  const exportExcel = async () => {
    try {
      const { rows } = await loadAllArahChunks();
      const ws = XLSX.utils.json_to_sheet(
        rows.map((a) => ({
          Strategi: a.Strategi?.kode_strategi ?? "",
          KodeArah: a.kode_arah,
          Deskripsi: a.deskripsi,
        }))
      );
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "ArahKebijakan");
      XLSX.writeFile(wb, "arah_kebijakan.xlsx");
    } catch (err) {
      console.error(err);
      setErrorMsg("Gagal mengekspor Excel (ambil data lengkap).");
    }
  };
  const exportPdf = async () => {
    try {
      const { rows } = await loadAllArahChunks();
      const doc = new jsPDF();
      autoTable(doc, {
        head: [["No", "Strategi", "Kode Arah", "Uraian"]],
        body: rows.map((a, i) => [
          i + 1,
          a.Strategi?.kode_strategi ?? "",
          a.kode_arah,
          a.deskripsi,
        ]),
      });
      doc.save("arah_kebijakan.pdf");
    } catch (err) {
      console.error(err);
      setErrorMsg("Gagal mengekspor PDF (ambil data lengkap).");
    }
  };

  if (periodeValid === false) {
    return (
      <Container className="mt-5">
        <Alert variant="danger">
          Konteks periode login tidak berada dalam rentang RPJMD aktif. Hubungi admin atau login ulang.
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
    const sid = a.Strategi?.id ?? a.strategi_id;
    if (sid == null || sid === "") return;

    const key = String(sid);
    const match =
      normalizedSearch &&
      `${a.kode_arah} ${a.deskripsi}`.toLowerCase().includes(normalizedSearch);
    if (match) matchFound = true;

    if (!grouped[key]) {
      grouped[key] = {
        strategi:
          a.Strategi ||
          ({
            id: sid,
            kode_strategi: "—",
            deskripsi:
              "Strategi tidak termuat di respons (periksa relasi / ID).",
            Sasaran: null,
          }),
        arah: [],
      };
    }

    grouped[key].arah.push({ ...a, match });
  });

  Object.values(grouped).forEach((group) => {
    group.arah.sort((a, b) => b.match - a.match);
  });

  const groupedEntries = Object.entries(grouped).sort(([, ga], [, gb]) => {
    const ka = String(ga.strategi?.kode_strategi || "");
    const kb = String(gb.strategi?.kode_strategi || "");
    return ka.localeCompare(kb, "id", { numeric: true });
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
          <p className="text-muted small mb-2">
            {totalItems > 0
              ? `Halaman ${page} dari ${totalPages} — ${pageSize} baris per halaman (total ${totalItems} arah kebijakan).`
              : "Belum ada data."}
            {search ? " Filter pencarian aktif." : ""}
          </p>
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
              {groupedEntries.map(([gKey, { strategi, arah }]) => (
                <React.Fragment key={gKey}>
                  <tr>
                    <td>{strategi.Sasaran?.nomor ?? "—"}</td>
                    <td>
                      <strong>Sasaran:</strong>{" "}
                      {strategi.Sasaran?.isi_sasaran ?? (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td />
                  </tr>
                  <tr>
                    <td>{highlightText(strategi.kode_strategi)}</td>
                    <td>
                      <strong>Strategi:</strong>{" "}
                      {highlightText(strategi.deskripsi)}
                    </td>
                    <td />
                  </tr>
                  {arah.map((a) => (
                    <tr key={a.id}>
                      <td className="ps-4">{highlightText(a.kode_arah)}</td>
                      <td>
                        <strong>Arah Kebijakan:</strong>{" "}
                        {highlightText(a.deskripsi)}
                      </td>
                      <td className="text-center text-nowrap">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="me-2"
                          onClick={() => handleEdit(a)}
                          aria-label="Edit"
                        >
                          <FaEdit />
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleDelete(a.id)}
                          aria-label="Hapus"
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

          {totalItems > 0 && (
            <Pagination className="justify-content-center flex-wrap mt-3">
              <Pagination.First
                disabled={page === 1}
                onClick={() => setPage(1)}
              />
              <Pagination.Prev
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
              />
              {Array.from({ length: totalPages }, (_, idx) => (
                <Pagination.Item
                  key={idx + 1}
                  active={idx + 1 === page}
                  onClick={() => setPage(idx + 1)}
                >
                  {idx + 1}
                </Pagination.Item>
              ))}
              <Pagination.Next
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              />
              <Pagination.Last
                disabled={page >= totalPages}
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
