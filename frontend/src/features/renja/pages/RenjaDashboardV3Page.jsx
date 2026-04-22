import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Badge, Button, Card, CardBody, Form, Spinner, Table } from "react-bootstrap";
import RenjaPlanningDashboardLayout from "./RenjaPlanningDashboardLayout";
import {
  getRenjaDashboardActionItems,
  getRenjaDashboardMismatchAlerts,
  getRenjaDashboardRecentDocuments,
  getRenjaDashboardSummary,
} from "../services/renjaGovernanceApi";
import { useDokumen } from "../../../hooks/useDokumen";

const StatCard = ({ title, value, variant = "success" }) => (
  <Card className={`shadow-sm border-start border-4 border-${variant}`}>
    <CardBody className="py-3">
      <div className="small text-muted">{title}</div>
      <div className={`h4 fw-bold text-${variant} mb-0`}>{value ?? 0}</div>
    </CardBody>
  </Card>
);

const pct = (n) => `${Number(n || 0).toFixed(2)}%`;

const RenjaDashboardV3Page = () => {
  const navigate = useNavigate();
  const { tahun } = useDokumen();
  const [filters, setFilters] = useState({
    tahun: tahun || "",
    perangkat_daerah_id: "",
    workflow_status: "",
    document_kind: "",
    severity: "",
  });
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [recent, setRecent] = useState([]);
  const [actions, setActions] = useState([]);
  const [mismatch, setMismatch] = useState([]);

  const query = useMemo(() => {
    const q = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== "" && v !== null && v !== undefined) q[k] = v;
    });
    return q;
  }, [filters]);

  const load = async () => {
    setLoading(true);
    try {
      const [s, r, a, m] = await Promise.all([
        getRenjaDashboardSummary(query),
        getRenjaDashboardRecentDocuments(query),
        getRenjaDashboardActionItems(query),
        getRenjaDashboardMismatchAlerts(query),
      ]);
      setSummary(s || {});
      setRecent(Array.isArray(r) ? r : []);
      setActions(Array.isArray(a) ? a : []);
      setMismatch(Array.isArray(m) ? m : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [JSON.stringify(query)]);

  const cards = summary?.summary_cards || {};
  const align = summary?.alignment_summary || {};
  const threshold = summary?.threshold_alerts || {};
  const policy = summary?.policy_chain_issues || {};
  const governance = summary?.governance_panel || {};
  const policyHealth = summary?.policy_chain_health || {};
  const indicatorHealth = summary?.indicator_health || {};

  return (
    <RenjaPlanningDashboardLayout>
      <div className="d-flex flex-wrap justify-content-between gap-2 align-items-center mb-3">
        <div>
          <h3 className="fw-bold text-success mb-0">Dashboard RENJA</h3>
          <div className="small text-muted">Landing page monitoring dan validasi lintas dokumen</div>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Button size="sm" variant="success" onClick={() => navigate("/dashboard-renja/v2/buat")}>
            Buat Dokumen RENJA Baru
          </Button>
          <Button
            size="sm"
            variant="warning"
            onClick={() => recent[0] && navigate(`/dashboard-renja/v2/dokumen/${recent[0].id}/versions`)}
          >
            Buat RENJA Perubahan
          </Button>
          <Button
            size="sm"
            variant="outline-primary"
            onClick={() => recent[0] && navigate(`/dashboard-renja/v2/dokumen/${recent[0].id}/compare`)}
          >
            Lihat Compare Versi
          </Button>
          <Button
            size="sm"
            variant="outline-success"
            onClick={() => recent[0] && navigate(`/dashboard-renja/v2/dokumen/${recent[0].id}/data-fix`)}
          >
            Data Fix & Mapping
          </Button>
        </div>
      </div>

      <Card className="mb-3 shadow-sm">
        <CardBody>
          <div className="row g-2">
            <div className="col-md-3">
              <Form.Control
                placeholder="Tahun"
                value={filters.tahun}
                onChange={(e) => setFilters((p) => ({ ...p, tahun: e.target.value }))}
              />
            </div>
            <div className="col-md-3">
              <Form.Control
                placeholder="OPD ID"
                value={filters.perangkat_daerah_id}
                onChange={(e) => setFilters((p) => ({ ...p, perangkat_daerah_id: e.target.value }))}
              />
            </div>
            <div className="col-md-3">
              <Form.Select
                value={filters.workflow_status}
                onChange={(e) => setFilters((p) => ({ ...p, workflow_status: e.target.value }))}
              >
                <option value="">Semua status</option>
                <option value="draft">draft</option>
                <option value="submitted">submitted</option>
                <option value="reviewed">reviewed</option>
                <option value="approved">approved</option>
                <option value="published">published</option>
              </Form.Select>
            </div>
            <div className="col-md-3">
              <Form.Select
                value={filters.document_kind}
                onChange={(e) => setFilters((p) => ({ ...p, document_kind: e.target.value }))}
              >
                <option value="">Semua jenis</option>
                <option value="renja_awal">renja_awal</option>
                <option value="renja_perubahan">renja_perubahan</option>
              </Form.Select>
            </div>
            <div className="col-md-3">
              <Form.Select
                value={filters.severity}
                onChange={(e) => setFilters((p) => ({ ...p, severity: e.target.value }))}
              >
                <option value="">Semua severity mismatch</option>
                <option value="BLOCKER">BLOCKER</option>
                <option value="WARNING">WARNING</option>
                <option value="INFO">INFO</option>
              </Form.Select>
            </div>
          </div>
        </CardBody>
      </Card>

      {loading ? (
        <Spinner animation="border" />
      ) : (
        <>
          <div className="row g-3 mb-3">
            <div className="col-md-2"><StatCard title="Jumlah Dokumen" value={cards.jumlah_dokumen} /></div>
            <div className="col-md-2"><StatCard title="Draft" value={cards.jumlah_draft} variant="secondary" /></div>
            <div className="col-md-2"><StatCard title="Submitted/Reviewed" value={cards.jumlah_submitted_reviewed} variant="warning" /></div>
            <div className="col-md-2"><StatCard title="Final" value={cards.jumlah_final} variant="success" /></div>
            <div className="col-md-2"><StatCard title="Perubahan" value={cards.jumlah_dokumen_perubahan} variant="info" /></div>
            <div className="col-md-2"><StatCard title="Mismatch" value={cards.jumlah_mismatch} variant="danger" /></div>
            <div className="col-md-2"><StatCard title="Blocker" value={cards.jumlah_blocker_issues ?? cards.jumlah_blocking_issues} variant="danger" /></div>
            <div className="col-md-2"><StatCard title="Warning" value={cards.jumlah_warning_issues} variant="warning" /></div>
            <div className="col-md-2"><StatCard title="Info" value={cards.jumlah_info_issues} variant="info" /></div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-lg-4">
              <Card className="shadow-sm h-100">
                <CardBody>
                  <h6 className="fw-bold">Alignment ke Dokumen Sumber</h6>
                  <Table size="sm" bordered>
                    <tbody>
                      <tr>
                        <td>RENSTRA</td>
                        <td className="text-end">{pct(align?.renstra_alignment?.alignment_pct)}</td>
                      </tr>
                      <tr>
                        <td>RKPD</td>
                        <td className="text-end">{pct(align?.rkpd_alignment?.alignment_pct)}</td>
                      </tr>
                      <tr>
                        <td>Strategi</td>
                        <td className="text-end">{pct(align?.strategi_alignment?.alignment_pct)}</td>
                      </tr>
                      <tr>
                        <td>Arah Kebijakan</td>
                        <td className="text-end">{pct(align?.arah_kebijakan_alignment?.alignment_pct)}</td>
                      </tr>
                    </tbody>
                  </Table>
                </CardBody>
              </Card>
            </div>
            <div className="col-lg-4">
              <Card className="shadow-sm h-100">
                <CardBody>
                  <h6 className="fw-bold">Threshold Alerts</h6>
                  <div className="small">Target warning: <b>{threshold.target_warning_count || 0}</b></div>
                  <div className="small">Target error: <b>{threshold.target_error_count || 0}</b></div>
                  <div className="small">Pagu warning: <b>{threshold.pagu_warning_count || 0}</b></div>
                  <div className="small">Pagu error: <b>{threshold.pagu_error_count || 0}</b></div>
                  <div className="small">Indikator warning: <b>{threshold.indicator_warning_count || 0}</b></div>
                  <div className="small">Indikator error: <b>{threshold.indicator_error_count || 0}</b></div>
                </CardBody>
              </Card>
            </div>
            <div className="col-lg-4">
              <Card className="shadow-sm h-100 border-warning">
                <CardBody>
                  <h6 className="fw-bold text-warning">Governance & Policy Chain</h6>
                  <div className="small">Status READY: <b>{governance.ready_count || 0}</b></div>
                  <div className="small">Status WARNING: <b>{governance.warning_doc_count || 0}</b></div>
                  <div className="small">Status BLOCKED: <b>{governance.blocked_count || 0}</b></div>
                  <hr className="my-2" />
                  <div className="small">Chain broken: <b>{policy.chain_broken_count || 0}</b></div>
                  <div className="small">Chain incomplete: <b>{policy.chain_incomplete_count || 0}</b></div>
                  <div className="small">Strategi tidak selaras: <b>{policy.strategy_not_aligned_count || 0}</b></div>
                  <div className="small">Arah kebijakan tidak selaras: <b>{policy.arah_kebijakan_not_aligned_count || 0}</b></div>
                  <div className="small">Sasaran tidak selaras: <b>{policy.sasaran_not_aligned_count || 0}</b></div>
                  <div className="small">Tujuan tidak selaras: <b>{policy.tujuan_not_aligned_count || 0}</b></div>
                  <div className="small">Misi tidak selaras: <b>{policy.misi_not_aligned_count || 0}</b></div>
                  <hr className="my-2" />
                  <div className="small">Policy chain valid: <b>{pct(policyHealth.valid_pct)}</b></div>
                  <div className="small">Policy chain broken: <b>{pct(policyHealth.broken_pct)}</b></div>
                  <div className="small">Indicator valid: <b>{pct(indicatorHealth.valid_pct)}</b></div>
                  <div className="small">Indicator missing: <b>{pct(indicatorHealth.missing_pct)}</b></div>
                </CardBody>
              </Card>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-lg-7">
              <Card className="shadow-sm mb-3">
                <CardBody>
                  <h6 className="fw-bold">Dokumen Terbaru</h6>
                  <Table striped bordered size="sm" responsive>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Judul</th>
                        <th>Status</th>
                        <th>Jenis</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!recent.length ? (
                        <tr><td colSpan={5} className="text-muted">Belum ada dokumen.</td></tr>
                      ) : recent.map((d) => (
                        <tr key={d.id}>
                          <td>#{d.id}</td>
                          <td>{d.judul}</td>
                          <td><Badge bg="secondary">{d.workflow_status}</Badge></td>
                          <td>{d.document_kind}</td>
                          <td>
                            <div className="d-flex gap-2">
                              <Link to={`/dashboard-renja/v2/dokumen/${d.id}`}>Buka</Link>
                              <Link to={`/dashboard-renja/v2/dokumen/${d.id}/data-fix`}>Data Fix</Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </CardBody>
              </Card>
              <Card className="shadow-sm">
                <CardBody>
                  <h6 className="fw-bold">Perlu Tindakan</h6>
                  <ul className="small mb-0">
                    {actions.slice(0, 10).map((x) => (
                      <li key={x.id}>
                        <Link to={`/dashboard-renja/v2/dokumen/${x.id}`}>Dokumen #{x.id}</Link> - {x.workflow_status}
                      </li>
                    ))}
                    {!actions.length && <li className="text-muted">Tidak ada action item.</li>}
                  </ul>
                </CardBody>
              </Card>
            </div>
            <div className="col-lg-5">
              <Card className="shadow-sm mb-3 border-warning">
                <CardBody>
                  <h6 className="fw-bold text-warning">Warning Mismatch</h6>
                  <ul className="small mb-0">
                    {mismatch
                      .filter(
                        (x) =>
                          !filters.severity ||
                          String(x.severity_final || "").toUpperCase() === String(filters.severity || "").toUpperCase(),
                      )
                      .slice(0, 12)
                      .map((x) => (
                        <li key={x.id}>
                          Doc #{x.renja_dokumen_id}
                          {x.renja_item_id ? ` - Item #${x.renja_item_id}` : ""}
                          {x.renjaItem?.program ? ` - ${x.renjaItem.program}` : ""}
                          {" "}
                          <Badge
                            bg={
                              x.severity_final === "BLOCKER"
                                ? "danger"
                                : x.severity_final === "INFO"
                                  ? "secondary"
                                  : "warning"
                            }
                            text={x.severity_final === "WARNING" ? "dark" : "light"}
                          >
                            {(x.severity_final || "WARNING") + " - " + (x.mismatch_code || "MISMATCH")}
                          </Badge>
                        </li>
                      ))}
                    {!mismatch.length && <li className="text-success">Tidak ada mismatch.</li>}
                  </ul>
                </CardBody>
              </Card>
              <Card className="shadow-sm">
                <CardBody>
                  <h6 className="fw-bold">Progress Penyusunan</h6>
                  <Table size="sm" bordered>
                    <thead>
                      <tr>
                        <th>Dokumen</th>
                        <th>BAB I-V</th>
                        <th>Item</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(summary?.progress_penyusunan || []).slice(0, 8).map((p) => (
                        <tr key={p.id}>
                          <td><Link to={`/dashboard-renja/v2/dokumen/${p.id}`}>#{p.id}</Link></td>
                          <td>{p.chapter_completion_pct}%</td>
                          <td>{p.item_completion_pct}%</td>
                          <td>
                            <Badge
                              bg={
                                p.readiness_status === "BLOCKED"
                                  ? "danger"
                                  : p.readiness_status === "WARNING"
                                    ? "warning"
                                    : "success"
                              }
                              text={p.readiness_status === "WARNING" ? "dark" : "light"}
                            >
                              {p.readiness_status || (p.blocker_count > 0 ? "BLOCKED" : "READY")}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </CardBody>
              </Card>
            </div>
          </div>
        </>
      )}
    </RenjaPlanningDashboardLayout>
  );
};

export default RenjaDashboardV3Page;
