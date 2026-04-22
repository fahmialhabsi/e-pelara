import React, { useState, useEffect, useCallback, Fragment } from "react";
import {
  Table,
  Button,
  Card,
  Alert,
  Modal,
  Spinner,
  Breadcrumb,
  InputGroup,
  Form,
  Pagination,
} from "react-bootstrap";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import {
  deleteIndikatorRpjmd,
  fetchIndikatorRpjmdList,
} from "@/features/rpjmd/services/indikatorRpjmdApi";
import { useDokumen } from "@/hooks/useDokumen";
import { isDokumenLevelPeriode } from "@/utils/planningDokumenUtils";
import { useDarkMode } from "../../hooks/useDarkMode";
import * as XLSX from "xlsx";
import IndikatorEditModal from "./IndikatorEditModal";
import IndikatorRPJMDForm from "./IndikatorRPJMDForm";
import {
  LEVEL_DOKUMEN_OPTIONS,
  JENIS_IKU_OPTIONS,
} from "../../utils/constants";

/* Urutan = hirarki RPJMD: Tujuan → Sasaran → Strategi → Arah → Program → Kegiatan → Sub Kegiatan */
const types = [
  { value: "tujuan", label: "Indikator Tujuan", endpoint: "indikator-tujuans" },
  {
    value: "sasaran",
    label: "Indikator Sasaran",
    endpoint: "indikator-sasaran",
  },
  {
    value: "strategi",
    label: "Indikator Strategi",
    endpoint: "indikator-strategi",
  },
  {
    value: "arah_kebijakan",
    label: "Indikator Arah Kebijakan",
    endpoint: "indikator-arah-kebijakan",
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
  {
    value: "sub_kegiatan_indikator",
    label: "Indikator Sub Kegiatan",
    endpoint: "indikator-sub-kegiatan",
  },
];

/** Nilai sel untuk tabel / Excel — hindari [object Object] */
function scalarCell(v) {
  if (v == null || v === "") return "";
  if (typeof v === "object") {
    if (v.nama_opd != null) return String(v.nama_opd);
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

/**
 * Kolom ekspor Excel (urutan stabil). Sumber field = response API list/detail.
 * @type {{ header: string, key?: string, accessor?: (row: Record<string, unknown>) => string }[]}
 */
const INDIKATOR_EXPORT_COLUMNS = [
  { header: "Kode Indikator", key: "kode_indikator" },
  { header: "Nama Indikator", key: "nama_indikator" },
  { header: "Satuan", key: "satuan" },
  { header: "Jenis Indikator", key: "jenis_indikator" },
  { header: "Tipe Indikator", key: "tipe_indikator" },
  { header: "Jenis (uraian)", key: "jenis" },
  { header: "Tolok Ukur Kinerja", key: "tolok_ukur_kinerja" },
  { header: "Target Kinerja", key: "target_kinerja" },
  { header: "Baseline", key: "baseline" },
  { header: "Target (th. ke-1)", key: "target_tahun_1" },
  { header: "Target (th. ke-2)", key: "target_tahun_2" },
  { header: "Target (th. ke-3)", key: "target_tahun_3" },
  { header: "Target (th. ke-4)", key: "target_tahun_4" },
  { header: "Target (th. ke-5)", key: "target_tahun_5" },
  { header: "Capaian (th. ke-1)", key: "capaian_tahun_1" },
  { header: "Capaian (th. ke-2)", key: "capaian_tahun_2" },
  { header: "Capaian (th. ke-3)", key: "capaian_tahun_3" },
  { header: "Capaian (th. ke-4)", key: "capaian_tahun_4" },
  { header: "Capaian (th. ke-5)", key: "capaian_tahun_5" },
  { header: "Definisi Operasional", key: "definisi_operasional" },
  { header: "Metode Penghitungan", key: "metode_penghitungan" },
  { header: "Kriteria Kuantitatif", key: "kriteria_kuantitatif" },
  { header: "Kriteria Kualitatif", key: "kriteria_kualitatif" },
  { header: "Sumber Data", key: "sumber_data" },
  {
    header: "OPD Penanggung Jawab",
    accessor: (row) =>
      scalarCell(row.opdPenanggungJawab?.nama_opd) ||
      scalarCell(row.nama_opd_penanggung) ||
      scalarCell(row.penanggung_jawab),
  },
  { header: "Keterangan", key: "keterangan" },
  { header: "Rekomendasi AI", key: "rekomendasi_ai" },
  { header: "Acuan (kalender)", key: "tahun" },
  { header: "Jenis Dokumen", key: "jenis_dokumen" },
  { header: "Misi ID", key: "misi_id" },
  { header: "Tujuan ID", key: "tujuan_id" },
  { header: "Sasaran ID", key: "sasaran_id" },
  { header: "Program ID", key: "program_id" },
  { header: "Kegiatan ID", key: "kegiatan_id" },
  { header: "Indikator Program ID", key: "indikator_program_id" },
  { header: "ID", key: "id" },
];

function buildExportRow(row, rowIndex) {
  /** @type {Record<string, string>} */
  const o = { No: String(rowIndex + 1) };
  for (const col of INDIKATOR_EXPORT_COLUMNS) {
    const raw =
      typeof col.accessor === "function"
        ? col.accessor(row)
        : col.key
          ? row[col.key]
          : "";
    o[col.header] = scalarCell(raw);
  }
  return o;
}

function TdEllipsis({ children, title }) {
  const text = children == null || children === "" ? "—" : String(children);
  const tip = title != null ? String(title) : text;
  return (
    <td
      style={{
        maxWidth: 220,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
      title={tip.length > 0 ? tip : undefined}
    >
      {text}
    </td>
  );
}

/**
 * @param {{ defaultType?: "tujuan" | "sasaran" | "program" | "kegiatan" | "strategi" | "arah_kebijakan" | "sub_kegiatan_indikator" }} props
 */
export default function IndikatorList({ defaultType = "tujuan" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const { dokumen, tahun } = useDokumen();

  const [selectedType, setSelectedType] = useState(
    () => query.get("type") || defaultType
  );
  const [items, setItems] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [darkMode, setDarkMode] = useDarkMode();
  const [loading, setLoading] = useState(true);
  // Modal tambah (wizard)
  const [showAddForm, setShowAddForm] = useState(false);
  const [formKey, setFormKey] = useState(0);
  // Modal edit (IndikatorEditModal — FIX bug data tidak terisi)
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(5);
  const [totalPages, setTotalPages] = useState(1);
  const [filterLevelDokumen, setFilterLevelDokumen] = useState("");
  const [filterJenisIKU, setFilterJenisIKU] = useState("");
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [exporting, setExporting] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    if (!dokumen || !tahun) {
      setErrorMsg(
        isDokumenLevelPeriode(dokumen)
          ? "Jenis dokumen belum lengkap. Atur konteks dokumen di header (RPJMD/Renstra = satu periode; acuan otomatis)."
          : "Konteks waktu dan jenis dokumen belum dipilih. Atur di header lalu muat ulang halaman ini.",
      );
      setItems([]);
      setTotalPages(1);
      setLoading(false);
      return;
    }
    try {
      const typeObj = types.find((t) => t.value === selectedType);
      const { data, meta } = await fetchIndikatorRpjmdList(typeObj.endpoint, {
        page,
        limit: pageSize,
        search: searchTerm,
        level_dokumen: filterLevelDokumen,
        jenis_iku: filterJenisIKU,
        jenis_dokumen: String(dokumen).toUpperCase(),
        tahun,
      });
      setItems(data);
      setTotalPages(meta.totalPages || 1);
    } catch (err) {
      console.error(err);
      const backendMsg = err?.response?.data?.message;
      setErrorMsg(
        typeof backendMsg === "string" && backendMsg.trim()
          ? backendMsg
          : `Gagal memuat data ${selectedType}.`
      );
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
    dokumen,
    tahun,
  ]);

  /** Ambil semua baris sesuai filter (untuk Excel), bukan hanya halaman aktif. */
  const fetchAllRowsForExport = useCallback(async () => {
    const typeObj = types.find((t) => t.value === selectedType);
    if (!typeObj || !dokumen || !tahun) return [];
    const limit = 500;
    const acc = [];
    let pageNum = 1;
    let lastPage = 1;
    do {
      const { data, meta } = await fetchIndikatorRpjmdList(typeObj.endpoint, {
        page: pageNum,
        limit,
        search: searchTerm,
        level_dokumen: filterLevelDokumen,
        jenis_iku: filterJenisIKU,
        jenis_dokumen: String(dokumen).toUpperCase(),
        tahun,
      });
      acc.push(...data);
      lastPage = meta.totalPages || 1;
      pageNum += 1;
    } while (pageNum <= lastPage);
    return acc;
  }, [
    selectedType,
    searchTerm,
    filterLevelDokumen,
    filterJenisIKU,
    dokumen,
    tahun,
  ]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleAdd = () => {
    setFormKey((k) => k + 1);
    setShowAddForm(true);
  };

  /**
   * FIX BUG: handleEdit kini membuka IndikatorEditModal yang benar-benar
   * mengisi form dari data baris yang dipilih (bukan wizard dari localStorage).
   */
  const handleEdit = (row) => {
    setEditData(row);
    setShowEditModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus data ini?")) return;
    setLoading(true);
    try {
      const typeObj = types.find((t) => t.value === selectedType);
      await deleteIndikatorRpjmd(typeObj.endpoint, id);
      fetchItems();
    } catch (err) {
      console.error(err);
      setErrorMsg("Gagal menghapus data.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    if (!dokumen || !tahun) {
      setErrorMsg(
        isDokumenLevelPeriode(dokumen)
          ? "Jenis dokumen / periode belum lengkap — selesaikan konteks di header sebelum mengekspor."
          : "Konteks waktu dan jenis dokumen wajib dipilih sebelum mengekspor data.",
      );
      return;
    }
    setExporting(true);
    setErrorMsg("");
    try {
      const rows = await fetchAllRowsForExport();
      const sheetData = rows.map((row, idx) => buildExportRow(row, idx));
      const ws = XLSX.utils.json_to_sheet(sheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Indikator");
      const docLabel = String(dokumen).toUpperCase();
      XLSX.writeFile(
        wb,
        `${selectedType}-indikator-${docLabel}-${tahun}.xlsx`
      );
    } catch (err) {
      console.error(err);
      const backendMsg = err?.response?.data?.message;
      setErrorMsg(
        typeof backendMsg === "string" && backendMsg.trim()
          ? backendMsg
          : "Gagal mengekspor data ke Excel."
      );
    } finally {
      setExporting(false);
    }
  };

  const selectedTypeLabel = types.find((t) => t.value === selectedType)?.label || "";

  return (
    <div className={`container-fluid px-3 ${darkMode ? "dark-mode" : ""}`}>
      {/* ── Page header ── */}
      <div
        style={{
          background: "linear-gradient(135deg,#1a237e 0%,#283593 100%)",
          color: "#fff",
          padding: "14px 20px",
          borderRadius: 10,
          marginTop: 12,
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 10px rgba(26,35,126,.2)",
        }}
      >
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 0.3 }}>
            📋 {selectedTypeLabel}
          </div>
          <div style={{ fontSize: 11, opacity: 0.72, marginTop: 2 }}>
            Manajemen data indikator RPJMD
          </div>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <Button
            size="sm"
            variant="light"
            style={{ fontWeight: 700, color: "#1a237e" }}
            onClick={handleAdd}
          >
            <FaPlus className="me-1" /> Tambah
          </Button>
          <Button
            size="sm"
            variant="outline-light"
            onClick={() => navigate("/dashboard-rpjmd")}
          >
            ✕ Tutup
          </Button>
          <Button
            size="sm"
            variant={darkMode ? "dark" : "outline-light"}
            onClick={() => setDarkMode((d) => !d)}
          >
            {darkMode ? "☀" : "🌙"}
          </Button>
        </div>
      </div>

      <Card
        className="mb-4"
        style={{
          border: "1px solid #e0e0e0",
          borderRadius: 10,
          boxShadow: "0 1px 8px rgba(0,0,0,.06)",
        }}
      >
        {/* ── Toolbar filter ── */}
        <Card.Header
          style={{
            background: "#f8f9fa",
            borderBottom: "1px solid #e9ecef",
            padding: "12px 16px",
          }}
        >
          <div className="d-flex flex-wrap align-items-center gap-2">
            <Form.Select
              size="sm"
              style={{ maxWidth: 220 }}
              aria-label="Jenis daftar indikator"
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setPage(1);
                setExpandedRowId(null);
              }}
            >
              {types.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Form.Select>

            <Form.Select
              size="sm"
              style={{ maxWidth: 140 }}
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
              size="sm"
              style={{ maxWidth: 140 }}
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

            <InputGroup size="sm" style={{ maxWidth: 280 }}>
              <Form.Control
                placeholder="Cari kode atau nama…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setPage(1)}
              />
              <Button variant="outline-secondary" onClick={() => setPage(1)}>
                Cari
              </Button>
            </InputGroup>

            <Button
              size="sm"
              variant="outline-secondary"
              disabled={exporting || loading}
              onClick={() => void handleExportExcel()}
            >
              {exporting ? (
                <>
                  <Spinner animation="border" size="sm" className="me-1" />
                  Mengekspor…
                </>
              ) : (
                "⬇ Excel"
              )}
            </Button>
          </div>
        </Card.Header>

        <Card.Body className="p-0">

          {errorMsg && (
            <Alert variant="danger" className="mx-3 mt-3" style={{ fontSize: 13 }}>
              {errorMsg}
            </Alert>
          )}
          {loading ? (
            <div className="text-center my-5 py-4">
              <Spinner animation="border" variant="primary" />
              <div className="mt-2 text-muted" style={{ fontSize: 13 }}>
                Memuat data…
              </div>
            </div>
          ) : (
            <div className="px-3 pt-3">
              <Table
                bordered
                hover
                responsive
                className="small"
                style={{ fontSize: 12, borderRadius: 6, overflow: "hidden" }}
              >
                <thead style={{ background: "#f1f3f9" }}>
                  <tr>
                    <th style={{ whiteSpace: "nowrap" }}>No</th>
                    <th style={{ whiteSpace: "nowrap" }}>Kode</th>
                    <th>Nama Indikator</th>
                    <th style={{ whiteSpace: "nowrap" }}>Satuan</th>
                    <th style={{ whiteSpace: "nowrap" }}>Target</th>
                    <th style={{ whiteSpace: "nowrap" }}>Baseline</th>
                    <th className="text-center" style={{ whiteSpace: "nowrap" }} title="Capaian Th. I">C.I</th>
                    <th className="text-center" style={{ whiteSpace: "nowrap" }} title="Capaian Th. II">C.II</th>
                    <th className="text-center" style={{ whiteSpace: "nowrap" }} title="Capaian Th. III">C.III</th>
                    <th className="text-center" style={{ whiteSpace: "nowrap" }} title="Capaian Th. IV">C.IV</th>
                    <th className="text-center" style={{ whiteSpace: "nowrap" }} title="Capaian Th. V">C.V</th>
                    <th className="text-center" style={{ whiteSpace: "nowrap" }} title="Target Th. I">T.I</th>
                    <th className="text-center" style={{ whiteSpace: "nowrap" }} title="Target Th. II">T.II</th>
                    <th className="text-center" style={{ whiteSpace: "nowrap" }} title="Target Th. III">T.III</th>
                    <th className="text-center" style={{ whiteSpace: "nowrap" }} title="Target Th. IV">T.IV</th>
                    <th className="text-center" style={{ whiteSpace: "nowrap" }} title="Target Th. V">T.V</th>
                    <th style={{ whiteSpace: "nowrap" }}>Tipe</th>
                    <th style={{ whiteSpace: "nowrap" }}>Detail</th>
                    <th style={{ whiteSpace: "nowrap" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length > 0 ? (
                    items.map((i, idx) => (
                      <Fragment key={i.id}>
                        <tr>
                          <td>{idx + 1 + (page - 1) * pageSize}</td>
                          <td>{scalarCell(i.kode_indikator)}</td>
                          <TdEllipsis title={scalarCell(i.nama_indikator)}>
                            {i.nama_indikator}
                          </TdEllipsis>
                          <td>{scalarCell(i.satuan)}</td>
                          <TdEllipsis title={scalarCell(i.target_kinerja)}>
                            {i.target_kinerja}
                          </TdEllipsis>
                          <td>{scalarCell(i.baseline)}</td>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <td key={`c${n}`} className="text-end">
                              {scalarCell(i[`capaian_tahun_${n}`])}
                            </td>
                          ))}
                          {[1, 2, 3, 4, 5].map((n) => (
                            <td key={`t${n}`} className="text-end">
                              {scalarCell(i[`target_tahun_${n}`])}
                            </td>
                          ))}
                          <td>{scalarCell(i.tipe_indikator)}</td>
                          <td className="text-center">
                            <Button
                              size="sm"
                              variant={expandedRowId === i.id ? "secondary" : "outline-info"}
                              style={{ padding: "2px 8px", fontSize: 11 }}
                              onClick={() =>
                                setExpandedRowId((id) =>
                                  id === i.id ? null : i.id
                                )
                              }
                            >
                              {expandedRowId === i.id ? "▲" : "▼"}
                            </Button>
                          </td>
                          <td className="text-center" style={{ whiteSpace: "nowrap" }}>
                            <Button
                              size="sm"
                              variant="warning"
                              title="Edit indikator ini"
                              onClick={() => handleEdit(i)}
                              className="me-1"
                              style={{ padding: "2px 7px" }}
                            >
                              <FaEdit />
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              title="Hapus indikator ini"
                              onClick={() => handleDelete(i.id)}
                              style={{ padding: "2px 7px" }}
                            >
                              <FaTrash />
                            </Button>
                          </td>
                        </tr>
                        {expandedRowId === i.id && (
                          <tr>
                            <td colSpan={19} style={{ background: "#f8f9fa", padding: 0 }}>
                              <div
                                style={{
                                  padding: "12px 20px",
                                  borderTop: "2px solid #e3e8ff",
                                  display: "grid",
                                  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                                  gap: "8px 20px",
                                  fontSize: 12,
                                }}
                              >
                                {[
                                  ["Jenis (uraian)", scalarCell(i.jenis)],
                                  ["Jenis indikator", scalarCell(i.jenis_indikator)],
                                  ["Tipe", scalarCell(i.tipe_indikator)],
                                  ["Tolok ukur kinerja", scalarCell(i.tolok_ukur_kinerja)],
                                  ["Definisi operasional", scalarCell(i.definisi_operasional)],
                                  ["Metode penghitungan", scalarCell(i.metode_penghitungan)],
                                  ["Kriteria kuantitatif", scalarCell(i.kriteria_kuantitatif)],
                                  ["Kriteria kualitatif", scalarCell(i.kriteria_kualitatif)],
                                  ["Sumber data", scalarCell(i.sumber_data)],
                                  ["OPD penanggung jawab",
                                    scalarCell(i.opdPenanggungJawab?.nama_opd) ||
                                    scalarCell(i.nama_opd_penanggung) ||
                                    scalarCell(i.penanggung_jawab)],
                                  ["Keterangan", scalarCell(i.keterangan)],
                                  ["Rekomendasi AI", scalarCell(i.rekomendasi_ai)],
                                ].map(([label, val]) => (
                                  <div key={label}>
                                    <span style={{ fontWeight: 600, color: "#495057" }}>
                                      {label}:
                                    </span>{" "}
                                    <span style={{ color: val ? "#212529" : "#adb5bd" }}>
                                      {val || "—"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={19} className="text-center py-4" style={{ color: "#adb5bd" }}>
                        Tidak ada data yang sesuai filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>

              <div className="d-flex justify-content-center pb-3">
                <Pagination size="sm">
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
              </div>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* ── Modal TAMBAH: pakai wizard IndikatorRPJMD ── */}
      <Modal
        show={showAddForm}
        onHide={() => setShowAddForm(false)}
        size="xl"
        centered
        scrollable
      >
        <Modal.Header
          closeButton
          style={{
            background: "linear-gradient(135deg,#1a237e 0%,#283593 100%)",
            color: "#fff",
            padding: "14px 22px",
          }}
        >
          <Modal.Title style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>
            ➕ Tambah Indikator Baru — Wizard
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: "20px 24px", background: "#fafbff" }}>
          {/* Wizard untuk tambah data baru */}
          <IndikatorRPJMDForm key={formKey} />
        </Modal.Body>
      </Modal>

      {/* ── Modal EDIT: pakai IndikatorEditModal (FIX bug data tidak terisi) ── */}
      <IndikatorEditModal
        show={showEditModal}
        onHide={() => {
          setShowEditModal(false);
          setEditData(null);
        }}
        existingData={editData}
        selectedType={selectedType}
        onSuccess={() => {
          setShowEditModal(false);
          setEditData(null);
          fetchItems();
        }}
      />
    </div>
  );
}
