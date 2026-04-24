/**
 * CascadingList.jsx — Dashboard Cascading RPJMD
 *
 * Tampilan utama untuk melihat, mencari, menambah, mengubah, dan menghapus
 * data cascading. Menampilkan statistik ringkas dan hierarki yang bisa dinavigasi.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Table,
  Button,
  Card,
  Alert,
  Spinner,
  Breadcrumb,
  InputGroup,
  Form,
  Pagination,
  Badge,
  Row,
  Col,
  Modal,
} from "react-bootstrap";
import api from "../../services/api";
import { CSVLink } from "react-csv";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import CascadingForm from "./CascadingForm";
import CascadingNestedView from "./CascadingNestedView";
import { useDokumen } from "../../hooks/useDokumen";
import { usePeriodeAktif } from "../../features/rpjmd/hooks/usePeriodeAktif";
import { isDokumenLevelPeriode } from "../../utils/planningDokumenUtils";
import {
  cascadingPrioritasDisplayLabel,
  cascadingPrioritasTooltipText,
  CASCADING_PRIORITAS_NASIONAL_FIELDS,
  CASCADING_PRIORITAS_DAERAH_FIELDS,
  CASCADING_PRIORITAS_GUB_FIELDS,
} from "../../utils/cascadingPrioritasLabels";
import {
  extractListMeta,
  normalizeListItems,
} from "@/utils/apiResponse";
import {
  BsPlus,
  BsFileEarmarkExcel,
  BsFileEarmarkText,
  BsSearch,
  BsGrid3X3GapFill,
  BsListUl,
  BsArrowCounterclockwise,
} from "react-icons/bs";

// ─── Komponen StatCard ────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color }) {
  return (
    <Card className={`border-0 shadow-sm h-100 border-start border-4 border-${color}`}>
      <Card.Body className="d-flex align-items-center gap-3 py-3">
        <div style={{ fontSize: "1.8rem" }}>{icon}</div>
        <div>
          <div className="text-muted small">{label}</div>
          <div className={`fw-bold fs-4 text-${color}`}>{value}</div>
        </div>
      </Card.Body>
    </Card>
  );
}

// ─── Komponen tabel baris flat ────────────────────────────────────────────────

function CascadingTableRow({ item, onEdit, onDelete, onDetail }) {
  return (
    <tr>
      <td className="align-middle small">
        {item.misi ? (
          <span title={item.misi.isi_misi}>
            <strong>{item.misi.no_misi}</strong>
            {" — "}
            <span className="text-muted">
              {item.misi.isi_misi?.length > 40
                ? item.misi.isi_misi.substring(0, 40) + "…"
                : item.misi.isi_misi}
            </span>
          </span>
        ) : <span className="text-muted">—</span>}
      </td>
      <td className="align-middle small">
        {item.tujuan ? (
          <span title={item.tujuan.isi_tujuan}>
            {item.tujuan.isi_tujuan?.length > 40
              ? item.tujuan.isi_tujuan.substring(0, 40) + "…"
              : item.tujuan.isi_tujuan}
          </span>
        ) : <span className="text-muted">—</span>}
      </td>
      <td className="align-middle small">
        {item.sasaran ? (
          <span title={item.sasaran.isi_sasaran}>
            <strong>{item.sasaran.nomor}</strong>
            {" — "}
            {item.sasaran.isi_sasaran?.length > 35
              ? item.sasaran.isi_sasaran.substring(0, 35) + "…"
              : item.sasaran.isi_sasaran}
          </span>
        ) : <span className="text-muted">—</span>}
      </td>
      <td className="align-middle small">
        {item.program ? (
          <span title={item.program.nama_program}>
            <code className="text-primary me-1">{item.program.kode_program}</code>
            {item.program.nama_program?.length > 35
              ? item.program.nama_program.substring(0, 35) + "…"
              : item.program.nama_program}
          </span>
        ) : <span className="text-muted">—</span>}
      </td>
      <td className="align-middle small">
        {item.kegiatan ? (
          <span title={item.kegiatan.nama_kegiatan}>
            <code className="text-success me-1">{item.kegiatan.kode_kegiatan}</code>
            {item.kegiatan.nama_kegiatan?.length > 35
              ? item.kegiatan.nama_kegiatan.substring(0, 35) + "…"
              : item.kegiatan.nama_kegiatan}
          </span>
        ) : <span className="text-muted">—</span>}
      </td>
      <td className="align-middle">
        <div className="d-flex flex-wrap gap-1">
          {item.priorNasional && (
            <Badge
              bg="primary"
              className="text-truncate"
              style={{ maxWidth: 140, verticalAlign: "middle" }}
              title={cascadingPrioritasTooltipText(
                item.priorNasional,
                CASCADING_PRIORITAS_NASIONAL_FIELDS,
              ).replace(/\n/g, " · ")}
            >
              {cascadingPrioritasDisplayLabel(
                item.priorNasional,
                CASCADING_PRIORITAS_NASIONAL_FIELDS,
              ) || "—"}
            </Badge>
          )}
          {item.priorDaerah && (
            <Badge
              bg="info"
              className="text-truncate"
              style={{ maxWidth: 140, verticalAlign: "middle" }}
              title={cascadingPrioritasTooltipText(
                item.priorDaerah,
                CASCADING_PRIORITAS_DAERAH_FIELDS,
              ).replace(/\n/g, " · ")}
            >
              {cascadingPrioritasDisplayLabel(
                item.priorDaerah,
                CASCADING_PRIORITAS_DAERAH_FIELDS,
              ) || "—"}
            </Badge>
          )}
          {item.priorKepda && (
            <Badge
              bg="warning"
              text="dark"
              className="text-truncate"
              style={{ maxWidth: 140, verticalAlign: "middle" }}
              title={cascadingPrioritasTooltipText(
                item.priorKepda,
                CASCADING_PRIORITAS_GUB_FIELDS,
              ).replace(/\n/g, " · ")}
            >
              {cascadingPrioritasDisplayLabel(
                item.priorKepda,
                CASCADING_PRIORITAS_GUB_FIELDS,
              ) || "—"}
            </Badge>
          )}
        </div>
      </td>
      <td className="align-middle">
        <div className="d-flex gap-1">
          {onDetail && (
            <Button variant="outline-secondary" size="sm" onClick={() => onDetail(item)} title="Detail">
              👁
            </Button>
          )}
          {onEdit && (
            <Button variant="outline-primary" size="sm" onClick={() => onEdit(item)} title="Ubah">
              ✏️
            </Button>
          )}
          {onDelete && (
            <Button variant="outline-danger" size="sm" onClick={() => onDelete(item.id)} title="Hapus">
              🗑
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Komponen utama ──────────────────────────────────────────────────────────

export function CascadingList() {
  const navigate = useNavigate();
  const { dokumen, tahun } = useDokumen();
  const { periode_id, periodeList } = usePeriodeAktif();
  const periodeAktif = periodeList.find(
    (p) => String(p.id) === String(periode_id),
  );

  const [cascadings, setCascadings] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(true);

  const [page, setPage]       = useState(1);
  const [pageSize]            = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [viewMode, setViewMode] = useState("nested"); // "nested" | "table"
  const [showAddModal, setShowAddModal] = useState(false);
  const [formKey, setFormKey] = useState(0);

  // ── Fetch data ─────────────────────────────────────────────────────────────
  const fetchCascadings = useCallback(async () => {
    if (!dokumen || !tahun) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await api.get("/cascading", {
        params: {
          page,
          limit: pageSize,
          search: searchTerm,
          jenis_dokumen: dokumen,
          tahun,
        },
      });
      const dataList = normalizeListItems(res.data);
      const meta = extractListMeta(res.data);
      setCascadings(dataList);
      setTotalPages(meta.totalPages || 1);
      setTotalItems(meta.totalItems || dataList.length);
    } catch (err) {
      console.error("Error fetching cascading:", err);
      setErrorMsg("Gagal memuat data cascading. Coba refresh halaman.");
    } finally {
      setLoading(false);
    }
  }, [dokumen, tahun, page, pageSize, searchTerm]);

  useEffect(() => {
    fetchCascadings();
  }, [fetchCascadings]);

  // ── Hitung statistik dari data yang ada ───────────────────────────────────
  const stats = React.useMemo(() => {
    const misiSet    = new Set();
    const tujuanSet  = new Set();
    const sasaranSet = new Set();
    const programSet = new Set();
    const kegiatanSet= new Set();
    cascadings.forEach((c) => {
      if (c.misi_id)     misiSet.add(c.misi_id);
      if (c.tujuan_id)   tujuanSet.add(c.tujuan_id);
      if (c.sasaran_id)  sasaranSet.add(c.sasaran_id);
      if (c.program_id)  programSet.add(c.program_id);
      if (c.kegiatan_id) kegiatanSet.add(c.kegiatan_id);
    });
    return {
      misi:     misiSet.size,
      tujuan:   tujuanSet.size,
      sasaran:  sasaranSet.size,
      program:  programSet.size,
      kegiatan: kegiatanSet.size,
      total:    totalItems,
    };
  }, [cascadings, totalItems]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleEdit   = (item) => navigate(`/rpjmd/cascading-edit/${item.id}`);
  const handleDetail = (item) => navigate(`/rpjmd/cascading-detail/${item.id}`);

  const handleDelete = async (id) => {
    if (!window.confirm("Yakin ingin menghapus data cascading ini?\nTindakan ini tidak dapat dibatalkan.")) return;
    try {
      await api.delete(`/cascading/${id}`);
      fetchCascadings();
    } catch (err) {
      console.error(err);
      setErrorMsg("Gagal menghapus data cascading.");
    }
  };

  const handleSaved = () => {
    setShowAddModal(false);
    fetchCascadings();
  };

  const handleSearch = () => {
    setSearchTerm(searchInput);
    setPage(1);
  };

  const handleResetSearch = () => {
    setSearchInput("");
    setSearchTerm("");
    setPage(1);
  };

  // ── Export ─────────────────────────────────────────────────────────────────
  const csvData = cascadings.map((c, i) => ({
    No: i + 1,
    Misi:               c.misi     ? `${c.misi.no_misi} - ${c.misi.isi_misi}` : "",
    Tujuan:             c.tujuan   ? `${c.tujuan.no_tujuan} - ${c.tujuan.isi_tujuan}` : "",
    Sasaran:            c.sasaran  ? `${c.sasaran.nomor} - ${c.sasaran.isi_sasaran}` : "",
    Prioritas_Nasional: c.priorNasional
      ? cascadingPrioritasDisplayLabel(c.priorNasional, CASCADING_PRIORITAS_NASIONAL_FIELDS)
      : "",
    Prioritas_Daerah: c.priorDaerah
      ? cascadingPrioritasDisplayLabel(c.priorDaerah, CASCADING_PRIORITAS_DAERAH_FIELDS)
      : "",
    Prioritas_Gubernur: c.priorKepda
      ? cascadingPrioritasDisplayLabel(c.priorKepda, CASCADING_PRIORITAS_GUB_FIELDS)
      : "",
    Strategi:           (c.strategis || []).map((s) => s.kode_strategi).join("; "),
    Arah_Kebijakan:     (c.arahKebijakans || []).map((a) => a.kode_arah).join("; "),
    Program:            c.program   ? `${c.program.kode_program} - ${c.program.nama_program}` : "",
    Kegiatan:           c.kegiatan  ? `${c.kegiatan.kode_kegiatan} - ${c.kegiatan.nama_kegiatan}` : "",
    Sub_Kegiatan:       c.subKegiatan ? `${c.subKegiatan.kode_sub_kegiatan || ""} - ${c.subKegiatan.nama_sub_kegiatan || ""}` : "",
  }));

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(csvData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cascading");
    XLSX.writeFile(wb, `cascading_${String(dokumen || "").toUpperCase()}_${tahun}.xlsx`);
  };

  // ── Pagination helpers ─────────────────────────────────────────────────────
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pages = [];
    const range = 2;
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - range && i <= page + range)) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== "…") {
        pages.push("…");
      }
    }
    return (
      <Pagination className="justify-content-center mt-3 mb-0">
        <Pagination.Prev disabled={page === 1} onClick={() => setPage((p) => p - 1)} />
        {pages.map((p, i) =>
          p === "…" ? (
            <Pagination.Ellipsis key={`e-${i}`} disabled />
          ) : (
            <Pagination.Item key={p} active={p === page} onClick={() => setPage(p)}>
              {p}
            </Pagination.Item>
          )
        )}
        <Pagination.Next disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} />
      </Pagination>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (!dokumen || !tahun) {
    return (
      <div className="container my-5 text-center">
        <Alert variant="warning">
          {isDokumenLevelPeriode(dokumen)
            ? "Atur jenis dokumen di header. RPJMD/Renstra memakai periode lima tahun (acuan internal otomatis)."
            : "Silakan pilih jenis dokumen dan konteks waktu di header terlebih dahulu untuk melihat data cascading."}
        </Alert>
      </div>
    );
  }

  return (
    <div className="container-fluid px-3 py-3">
      <Breadcrumb>
        <Breadcrumb.Item onClick={() => navigate("/dashboard")}>Home</Breadcrumb.Item>
        <Breadcrumb.Item active>Cascading RPJMD</Breadcrumb.Item>
      </Breadcrumb>

      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h5 className="mb-0 fw-bold">
            Cascading RPJMD
            <Badge bg="primary" className="ms-2" style={{ fontSize: "0.75rem" }}>
              {String(dokumen || "").toUpperCase()}
            </Badge>
            <Badge bg="secondary" className="ms-1" style={{ fontSize: "0.75rem" }}>
              {isDokumenLevelPeriode(dokumen) && periodeAktif?.tahun_awal != null
                ? `Periode ${periodeAktif.tahun_awal}–${periodeAktif.tahun_akhir}`
                : tahun}
            </Badge>
          </h5>
          <small className="text-muted">
            Keterkaitan Misi → Tujuan → Sasaran → Strategi → Program → Kegiatan
          </small>
        </div>
        <Button
          variant="primary"
          onClick={() => { setFormKey((k) => k + 1); setShowAddModal(true); }}
          className="d-flex align-items-center gap-1"
        >
          <BsPlus size={20} /> Tambah Cascading
        </Button>
      </div>

      {/* Statistik */}
      <Row className="g-2 mb-3">
        <Col xs={6} sm={4} md={2}>
          <StatCard label="Total Entri"  value={stats.total}    icon="🔗" color="primary" />
        </Col>
        <Col xs={6} sm={4} md={2}>
          <StatCard label="Misi"         value={stats.misi}     icon="🎖️" color="info" />
        </Col>
        <Col xs={6} sm={4} md={2}>
          <StatCard label="Tujuan"       value={stats.tujuan}   icon="🏹" color="success" />
        </Col>
        <Col xs={6} sm={4} md={2}>
          <StatCard label="Sasaran"      value={stats.sasaran}  icon="🎯" color="warning" />
        </Col>
        <Col xs={6} sm={4} md={2}>
          <StatCard label="Program"      value={stats.program}  icon="📂" color="secondary" />
        </Col>
        <Col xs={6} sm={4} md={2}>
          <StatCard label="Kegiatan"     value={stats.kegiatan} icon="📁" color="danger" />
        </Col>
      </Row>

      {/* Toolbar */}
      <Card className="shadow-sm mb-3">
        <Card.Body className="py-2">
          <div className="d-flex flex-wrap align-items-center gap-2">
            {/* Search */}
            <InputGroup style={{ maxWidth: 320 }}>
              <Form.Control
                placeholder="Cari misi, tujuan, kegiatan…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              {searchTerm && (
                <Button variant="outline-secondary" onClick={handleResetSearch} title="Reset pencarian">
                  <BsArrowCounterclockwise />
                </Button>
              )}
              <Button variant="outline-primary" onClick={handleSearch}>
                <BsSearch />
              </Button>
            </InputGroup>

            {/* View toggle */}
            <div className="btn-group" role="group">
              <Button
                variant={viewMode === "nested" ? "primary" : "outline-primary"}
                size="sm"
                onClick={() => setViewMode("nested")}
                title="Tampilan Hierarki"
              >
                <BsGrid3X3GapFill /> Hierarki
              </Button>
              <Button
                variant={viewMode === "table" ? "primary" : "outline-primary"}
                size="sm"
                onClick={() => setViewMode("table")}
                title="Tampilan Tabel"
              >
                <BsListUl /> Tabel
              </Button>
            </div>

            <div className="ms-auto d-flex gap-2">
              <Button variant="outline-success" size="sm" onClick={handleExportExcel}>
                <BsFileEarmarkExcel className="me-1" /> Excel
              </Button>
              <Button variant="outline-secondary" size="sm">
                <CSVLink
                  data={csvData}
                  filename={`cascading_${String(dokumen || "").toUpperCase()}_${tahun}.csv`}
                  style={{ color: "inherit", textDecoration: "none" }}
                >
                  <BsFileEarmarkText className="me-1" /> CSV
                </CSVLink>
              </Button>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Pesan error */}
      {errorMsg && (
        <Alert variant="danger" dismissible onClose={() => setErrorMsg("")}>
          {errorMsg}
        </Alert>
      )}

      {/* Konten utama */}
      <Card className="shadow-sm">
        <Card.Body>
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" role="status" />
              <div className="mt-2 text-muted">Memuat data cascading…</div>
            </div>
          ) : cascadings.length === 0 ? (
            <div className="text-center py-5 text-muted">
              {searchTerm ? (
                <>
                  <div style={{ fontSize: "2rem" }}>🔍</div>
                  <p>Tidak ditemukan hasil untuk "{searchTerm}"</p>
                  <Button variant="outline-secondary" size="sm" onClick={handleResetSearch}>
                    Reset Pencarian
                  </Button>
                </>
              ) : (
                <>
                  <div style={{ fontSize: "2rem" }}>📋</div>
                  <p>Belum ada data cascading untuk {String(dokumen || "").toUpperCase()} tahun {tahun}.</p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => { setFormKey((k) => k + 1); setShowAddModal(true); }}
                  >
                    <BsPlus /> Tambah Cascading Pertama
                  </Button>
                </>
              )}
            </div>
          ) : viewMode === "nested" ? (
            <CascadingNestedView
              data={cascadings}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onDetail={handleDetail}
            />
          ) : (
            // Tampilan tabel flat
            <div className="table-responsive">
              <Table hover bordered size="sm" className="align-middle">
                <thead className="table-light">
                  <tr>
                    <th style={{ minWidth: 160 }}>Misi</th>
                    <th style={{ minWidth: 160 }}>Tujuan</th>
                    <th style={{ minWidth: 160 }}>Sasaran</th>
                    <th style={{ minWidth: 180 }}>Program</th>
                    <th style={{ minWidth: 180 }}>Kegiatan</th>
                    <th style={{ minWidth: 80  }}>Prioritas</th>
                    <th style={{ minWidth: 100 }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {cascadings.map((item) => (
                    <CascadingTableRow
                      key={item.id}
                      item={item}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onDetail={handleDetail}
                    />
                  ))}
                </tbody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {!loading && cascadings.length > 0 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <small className="text-muted">
                Halaman {page} dari {totalPages} · Total {totalItems} entri
              </small>
              {renderPagination()}
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Modal Tambah */}
      <Modal
        show={showAddModal}
        onHide={() => setShowAddModal(false)}
        size="xl"
        centered
        scrollable
      >
        <Modal.Header closeButton>
          <Modal.Title>➕ Tambah Cascading Baru</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <CascadingForm key={formKey} onSaved={handleSaved} />
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default CascadingList;
