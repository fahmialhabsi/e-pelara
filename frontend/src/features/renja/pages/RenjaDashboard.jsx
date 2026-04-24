import React, { useMemo, useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Card,
  CardBody,
  Row,
  Col,
  Spinner,
  ProgressBar,
  Badge,
  Accordion,
  Table,
  Form,
} from "react-bootstrap";
import { useDokumen } from "../../../hooks/useDokumen";
import { useAuth } from "../../../hooks/useAuth";
import { canManagePlanningWorkflow, canRestorePlanningDocumentVersion } from "../../../utils/roleUtils";
import { usePeriodeAktif } from "../../rpjmd/hooks/usePeriodeAktif";
import {
  fetchRenjaDashboardV2,
  fetchPerencanaanConsistency,
} from "../../rkpd/services/planningDashboardApi";
import { fetchRenjaDokumenAudit } from "../services/planningRenjaApi";
import PlanningAuditSection from "../../planning-audit/components/PlanningAuditSection";
import RenjaPlanningDashboardLayout from "./RenjaPlanningDashboardLayout";
import ListRenjaOPD from "./ListRenjaOPD";
import RenjaWorkflowActions from "../components/RenjaWorkflowActions";

const formatRupiah = (val) => {
  const n = Number(val) || 0;
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(2)} M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(2)} jt`;
  return `Rp ${n.toLocaleString("id-ID")}`;
};

const RenjaDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canWrite = canManagePlanningWorkflow(user?.role);
  const { tahun: tahunAktif } = useDokumen();
  const { periode_id } = usePeriodeAktif();

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
      const data = await fetchRenjaDashboardV2(params);
      setDash(data);
    } catch (e) {
      console.error(e);
      setDashErr(
        e?.response?.data?.message || e.message || "Gagal memuat ringkasan Renja v2",
      );
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
    fetchRenjaDokumenAudit(auditDocId)
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

  useEffect(() => {
    const handler = () => loadV2();
    window.addEventListener("renja-dashboard:refresh", handler);
    return () => window.removeEventListener("renja-dashboard:refresh", handler);
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

  const renjaIssues = useMemo(() => {
    const issues = audit?.issues;
    if (!Array.isArray(issues)) return [];
    return issues.filter(
      (i) =>
        i.renja_dokumen_id != null ||
        i.renja_item_id != null ||
        String(i.code || "").includes("RENJA"),
    );
  }, [audit]);

  const summary = dash?.summary;
  const mapPct =
    summary?.total_item > 0
      ? Math.round(
          (100 * (summary.item_ada_mapping_rkpd || 0)) / summary.total_item,
        )
      : 0;

  return (
    <RenjaPlanningDashboardLayout>
      <div className="mb-4 d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div>
          <h2 className="fw-bold text-success mb-1">📊 Dashboard Renja</h2>
          <p className="text-muted mb-0 small">
            Perencanaan v2 · Tahun {tahunAktif || "-"}
            {periode_id ? ` · Periode ID ${periode_id}` : ""}
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2 align-items-center">
          {canWrite && (
            <button
              type="button"
              className="btn btn-success btn-sm"
              onClick={() => navigate("/dashboard-renja/v2/buat")}
            >
              Buat Dokumen Renja
            </button>
          )}
          <Badge bg="success" className="fs-6 px-3 py-2">
            Domain: renja_dokumen / renja_item
          </Badge>
        </div>
      </div>

      <Card className="mb-3 shadow-sm border-0 border-start border-4 border-success">
        <CardBody>
          <Row>
            <Col md={8}>
              <div className="small text-muted">
                <strong>Disclaimer:</strong> Halaman ini tidak menyatakan
                seluruh rantai RPJMD → Renstra → RKPD → Renja → RKA → DPA sudah
                final. Hanya <strong>tahap Renja perencanaan v2</strong> dengan
                sumber tabel yang dilabeli.
              </div>
              <div className="small mt-2">
                <strong>Alur singkat (operasional):</strong> (1) Pastikan ada{" "}
                <strong>RKPD</strong> &amp; <strong>Renstra PD</strong> sebagai
                acuan · (2) Dokumen <code>renja_dokumen</code> dibuat lewat API
                backend (POST <code>/api/renja/dokumen</code>) — UI wizard
                pembuatan penuh belum ada di dashboard ini · (3) Isi baris{" "}
                <code>renja_item</code> &amp; mapping ke RKPD · (4) Unduh Word/PDF
                di bawah setelah dokumen muncul di tabel ringkasan.
              </div>
            </Col>
            <Col md={4} className="text-end small">
              {dash?.legacy_bridge?.catatan && (
                <span className="text-muted">{dash.legacy_bridge.catatan}</span>
              )}
            </Col>
          </Row>
        </CardBody>
      </Card>

      {dashErr && (
        <div className="alert alert-warning" role="alert">
          {dashErr}
        </div>
      )}

      <Row className="mb-4">
        <Col md={6} className="mb-3">
          <RenjaWorkflowActions
            dokumenList={dash?.dokumen || []}
            onAfterExport={() => loadV2()}
          />
          <div className="small mt-2">
            Atau buka dokumen untuk edit penuh:{" "}
            {(dash?.dokumen || []).slice(0, 6).map((d) => (
              <Link
                key={d.id}
                className="me-2 d-inline-block"
                to={`/dashboard-renja/v2/dokumen/${d.id}`}
              >
                #{d.id}
              </Link>
            ))}
            {(dash?.dokumen || []).length > 6 ? "…" : null}
          </div>
        </Col>
        <Col md={6} className="mb-3">
          <Card className="h-100 border-warning">
            <CardBody>
              <h6 className="fw-bold text-warning">⚠️ Peringatan operasional</h6>
              <ul className="small mb-0 ps-3">
                <li>
                  Item tanpa mapping RKPD: lihat kartu &quot;Progres mapping&quot;
                  — angka &quot;Belum&quot; harus diturunkan sebelum final.
                </li>
                <li>
                  Perubahan turunan dari RKPD (cascade) terekam di backend (
                  <code>planning_line_item_change_log</code>
                  ); ringkasan audit dokumen + baris tersaji di panel bawah (pilih
                  dokumen).
                </li>
              </ul>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row className="mb-4">
        {[
          {
            key: "doc",
            label: "Dokumen v2",
            color: "success",
            icon: "📁",
            val: summary?.total_dokumen,
          },
          {
            key: "item",
            label: "Total item",
            color: "primary",
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
            key: "map",
            label: "Item terhubung RKPD",
            color: "warning",
            icon: "🔗",
            val: summary?.item_ada_mapping_rkpd,
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

      <Card className="mb-4 shadow-sm border-success">
        <CardBody>
          <h6 className="fw-bold mb-2 text-success">Audit dokumen v2</h6>
          <p className="small text-muted mb-3">
            Timeline, jejak dokumen, riwayat versi, dan diff (komponen sama seperti
            halaman detail Renja).
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
            documentType="renja_dokumen"
            documentId={auditDocId}
            auditRows={auditRows}
            auditLoading={auditLoading}
            allowRestore={canRestorePlanningDocumentVersion(user?.role)}
            title="Audit & versi (dashboard)"
            onVersionRestored={async () => {
              if (auditDocId) {
                try {
                  const rows = await fetchRenjaDokumenAudit(auditDocId);
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

      <Row className="mb-4">
        <Col md={6} className="mb-3">
          <Card className="shadow-sm h-100">
            <CardBody>
              <h6 className="fw-bold mb-3">Status penyusunan (v2)</h6>
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
              <h6 className="fw-bold mb-2">Progres mapping ke RKPD</h6>
              <p className="small text-muted mb-2">
                Item Renja yang punya pasangan di <code>renja_rkpd_item_map</code>
                .
              </p>
              {loadingDash ? (
                <Spinner size="sm" />
              ) : (
                <>
                  <ProgressBar now={mapPct} label={`${mapPct}%`} variant="success" />
                  <div className="small mt-2">
                    Terhubung: {summary?.item_ada_mapping_rkpd ?? 0} /{" "}
                    {summary?.total_item ?? 0} · Belum:{" "}
                    {summary?.item_belum_mapping_rkpd ?? 0}
                  </div>
                </>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Card className="mb-4 shadow-sm">
        <CardBody>
          <h6 className="fw-bold mb-3">
            Identitas PD & referensi RKPD / Renstra (per dokumen v2)
          </h6>
          {loadingDash ? (
            <Spinner size="sm" />
          ) : (dash?.dokumen || []).length === 0 ? (
            <div className="text-muted small">Belum ada dokumen Renja v2.</div>
          ) : (
            <div className="table-responsive">
              <Table striped bordered hover size="sm" className="mb-0 small">
                <thead>
                  <tr>
                    <th>PD</th>
                    <th>Tahun</th>
                    <th>RKPD</th>
                    <th>Renstra PD</th>
                    <th>Item</th>
                    <th>Map / belum</th>
                    <th>Pagu</th>
                    <th>Legacy bridge</th>
                  </tr>
                </thead>
                <tbody>
                  {dash.dokumen.map((d) => (
                    <tr key={d.id}>
                      <td>{d.perangkat_daerah_nama || d.perangkat_daerah_id}</td>
                      <td>{d.tahun}</td>
                      <td>
                        {d.rkpd_dokumen_id ? (
                          <>
                            #{d.rkpd_dokumen_id}
                            <div className="text-muted text-truncate" style={{ maxWidth: 140 }}>
                              {d.rkpd_judul}
                            </div>
                          </>
                        ) : (
                          <span className="text-warning">—</span>
                        )}
                      </td>
                      <td>
                        <div className="text-truncate" style={{ maxWidth: 140 }}>
                          {d.renstra_pd_judul || d.renstra_pd_dokumen_id}
                        </div>
                      </td>
                      <td>{d.item_count}</td>
                      <td>
                        {d.item_mapped_count} / {d.item_unmapped_count}
                      </td>
                      <td>{formatRupiah(d.pagu_sum)}</td>
                      <td>
                        {d.legacy_renja_id ? (
                          <Badge bg="light" text="dark">
                            legacy_renja_id: {d.legacy_renja_id}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </CardBody>
      </Card>

      <Card className="mb-4 shadow-sm border-warning">
        <CardBody>
          <h6 className="fw-bold mb-2">⚠️ Peringatan konsistensi (audit)</h6>
          {renjaIssues.length === 0 ? (
            <div className="text-success small">Tidak ada isu Renja terbaru.</div>
          ) : (
            <ul className="small mb-0">
              {renjaIssues.slice(0, 14).map((it, idx) => (
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

      <Card className="mb-4 shadow-sm">
        <CardBody>
          <h6 className="fw-bold mb-2">Distribusi pagu (v2)</h6>
          <p className="small text-muted">{dash?.meta?.catatan}</p>
          {loadingDash ? (
            <Spinner size="sm" />
          ) : (
            <Row className="g-2">
              {(dash?.dokumen || []).map((d) => (
                <Col key={d.id} xs={6} md={4} lg={3}>
                  <div className="border rounded p-2 text-center bg-light small">
                    <div className="fw-semibold">Doc #{d.id}</div>
                    <div className="fw-bold text-success">
                      {formatRupiah(d.pagu_sum)}
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          )}
        </CardBody>
      </Card>

      <Accordion className="mb-4">
        <Accordion.Item eventKey="legacy">
          <Accordion.Header>
            <strong>Daftar Renja OPD (legacy)</strong>
            <Badge bg="secondary" className="ms-2">
              tabel renja lama
            </Badge>
          </Accordion.Header>
          <Accordion.Body>
            <p className="small text-muted">
              Bukan <code>renja_dokumen</code>. Untuk jembatan ke RKA/DPA ikuti
              alur backend; jangan mencampur pagu dengan kartu di atas.
            </p>
            <ListRenjaOPD />
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>

      <Card className="shadow-sm border-0 bg-light">
        <CardBody className="small text-muted">
          UI meniru blok Dashboard Renstra (kartu statistik, sidebar, progress,
          disclaimer). Data v2 dari <code>/api/renja/dashboard-v2</code>.
        </CardBody>
      </Card>
    </RenjaPlanningDashboardLayout>
  );
};

export default RenjaDashboard;
