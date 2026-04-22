import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Breadcrumb,
  Button,
  Card,
  Col,
  Container,
  Row,
  Spinner,
  Table,
} from "react-bootstrap";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "../../../services/api";
import { usePeriodeAktif } from "../hooks/usePeriodeAktif";
import { useAuth } from "../../../hooks/useAuth";
import { hasPlanFeature, PLAN_FEATURE_KEYS, PRICING_PATH } from "../../../utils/planFeatures";
import UpgradeProHint from "../../../shared/components/UpgradeProHint";

function unwrap(res) {
  const p = res?.data;
  if (p && p.success === true) return p.data;
  return p;
}

function statusVariant(st) {
  if (st === "hijau") return "success";
  if (st === "kuning") return "warning";
  if (st === "merah") return "danger";
  return "secondary";
}

export default function RpjmdMonitoringOPD() {
  const { user } = useAuth();
  const canOpd = hasPlanFeature(user, PLAN_FEATURE_KEYS.monitoring_opd);
  const canAlerts = hasPlanFeature(user, PLAN_FEATURE_KEYS.early_warning);
  const { periode_id, periodeList } = usePeriodeAktif();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [opdPayload, setOpdPayload] = useState(null);
  const [alertsPayload, setAlertsPayload] = useState(null);

  const periodeLabel = useMemo(() => {
    const p = (periodeList || []).find((x) => String(x.id) === String(periode_id));
    if (p?.tahun_awal != null && p?.tahun_akhir != null) return `${p.tahun_awal} – ${p.tahun_akhir}`;
    return periode_id ? `#${periode_id}` : "—";
  }, [periodeList, periode_id]);

  const load = useCallback(async () => {
    if (!canOpd && !canAlerts) {
      setErr("");
      setLoading(false);
      setOpdPayload(null);
      setAlertsPayload(null);
      return;
    }
    if (!periode_id) {
      setErr("Periode RPJMD belum dipilih.");
      setLoading(false);
      setOpdPayload(null);
      setAlertsPayload(null);
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const tasks = [];
      if (canOpd) {
        tasks.push(
          api.get(`/rpjmd-monitoring/opd/${periode_id}`).then((r) => ({ kind: "opd", r })),
        );
      }
      if (canAlerts) {
        tasks.push(
          api.get(`/rpjmd-monitoring/alerts/${periode_id}`).then((r) => ({ kind: "alerts", r })),
        );
      }
      const settled = await Promise.all(tasks);
      let opd = null;
      let alerts = null;
      for (const row of settled) {
        if (row.kind === "opd") opd = unwrap(row.r);
        if (row.kind === "alerts") alerts = unwrap(row.r);
      }
      setOpdPayload(opd);
      setAlertsPayload(alerts);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Gagal memuat data.");
      setOpdPayload(null);
      setAlertsPayload(null);
    } finally {
      setLoading(false);
    }
  }, [periode_id, canOpd, canAlerts]);

  useEffect(() => {
    load();
  }, [load]);

  const chartData = useMemo(() => {
    const list = opdPayload?.opd || [];
    return list
      .filter((o) => o.rata_rata_progress_pct != null)
      .map((o) => ({
        name: o.opd_nama?.length > 28 ? `${o.opd_nama.slice(0, 28)}…` : o.opd_nama,
        fullName: o.opd_nama,
        skor: o.rata_rata_progress_pct,
      }));
  }, [opdPayload]);

  const s = opdPayload?.summary;
  const alertSum = alertsPayload?.summary;
  const merahList = alertsPayload?.indikator_merah || [];

  return (
    <Container fluid className="py-3">
      <Breadcrumb>
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: "/dashboard-rpjmd" }}>
          Dashboard RPJMD
        </Breadcrumb.Item>
        <Breadcrumb.Item active>Monitoring capaian per OPD</Breadcrumb.Item>
      </Breadcrumb>

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h4 className="mb-0">Capaian indikator sasaran per OPD</h4>
          <small className="text-muted">Periode {periodeLabel}</small>
        </div>
        <div className="d-flex gap-2">
          <Link className="btn btn-outline-secondary btn-sm" to="/dashboard-rpjmd/monitoring-indikator">
            Monitoring indikator
          </Link>
          {hasPlanFeature(user, PLAN_FEATURE_KEYS.heatmap) ? (
            <Link className="btn btn-outline-secondary btn-sm" to="/dashboard-rpjmd/monitoring-heatmap">
              Heatmap
            </Link>
          ) : (
            <span className="btn btn-outline-secondary btn-sm disabled" title="Upgrade ke PRO">
              Heatmap
            </span>
          )}
        </div>
      </div>

      {!canOpd && !canAlerts ? <UpgradeProHint /> : null}
      {canOpd && !canAlerts ? (
        <Alert variant="light" className="border d-flex flex-wrap align-items-center justify-content-between gap-2">
          <span>
            <strong>Upgrade ke PRO</strong> — peringatan dini (alert) tidak tersedia pada paket Anda.
          </span>
          <Button as={Link} to={PRICING_PATH} variant="warning" size="sm" className="text-dark fw-semibold">
            Upgrade ke PRO
          </Button>
        </Alert>
      ) : null}
      {!canOpd && canAlerts ? (
        <Alert variant="light" className="border d-flex flex-wrap align-items-center justify-content-between gap-2">
          <span>
            <strong>Upgrade ke PRO</strong> — tabel capaian per OPD tidak tersedia pada paket Anda.
          </span>
          <Button as={Link} to={PRICING_PATH} variant="warning" size="sm" className="text-dark fw-semibold">
            Upgrade ke PRO
          </Button>
        </Alert>
      ) : null}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : err ? (
        <Alert variant="danger">{err}</Alert>
      ) : !canOpd && !canAlerts ? null : (
        <>
          {canAlerts && alertSum?.jumlah_merah > 0 && (
            <Alert variant="danger" className="d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div>
                <strong>Peringatan dini:</strong> {alertSum.jumlah_merah} indikator berstatus merah (capaian di bawah
                80% terhadap target). {alertSum.jumlah_kuning > 0 ? ` ${alertSum.jumlah_kuning} indikator kuning (80–99%).` : ""}
              </div>
              <Badge bg="dark">{alertSum.perlu_perhatian} perlu perhatian</Badge>
            </Alert>
          )}
          {canAlerts && alertSum?.jumlah_merah === 0 && alertSum?.jumlah_kuning > 0 && (
            <Alert variant="warning">
              <strong>Siaga:</strong> {alertSum.jumlah_kuning} indikator kuning (80–99%). Tidak ada indikator merah.
            </Alert>
          )}

          {canOpd ? (
          <Row className="g-3 mb-4">
            <Col sm={6} md={3}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <div className="text-muted small">Total indikator</div>
                  <div className="fs-4 fw-semibold">{s?.total_indikator ?? 0}</div>
                </Card.Body>
              </Card>
            </Col>
            <Col sm={6} md={3}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body>
                  <div className="text-muted small">OPD (kelompok penanggung jawab)</div>
                  <div className="fs-4 fw-semibold">{s?.jumlah_opd ?? 0}</div>
                </Card.Body>
              </Card>
            </Col>
            <Col sm={6} md={3}>
              <Card className="border-0 shadow-sm h-100 border-success border-opacity-25">
                <Card.Body>
                  <div className="text-muted small">Hijau (≥100%)</div>
                  <div className="fs-4 fw-semibold text-success">{s?.jumlah_hijau ?? 0}</div>
                </Card.Body>
              </Card>
            </Col>
            <Col sm={6} md={3}>
              <Card className="border-0 shadow-sm h-100 border-danger border-opacity-25">
                <Card.Body>
                  <div className="text-muted small">Merah (di bawah 80%)</div>
                  <div className="fs-4 fw-semibold text-danger">{s?.jumlah_merah ?? 0}</div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          ) : null}

          {canOpd && chartData.length > 0 ? (
            <Card className="border-0 shadow-sm mb-4">
              <Card.Header className="bg-white fw-semibold">Ranking rata-rata capaian vs target (%)</Card.Header>
              <Card.Body style={{ height: Math.min(420, 80 + chartData.length * 36) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis type="category" dataKey="name" width={200} tick={{ fontSize: 11 }} />
                    <RechartsTooltip formatter={(v) => [`${v}%`, "Rata-rata"]} labelFormatter={(_, p) => p?.[0]?.payload?.fullName} />
                    <Bar dataKey="skor" name="Skor %" fill="#0d6efd" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card.Body>
            </Card>
          ) : null}

          {canAlerts && merahList.length > 0 ? (
            <Card className="border-0 shadow-sm mb-4">
              <Card.Header className="bg-white fw-semibold text-danger">Indikator merah</Card.Header>
              <Card.Body className="p-0">
                <Table responsive hover className="mb-0 align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Kode</th>
                      <th>Indikator</th>
                      <th>Sasaran</th>
                      <th>OPD</th>
                      <th>Min cap/target %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {merahList.map((r) => (
                      <tr key={r.id}>
                        <td>{r.kode}</td>
                        <td>{r.nama}</td>
                        <td className="small text-muted">{r.sasaran_nama}</td>
                        <td>{r.opd_nama}</td>
                        <td>{r.min_ratio_pct != null ? `${r.min_ratio_pct}%` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          ) : null}

          {canOpd ? (
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white fw-semibold">Detail per OPD</Card.Header>
            <Card.Body className="p-0">
              <Table responsive hover className="mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>OPD</th>
                    <th>Total</th>
                    <th>Hijau</th>
                    <th>Kuning</th>
                    <th>Merah</th>
                    <th>N/A</th>
                    <th>Rata-rata %</th>
                  </tr>
                </thead>
                <tbody>
                  {(opdPayload?.opd || []).map((o) => (
                    <React.Fragment key={o.opd_id ?? "none"}>
                      <tr>
                        <td className="fw-medium">{o.opd_nama}</td>
                        <td>{o.indikator_total}</td>
                        <td>
                          <Badge bg="success">{o.hijau}</Badge>
                        </td>
                        <td>
                          <Badge bg="warning" text="dark">
                            {o.kuning}
                          </Badge>
                        </td>
                        <td>
                          <Badge bg="danger">{o.merah}</Badge>
                        </td>
                        <td>
                          <Badge bg="secondary">{o.abu}</Badge>
                        </td>
                        <td>{o.rata_rata_progress_pct != null ? `${o.rata_rata_progress_pct}%` : "—"}</td>
                      </tr>
                      {o.indikator?.length > 0 && (
                        <tr className="table-light">
                          <td colSpan={7} className="p-0">
                            <Table size="sm" className="mb-0">
                              <thead>
                                <tr>
                                  <th>Kode</th>
                                  <th>Indikator</th>
                                  <th>Sasaran</th>
                                  <th>Status</th>
                                  <th>Progress %</th>
                                </tr>
                              </thead>
                              <tbody>
                                {o.indikator.map((ind) => (
                                  <tr key={ind.id}>
                                    <td>{ind.kode}</td>
                                    <td>{ind.nama}</td>
                                    <td className="small text-muted">{ind.sasaran_nama}</td>
                                    <td>
                                      <Badge bg={statusVariant(ind.status_key)}>{ind.status_label}</Badge>
                                    </td>
                                    <td>{ind.progress_pct != null ? `${ind.progress_pct}%` : "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </Table>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
          ) : null}
        </>
      )}
    </Container>
  );
}
