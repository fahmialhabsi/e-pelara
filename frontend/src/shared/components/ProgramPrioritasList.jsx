import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Table,
  Button,
  Alert,
  Spinner,
  Breadcrumb,
  InputGroup,
  Form,
  Pagination,
  Container,
  Modal,
  Accordion,
  Card,
} from "react-bootstrap";
import { useNavigate, useLocation } from "react-router-dom";
import { CSVLink } from "react-csv";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import api from "../../services/api";
import { usePeriode } from "@/contexts/PeriodeContext";
import { useDokumen } from "@/hooks/useDokumen";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useDarkMode } from "@/hooks/useDarkMode";
import ProgramNestedView from "../../shared/components/ProgramNestedView";
import {
  extractListMeta,
  normalizeListItems,
} from "@/utils/apiResponse";

export default function ProgramPrioritasList() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: periode_id, loading: periodeLoading, tahun_awal } = usePeriode();
  const { dokumen } = useDokumen();

  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("kode_program");
  const [sortOrder, setSortOrder] = useState("ASC");
  const [filterOpd, setFilterOpd] = useState("");
  const [filterPrioritas, setFilterPrioritas] = useState("");
  const highlightRef = useRef(null);
  const [isDarkMode, setDarkMode] = useDarkMode();
  const limit = 10;

  const fetchPrograms = useCallback(async () => {
    if (!periode_id || !dokumen || !tahun_awal) return;
    setLoading(true);
    try {
      const res = await api.get("/programs", {
        params: {
          periode_id,
          page,
          limit,
          search: search.trim() || undefined,
          tahun: tahun_awal,
          jenis_dokumen: dokumen,
          sortField,
          sortOrder,
          opd: filterOpd,
          prioritas: filterPrioritas,
        },
      });

      const rawPrograms = normalizeListItems(res.data);
      const meta = extractListMeta(res.data);

      const processed = rawPrograms.map((program) => {
        const strategiList = program.Strategi ?? [];
        const arahList = program.ArahKebijakan ?? [];

        console.log("✅ Program:", program);
        console.log("✅ Strategi:", strategiList);
        console.log("✅ ArahKebijakan:", arahList);

        return {
          ...program,
          opd_penanggung_jawab:
            program.opd?.nama_opd || program.opd_penanggung_jawab,
          bidang_opd_penanggung_jawab:
            program.opd?.nama_bidang_opd || program.bidang_opd_penanggung_jawab,
          Strategi: strategiList,
          ArahKebijakan: arahList,
        };
      });
      console.log("🚀 ~ rawPrograms:", rawPrograms)

      setPrograms(processed);
      setTotalPages(meta.totalPages || 1);
      setErrorMsg("");
    } catch (err) {
      console.error("❌ Gagal fetch programs:", err?.response || err);
      setErrorMsg("Gagal memuat daftar program.");
    } finally {
      setLoading(false);
    }
  }, [
    periode_id,
    page,
    limit,
    search,
    dokumen,
    tahun_awal,
    sortField,
    sortOrder,
    filterOpd,
    filterPrioritas,
  ]);

  useEffect(() => {
    if (!periodeLoading) fetchPrograms();
  }, [periodeLoading, fetchPrograms]);

  useEffect(() => {
    if (location.state?.reload) {
      fetchPrograms();
      window.history.replaceState({}, document.title);
    }
  }, [location.state, fetchPrograms]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      setSearch(searchInput);
    }, 500);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    if (highlightRef.current) {
      highlightRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [search, programs]);

  const getHighlightedText = (text, highlight, isDark = false) => {
    if (!text) return <em className="text-muted">(Tidak tersedia)</em>;
    if (!highlight) return text;
    const safeHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${safeHighlight})`, "gi");
    const parts = text.split(regex);
    const markStyle = {
      backgroundColor: isDark ? "#3a3f4b" : "#b4f1a1",
      color: isDark ? "#fff" : "#1b4600",
      fontWeight: "bold",
      padding: "0 2px",
      borderRadius: "2px",
    };
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} style={markStyle} ref={i === 1 ? highlightRef : null}>
          {part}
        </mark>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      )
    );
  };

  const isProgramMatch = (program, keyword) => {
    if (!keyword) return true;
    const k = keyword.toLowerCase();
    const strategiMatch = program.Strategi?.some((s) =>
      `${s.kode_strategi} ${s.deskripsi}`.toLowerCase().includes(k)
    );
    const arahMatch = program.ArahKebijakan?.some((a) =>
      `${a.kode_arah} ${a.deskripsi}`.toLowerCase().includes(k)
    );
    const tujuanMatch =
      program.tujuan?.isi_tujuan?.toLowerCase().includes(k) ||
      program.tujuan?.no_tujuan?.toLowerCase().includes(k);
    const sasaranMatch =
      program.sasaran?.isi_sasaran?.toLowerCase().includes(k) ||
      program.sasaran?.nomor?.toLowerCase().includes(k);
    return (
      program.kode_program.toLowerCase().includes(k) ||
      program.nama_program.toLowerCase().includes(k) ||
      program.opd_penanggung_jawab?.toLowerCase().includes(k) ||
      program.bidang_opd_penanggung_jawab?.toLowerCase().includes(k) ||
      strategiMatch ||
      arahMatch ||
      tujuanMatch ||
      sasaranMatch
    );
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      programs.map((p) => ({
        Kode: p.kode_program,
        NamaProgram: p.nama_program,
        PaguAnggaran: p.pagu_anggaran?.toLocaleString("id-ID") || "-",
        OPD: p.opd_penanggung_jawab,
        Bidang: p.bidang_opd_penanggung_jawab,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ProgramPrioritas");
    XLSX.writeFile(wb, "program_prioritas.xlsx");
  };

  const exportPdf = () => {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [["#", "Kode", "Nama Program", "OPD", "Bidang"]],
      body: programs.map((p, i) => [
        i + 1 + (page - 1) * limit,
        p.kode_program,
        p.nama_program,
        p.pagu_anggaran?.toLocaleString("id-ID") || "-",
        p.opd_penanggung_jawab,
        p.bidang_opd_penanggung_jawab,
      ]),
    });
    doc.save("program_prioritas.pdf");
  };

  const filteredPrograms = React.useMemo(() => {
    const keywordOpd = filterOpd.toLowerCase();
    const keywordSearch = search.toLowerCase();

    const isMatchOpd = (program) => {
      const namaOpd = program.opd_penanggung_jawab?.toLowerCase() || "";
      return namaOpd.includes(keywordOpd);
    };

    const isMatchSearch = (program) => isProgramMatch(program, keywordSearch);

    return programs.filter(
      (program) => isMatchOpd(program) && isMatchSearch(program)
    );
  }, [programs, filterOpd, search]);

  const groupedPrograms = React.useMemo(() => {
    const groups = {};
    for (const program of filteredPrograms) {
      const key = program.opd_penanggung_jawab || "Lainnya";
      if (!groups[key]) groups[key] = [];
      groups[key].push(program);
    }
    return Object.entries(groups);
  }, [filteredPrograms]);

  useEffect(() => {
    console.log(
      "📦 programs (debug):",
      programs.map((p) => ({
        id: p.id,
        opd_penanggung_jawab: p.opd_penanggung_jawab,
        nama_program: p.nama_program,
      }))
    );
  }, [programs]);

  useEffect(() => {
    console.log("🔍 Filter OPD aktif:", filterOpd);
    programs.forEach((program) => {
      console.log("🧾 Program OPD:", program.opd_penanggung_jawab);
    });
  }, [programs, filterOpd]);

  return (
    <Container className="mt-4">
      <Breadcrumb>
        <Breadcrumb.Item onClick={() => navigate("/dashboard-rpjmd")}>
          Home
        </Breadcrumb.Item>
        <Breadcrumb.Item active>Program Prioritas</Breadcrumb.Item>
      </Breadcrumb>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />

      {/* Filter */}
      <div className="mb-3 d-flex gap-3 align-items-end flex-wrap">
        <Form.Group>
          <Form.Label>Filter OPD</Form.Label>
          <Form.Control
            value={filterOpd}
            onChange={(e) => setFilterOpd(e.target.value)}
            placeholder="Nama OPD"
          />
        </Form.Group>
        <Form.Group>
          <Form.Label>Prioritas</Form.Label>
          <Form.Select
            value={filterPrioritas}
            onChange={(e) => setFilterPrioritas(e.target.value)}
          >
            <option value="">Semua</option>
            <option value="Tinggi">Tinggi</option>
            <option value="Sedang">Sedang</option>
            <option value="Rendah">Rendah</option>
          </Form.Select>
        </Form.Group>
        <Button
          onClick={() => {
            setPage(1);
            fetchPrograms();
          }}
          variant="primary"
        >
          Terapkan Filter
        </Button>
      </div>

      {/* Search & Tools */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <InputGroup style={{ maxWidth: 300 }}>
          <Form.Control
            placeholder="Cari..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            autoComplete="off"
          />
          <Button
            onClick={() => {
              setPage(1);
              setSearch(searchInput);
            }}
          >
            Cari
          </Button>
        </InputGroup>
        <div className="d-flex gap-2 flex-wrap">
          <Button variant="success" onClick={() => navigate("/program")}>
            Tambah Program
          </Button>
          <CSVLink
            data={programs.map((p) => ({
              Kode: p.kode_program,
              NamaProgram: p.nama_program,
              PaguAnggaran: p.pagu_anggaran?.toLocaleString("id-ID") || "-",
              OPD: p.opd_penanggung_jawab,
              Bidang: p.bidang_opd_penanggung_jawab,
            }))}
            filename="program_prioritas.csv"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            CSV
          </CSVLink>
          <Button variant="success" onClick={exportExcel}>
            Excel
          </Button>
          <Button variant="danger" onClick={exportPdf}>
            PDF
          </Button>
          <Button
            variant={isDarkMode ? "light" : "dark"}
            onClick={() => setDarkMode(!isDarkMode)}
          >
            {isDarkMode ? "🌞 Terang" : "🌙 Gelap"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" />
        </div>
      ) : filteredPrograms.length === 0 ? (
        <Alert variant="info">Tidak ada yang cocok dengan pencarian.</Alert>
      ) : (
        <Accordion defaultActiveKey="0" alwaysOpen>
          {groupedPrograms.map(([key, group], idx) => (
            <Accordion.Item eventKey={idx.toString()} key={key}>
              <Accordion.Header>{key}</Accordion.Header>
              <Accordion.Body>
                <ProgramNestedView
                  data={group}
                  onEdit={(program) => navigate(`/program-edit/${program.id}`)}
                  onDelete={async (id) => {
                    if (
                      window.confirm(
                        "Apakah Anda yakin ingin menghapus program ini?"
                      )
                    ) {
                      try {
                        await api.delete(`/programs/${id}`);
                        toast.success("Program berhasil dihapus.");
                        fetchPrograms();
                      } catch (error) {
                        console.error("❌ Gagal menghapus program:", error);
                        toast.error("Gagal menghapus program.");
                      }
                    }
                  }}
                />
              </Accordion.Body>
            </Accordion.Item>
          ))}
        </Accordion>
      )}

      {/* Pagination */}
      <Pagination className="justify-content-center mt-3">
        <Pagination.First disabled={page === 1} onClick={() => setPage(1)} />
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
    </Container>
  );
}
