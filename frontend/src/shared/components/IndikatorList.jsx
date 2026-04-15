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
import { useDarkMode } from "../../hooks/useDarkMode";
import * as XLSX from "xlsx";
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
  { header: "Target Tahun I", key: "target_tahun_1" },
  { header: "Target Tahun II", key: "target_tahun_2" },
  { header: "Target Tahun III", key: "target_tahun_3" },
  { header: "Target Tahun IV", key: "target_tahun_4" },
  { header: "Target Tahun V", key: "target_tahun_5" },
  { header: "Capaian Tahun I", key: "capaian_tahun_1" },
  { header: "Capaian Tahun II", key: "capaian_tahun_2" },
  { header: "Capaian Tahun III", key: "capaian_tahun_3" },
  { header: "Capaian Tahun IV", key: "capaian_tahun_4" },
  { header: "Capaian Tahun V", key: "capaian_tahun_5" },
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
  { header: "Tahun", key: "tahun" },
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
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [formKey, setFormKey] = useState(0);

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
        "Tahun dan jenis dokumen belum dipilih. Atur konteks dokumen (header / pengaturan RPJMD) lalu muat ulang halaman ini."
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
        "Tahun dan jenis dokumen wajib dipilih sebelum mengekspor data."
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
              style={{ maxWidth: 240 }}
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
              disabled={exporting || loading}
              onClick={() => void handleExportExcel()}
            >
              {exporting ? (
                <>
                  <Spinner animation="border" size="sm" className="me-1" />
                  Mengekspor…
                </>
              ) : (
                "Ekspor Excel"
              )}
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
              <Table striped bordered hover responsive className="small">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Kode</th>
                    <th>Nama</th>
                    <th>Satuan</th>
                    <th>Target kinerja</th>
                    <th>Baseline</th>
                    <th className="text-center">C.I</th>
                    <th className="text-center">C.II</th>
                    <th className="text-center">C.III</th>
                    <th className="text-center">C.IV</th>
                    <th className="text-center">C.V</th>
                    <th className="text-center">T.I</th>
                    <th className="text-center">T.II</th>
                    <th className="text-center">T.III</th>
                    <th className="text-center">T.IV</th>
                    <th className="text-center">T.V</th>
                    <th>Tipe</th>
                    <th>Detail</th>
                    <th>Aksi</th>
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
                          <td>
                            <Button
                              size="sm"
                              variant="outline-secondary"
                              onClick={() =>
                                setExpandedRowId((id) =>
                                  id === i.id ? null : i.id
                                )
                              }
                            >
                              {expandedRowId === i.id ? "Tutup" : "Buka"}
                            </Button>
                          </td>
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
                        {expandedRowId === i.id && (
                          <tr>
                            <td colSpan={19} className="bg-light">
                              <div className="p-3 rounded small">
                                <p className="mb-1">
                                  <strong>Jenis (uraian):</strong>{" "}
                                  {scalarCell(i.jenis) || "—"}
                                </p>
                                <p className="mb-1">
                                  <strong>Jenis indikator:</strong>{" "}
                                  {scalarCell(i.jenis_indikator) || "—"}
                                </p>
                                <p className="mb-1">
                                  <strong>Tolok ukur:</strong>{" "}
                                  {scalarCell(i.tolok_ukur_kinerja) || "—"}
                                </p>
                                <p className="mb-1">
                                  <strong>Definisi operasional:</strong>{" "}
                                  {scalarCell(i.definisi_operasional) || "—"}
                                </p>
                                <p className="mb-1">
                                  <strong>Metode penghitungan:</strong>{" "}
                                  {scalarCell(i.metode_penghitungan) || "—"}
                                </p>
                                <p className="mb-1">
                                  <strong>Kriteria kuantitatif:</strong>{" "}
                                  {scalarCell(i.kriteria_kuantitatif) || "—"}
                                </p>
                                <p className="mb-1">
                                  <strong>Kriteria kualitatif:</strong>{" "}
                                  {scalarCell(i.kriteria_kualitatif) || "—"}
                                </p>
                                <p className="mb-1">
                                  <strong>Sumber data:</strong>{" "}
                                  {scalarCell(i.sumber_data) || "—"}
                                </p>
                                <p className="mb-1">
                                  <strong>OPD penanggung jawab:</strong>{" "}
                                  {scalarCell(i.opdPenanggungJawab?.nama_opd) ||
                                    scalarCell(i.nama_opd_penanggung) ||
                                    scalarCell(i.penanggung_jawab) ||
                                    "—"}
                                </p>
                                <p className="mb-1">
                                  <strong>Keterangan:</strong>{" "}
                                  {scalarCell(i.keterangan) || "—"}
                                </p>
                                <p className="mb-0">
                                  <strong>Rekomendasi AI:</strong>{" "}
                                  {scalarCell(i.rekomendasi_ai) || "—"}
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={19} className="text-center">
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
