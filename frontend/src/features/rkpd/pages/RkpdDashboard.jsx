import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Card,
  CardBody,
  Row,
  Col,
  Spinner,
  ProgressBar,
  Accordion,
  Badge,
  Table,
  Form,
} from "react-bootstrap";
import { toast } from "react-toastify";
import { useDokumen } from "../../../hooks/useDokumen";
import { useAuth } from "../../../hooks/useAuth";
import { usePeriodeAktif } from "../../rpjmd/hooks/usePeriodeAktif";
import { canManagePlanningWorkflow, canRestorePlanningDocumentVersion } from "../../../utils/roleUtils";
import RkpdTable from "../components/RkpdTable";
import useRkpdData from "../services/useRkpdData";
import {
  deleteRkpd,
  syncRkpd,
  updateRkpdStatus,
} from "../services/rkpdApi";
import {
  fetchRkpdDashboardV2,
  fetchPerencanaanConsistency,
} from "../services/planningDashboardApi";
import { fetchRkpdDokumenAudit } from "../services/planningRkpdV2Api";
import PlanningAuditSection from "../../planning-audit/components/PlanningAuditSection";
import RkpdDashboardLayout from "./RkpdDashboardLayout";

const formatRupiah = (val) => {
  const n = Number(val) || 0;
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(2)} M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(2)} jt`;
  return `Rp ${n.toLocaleString("id-ID")}`;
};

const RkpdDashboard = () => {
  const navigate = useNavigate();
  const { tahun: tahunAktif } = useDokumen();
  const { periode_id } = usePeriodeAktif();
  const { user } = useAuth();
  const canManageWorkflow = canManagePlanningWorkflow(user?.role);

  const [dash, setDash] = useState(null);
  const [loadingDash, setLoadingDash] = useState(true);
  const [dashErr, setDashErr] = useState("");
  const [audit, setAudit] = useState(null);
  const [auditDocId, setAuditDocId] = useState(null);
  const [auditRows, setAuditRows] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const loadV2 = useCallback(async () => {
    setLoadingDash(true);
    setDashErr("");
    try {
      const params = {};
      if (tahunAktif) params.tahun = tahunAktif;
      if (periode_id) params.periode_id = periode_id;
      const data = await fetchRkpdDashboardV2(params);
      setDash(data);
    } catch (e) {
      console.error(e);
      setDashErr(e?.response?.data?.message || e.message || "Gagal memuat ringkasan v2");
    } finally {
      setLoadingDash(false);
    }
  }, [tahunAktif, periode_id]);

  useEffect(() => {
    loadV2();
  }, [loadV2]);

  useEffect(() => {
    const list = dash?.dokumen || [];
    if (!list.length) {
      setAuditDocId(null);
      return;
    }
    setAuditDocId((prev) => {
      if (prev != null && list.some((d) => d.id === prev)) return prev;
      return list[0].id;
    });
  }, [dash?.dokumen]);

  useEffect(() => {
    if (!auditDocId) {
      setAuditRows([]);
      return undefined;
    }
    let ok = true;
    setAuditLoading(true);
    fetchRkpdDokumenAudit(auditDocId)
      .then((rows) => {
        if (ok) setAuditRows(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (ok) setAuditRows([]);
      })
      .finally(() => {
        if (ok) setAuditLoading(false);
      });
    return () => {
      ok = false;
    };
  }, [auditDocId]);

  /** Sidebar "Ringkasan v2" di path sama: scroll + muat ulang data */
  useEffect(() => {
    const handler = () => loadV2();
    window.addEventListener("rkpd-dashboard:refresh", handler);
    return () => window.removeEventListener("rkpd-dashboard:refresh", handler);
  }, [loadV2]);

  useEffect(() => {
    let ok = true;
    (async () => {
      try {
        const data = await fetchPerencanaanConsistency();
        if (ok) setAudit(data);
      } catch (e) {
        console.warn(e);
      }
    })();
    return () => {
      ok = false;
    };
  }, []);

  const rkpdIssues = useMemo(() => {
    const issues = audit?.issues;
    if (!Array.isArray(issues)) return [];
    return issues.filter(
      (i) =>
        i.rkpd_dokumen_id != null ||
        String(i.code || "").includes("RKPD"),
    );
  }, [audit]);

  const [search, setSearch] = useState("");
  const queryParams = useMemo(
    () => ({
      limit: 200,
      ...(tahunAktif ? { tahun: tahunAktif } : {}),
    }),
    [tahunAktif],
  );
  const { data, loading, error, refetch } = useRkpdData(queryParams);

  const filtered = useMemo(() => {
    const key = String(search || "").trim().toLowerCase();
    if (!key) return data;
    return data.filter((row) =>
      [
        row.tahun,
        row.nama_program,
        row.nama_kegiatan,
        row.nama_sub_kegiatan,
        row.kode_sub_kegiatan,
        row.opd_penanggung_jawab,
        row.status,
        row.sinkronisasi_status,
      ]
        .map((v) => String(v || "").toLowerCase())
        .some((v) => v.includes(key)),
    );
  }, [data, search]);

  const summary = dash?.summary;
  const mapPct =
    summary?.total_item > 0
      ? Math.round(
          (100 * (summary.item_mapped_to_renja || 0)) / summary.total_item,
        )
      : 0;

  const handleDelete = async (row) => {
    const c = window.confirm(
      `Hapus RKPD ${row?.nama_sub_kegiatan || row?.id || ""}?`,
    );
    if (!c) return;
    const reason = window.prompt("Alasan penghapusan (wajib):", "");
    if (!reason || !String(reason).trim()) {
      toast.error("Alasan penghapusan wajib diisi.");
      return;
    }
    try {
      await deleteRkpd(row.id, { change_reason_text: String(reason).trim() });
      toast.success("Data RKPD dihapus");
      refetch();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Gagal menghapus RKPD");
    }
  };

  const handleStatus = async (row, action) => {
    const reason = window.prompt(`Alasan transisi workflow "${action}" (wajib):`, "");
    if (!reason || !String(reason).trim()) {
      toast.error("Alasan wajib untuk audit workflow");
      return;
    }
    try {
      await updateRkpdStatus(row.id, {
        action,
        change_reason_text: String(reason).trim(),
      });
      toast.success(`Status RKPD diperbarui (${action})`);
      refetch();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Gagal update status RKPD");
    }
  };

  const handleSync = async () => {
    try {
      const result = await syncRkpd(tahunAktif ? { tahun: tahunAktif } : {});
      const todoCount = Array.isArray(result?.todos) ? result.todos.length : 0;
      const isStub = String(result?.status || "").toLowerCase() === "stub";
      const notify = isStub ? toast.info : toast.success;
      notify(
        `Sync RKPD ${result?.mode || "local_stub"}${isStub ? " [stub]" : ""} (synced: ${result?.synced || 0}, todo: ${todoCount})`,
      );
      refetch();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Gagal sinkronisasi RKPD");
    }
  };

  return (
    <RkpdDashboardLayout>
      {/* Header — pola RenstraDashboard */}
      <div className="mb-4 d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div>
          <h2 className="fw-bold text-primary mb-1">📊 Dashboard RKPD</h2>
          <p className="text-muted mb-0 small">
            Perencanaan v2 · Tahun {tahunAktif || "-"}
            {periode_id ? ` · Periode ID ${periode_id}` : ""}
          </p>
        </div>
        <Badge bg="info" className="fs-6 px-3 py-2">
          Domain: rkpd_dokumen / rkpd_item
        </Badge>
      </div>

      <Card className="mb-3 shadow-sm border-0 border-start border-4 border-primary">
        <CardBody>
          <Row>
            <Col md={6}>
              <div>
                <strong>Periode RPJMD:</strong>{" "}
                {periode_id ? `ID ${periode_id}` : "—"}
              </div>
              <div>
                <strong>Tahun aktif (picker):</strong> {tahunAktif || "—"}
              </div>
            </Col>
            <Col md={6}>
              <div className="small text-muted">
                Rantai penuh RPJMD → … → DPA <strong>belum</strong> digambarkan
                sebagai selesai di sini. Ini hanya tahap RKPD perencanaan v2.
              </div>
            </Col>
          </Row>
        </CardBody>
      </Card>

      {dashErr && (
        <div className="alert alert-warning" role="alert">
          {dashErr}
        </div>
      )}

      <Card className="mb-4 shadow-sm border-primary">
        <CardBody>
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
            <div>
              <h6 className="fw-bold mb-0 text-primary">Dokumen RKPD (v2)</h6>
              <p className="small text-muted mb-0">
                Alur resmi perencanaan: <code>rkpd_dokumen</code> / <code>rkpd_item</code>.
                Entri legacy tetap di accordion bawah.
              </p>
            </div>
            {canManageWorkflow && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => navigate("/dashboard-rkpd/v2/buat")}
              >
                Buat Dokumen RKPD
              </button>
            )}
          </div>
          {loadingDash ? (
            <Spinner size="sm" />
          ) : (dash?.dokumen || []).length === 0 ? (
            <div className="text-muted small">Belum ada dokumen v2 — klik &quot;Buat Dokumen RKPD&quot;.</div>
          ) : (
            <div className="table-responsive">
              <Table striped bordered hover size="sm" className="mb-0">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Judul</th>
                    <th>Status</th>
                    <th>Tahun</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {dash.dokumen.map((d) => (
                    <tr key={d.id}>
                      <td>{d.id}</td>
                      <td>{d.judul}</td>
                      <td>
                        <Badge bg="secondary">{d.status}</Badge>
                      </td>
                      <td>{d.tahun}</td>
                      <td>
                        <Link
                          className="btn btn-sm btn-outline-primary"
                          to={`/dashboard-rkpd/v2/dokumen/${d.id}`}
                        >
                          Buka / edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </CardBody>
      </Card>

      <Card className="mb-4 shadow-sm border-primary">
        <CardBody>
          <h6 className="fw-bold mb-2 text-primary">Audit dokumen v2</h6>
          <p className="small text-muted mb-3">
            Timeline, jejak, riwayat versi, dan diff (sama seperti halaman detail RKPD
            v2).
          </p>
          {(dash?.dokumen || []).length ? (
            <Form.Select
              className="mb-3"
              size="sm"
              value={auditDocId ?? ""}
              onChange={(e) => setAuditDocId(Number(e.target.value))}
            >
              {(dash?.dokumen || []).map((d) => (
                <option key={d.id} value={d.id}>
                  #{d.id} · {d.judul || "—"} ({d.status})
                </option>
              ))}
            </Form.Select>
          ) : (
            <p className="small text-muted mb-0">Belum ada dokumen untuk ditampilkan.</p>
          )}
          <PlanningAuditSection
            documentType="rkpd_dokumen"
            documentId={auditDocId}
            auditRows={auditRows}
            auditLoading={auditLoading}
            allowRestore={canRestorePlanningDocumentVersion(user?.role)}
            title="Audit & versi (dashboard)"
            onVersionRestored={async () => {
              if (auditDocId) {
                try {
                  const rows = await fetchRkpdDokumenAudit(auditDocId);
                  setAuditRows(Array.isArray(rows) ? rows : []);
                } catch {
                  setAuditRows([]);
                }
              }
              loadV2();
            }}
          />
        </CardBody>
      </Card>

      {/* Statistik kartu */}
      <Row className="mb-4">
        {[
          {
            key: "doc",
            label: "Dokumen v2",
            color: "primary",
            icon: "📁",
            val: summary?.total_dokumen,
          },
          {
            key: "item",
            label: "Total item",
            color: "success",
            icon: "📋",
            val: summary?.total_item,
          },
          {
            key: "pagu",
            label: "Total pagu (semi)",
            color: "info",
            icon: "💰",
            val: formatRupiah(summary?.total_pagu),
          },
          {
            key: "renja",
            label: "Dok. punya turunan Renja",
            color: "warning",
            icon: "🔗",
            val: summary?.dokumen_with_renja_turunan,
          },
        ].map((s) => (
          <Col key={s.key} xs={6} md={3} className="mb-3">
            <Card
              className={`text-center shadow-sm border-top border-4 border-${s.color} h-100`}
            >
              <CardBody className="py-3">
                <div className="fs-4 mb-1">{s.icon}</div>
                <div className={`fs-4 fw-bold text-${s.color}`}>
                  {loadingDash ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    (s.val ?? "—")
                  )}
                </div>
                <div className="text-muted small fw-semibold">{s.label}</div>
              </CardBody>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Status dokumen + progres penurunan */}
      <Row className="mb-4">
        <Col md={6} className="mb-3">
          <Card className="shadow-sm h-100">
            <CardBody>
              <h6 className="fw-bold mb-3">Status dokumen v2</h6>
              {loadingDash ? (
                <Spinner size="sm" />
              ) : (
                <div className="d-flex flex-wrap gap-2">
                  {["draft", "review", "final"].map((st) => (
                    <Badge key={st} bg="secondary" className="py-2 px-3">
                      {st}: {dash?.summary?.by_status?.[st] ?? 0}
                    </Badge>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
        <Col md={6} className="mb-3">
          <Card className="shadow-sm h-100">
            <CardBody>
              <h6 className="fw-bold mb-2">
                Progres mapping item → Renja (v2)
              </h6>
              <p className="small text-muted mb-2">
                Item RKPD yang sudah punya entri di{" "}
                <code>renja_rkpd_item_map</code>.
              </p>
              {loadingDash ? (
                <Spinner size="sm" />
              ) : (
                <>
                  <ProgressBar className="mb-2" now={mapPct} label={`${mapPct}%`} />
                  <div className="small">
                    Ter-mapping: {summary?.item_mapped_to_renja ?? 0} /{" "}
                    {summary?.total_item ?? 0} · Belum:{" "}
                    {summary?.item_belum_mapped ?? 0}
                  </div>
                </>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Distribusi pagu per dokumen — kartu ringkas */}
      <Card className="mb-4 shadow-sm">
        <CardBody>
          <h6 className="fw-bold mb-3">Distribusi pagu (per dokumen v2)</h6>
          <p className="small text-muted">
            Nilai dari kolom pagu item — <strong>semi-stabil</strong>, bukan
            APBD final.
          </p>
          {loadingDash ? (
            <Spinner size="sm" />
          ) : (dash?.dokumen || []).length === 0 ? (
            <div className="text-muted small">Belum ada dokumen v2 pada filter ini.</div>
          ) : (
            <Row className="g-2">
              {dash.dokumen.map((d) => (
                <Col key={d.id} xs={12} md={6} lg={4}>
                  <div className="border rounded p-2 bg-light small">
                    <div className="fw-semibold text-truncate" title={d.judul}>
                      {d.judul}
                    </div>
                    <div className="text-muted">ID #{d.id}</div>
                    <div className="fw-bold text-info">
                      {formatRupiah(d.pagu_sum)}
                    </div>
                    <Badge bg="light" text="dark">
                      {d.status}
                    </Badge>
                  </div>
                </Col>
              ))}
            </Row>
          )}
        </CardBody>
      </Card>

      {/* Warning konsistensi + panel audit */}
      <Card className="mb-4 shadow-sm border-warning">
        <CardBody>
          <h6 className="fw-bold mb-2">⚠️ Peringatan & validasi (audit domain)</h6>
          <p className="small text-muted mb-2">
            Sumber: <code>GET /api/audit/perencanaan-consistency</code> — filter
            isu terkait RKPD.
          </p>
          {rkpdIssues.length === 0 ? (
            <div className="text-success small">
              Tidak ada isu RKPD pada pemindaian terakhir.
            </div>
          ) : (
            <ul className="small mb-0">
              {rkpdIssues.slice(0, 12).map((it, idx) => (
                <li key={idx}>
                  <Badge bg={it.severity === "error" ? "danger" : "warning"}>
                    {it.code}
                  </Badge>{" "}
                  {it.message}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {/* Legacy: daftar tabel lama — terpisah & berlabel */}
      <Accordion className="mb-4">
        <Accordion.Item eventKey="0">
          <Accordion.Header>
            <strong>Daftar RKPD (legacy / baris lama)</strong>
            <span className="ms-2 badge bg-secondary">bukan dokumen v2</span>
          </Accordion.Header>
          <Accordion.Body>
            <p className="small text-muted">
              Tabel ini memuat data modul RKPD klasik (bukan agregasi{" "}
              <code>rkpd_dokumen</code>). Gunakan untuk operasional lama; jangan
              menjumlahkan dengan kartu v2 tanpa rekonsiliasi.
            </p>
            <div className="d-flex flex-wrap gap-2 mb-3">
              <button
                type="button"
                onClick={handleSync}
                className="btn btn-outline-success btn-sm"
              >
                Sync RKPD (Stub)
              </button>
              <button
                type="button"
                onClick={() => navigate("/dashboard-rkpd/form")}
                disabled={!canManageWorkflow}
                className="btn btn-primary btn-sm"
              >
                Tambah RKPD
              </button>
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-control form-control-sm mb-2"
              placeholder="Cari (legacy)..."
            />
            {loading && (
              <div className="text-muted small">Memuat data RKPD...</div>
            )}
            {error && (
              <div className="alert alert-danger small">
                Gagal memuat data RKPD legacy.
              </div>
            )}
            {!loading && !error && (
              <RkpdTable
                data={filtered}
                onEdit={canManageWorkflow ? (row) => navigate(`/dashboard-rkpd/form/${row.id}`) : null}
                onDelete={canManageWorkflow ? handleDelete : null}
                onStatus={canManageWorkflow ? handleStatus : null}
                canManageStatus={canManageWorkflow}
              />
            )}
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>

      <Card className="shadow-sm border-0 bg-light">
        <CardBody className="small text-muted">
          Dashboard ini menyamakan <strong>pola blok</strong> dengan Dashboard
          Renstra (kartu, sidebar, ringkasan). Data perencanaan v2 bersumber
          dari endpoint <code>/api/rkpd/dashboard-v2</code>.
        </CardBody>
      </Card>
    </RkpdDashboardLayout>
  );
};

export default RkpdDashboard;
