import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Breadcrumb,
  Button,
  Card,
  Col,
  Container,
  Form,
  Modal,
  OverlayTrigger,
  ProgressBar,
  Row,
  Spinner,
  Table,
  Tooltip,
} from "react-bootstrap";
import { Link } from "react-router-dom";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "../../../services/api";
import { useDokumen } from "../../../hooks/useDokumen";
import { usePeriodeAktif } from "../hooks/usePeriodeAktif";
import { extractListData } from "../../../utils/apiResponse";
import { useAuth } from "../../../hooks/useAuth";
import { hasPlanFeature, PLAN_FEATURE_KEYS, PRICING_PATH } from "../../../utils/planFeatures";

function unwrap(res) {
  const p = res?.data;
  if (p && p.success === true) return p.data;
  return p;
}

function statusVariant(st) {
  if (st === "Hijau") return "success";
  if (st === "Kuning") return "warning";
  if (st === "Merah") return "danger";
  return "secondary";
}

function progressVariant(statusKey) {
  if (statusKey === "hijau") return "success";
  if (statusKey === "kuning") return "warning";
  if (statusKey === "merah") return "danger";
  return "secondary";
}

function fmtDevTip(i, target, capaian, dev) {
  const t = target?.[i];
  const c = capaian?.[i];
  const d = dev?.[i];
  return `Tahun ${i + 1}: target ${t ?? "—"}, capaian ${c ?? "—"}, deviasi ${d ?? "—"}`;
}

export default function RpjmdMonitoringIndikator() {
  const { user } = useAuth();
  const canExport = hasPlanFeature(user, PLAN_FEATURE_KEYS.export);
  const { dokumen, tahun } = useDokumen();
  const { periode_id, periodeList } = usePeriodeAktif();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [payload, setPayload] = useState(null);
  const [meta, setMeta] = useState(null);
  const [sasaranFilter, setSasaranFilter] = useState("");
  const [sasaranOptions, setSasaranOptions] = useState([]);
  const [chartPick, setChartPick] = useState("");
  const [exportBusy, setExportBusy] = useState(null);
  const [drillOpen, setDrillOpen] = useState(false);
  const [drillLoading, setDrillLoading] = useState(false);
  const [drillErr, setDrillErr] = useState("");
  const [drillData, setDrillData] = useState(null);
  const [drillTitle, setDrillTitle] = useState("");

  const periodeLabel = useMemo(() => {
    const p = (periodeList || []).find((x) => String(x.id) === String(periode_id));
    if (p?.tahun_awal != null && p?.tahun_akhir != null) return `${p.tahun_awal} – ${p.tahun_akhir}`;
    return periode_id ? `#${periode_id}` : "—";
  }, [periodeList, periode_id]);

  const loadSasaran = useCallback(async () => {
    if (!periode_id || !dokumen || !tahun) return;
    try {
      const res = await api.get("/sasaran", {
        params: { periode_id, jenis_dokumen: dokumen, tahun, limit: 500, page: 1 },
      });
      setSasaranOptions(extractListData(res.data));
    } catch {
      setSasaranOptions([]);
    }
  }, [periode_id, dokumen, tahun]);

  const loadMonitoring = useCallback(
    async (refresh = false) => {
      if (!periode_id) {
        setErr("Periode RPJMD belum dipilih.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setErr("");
      try {
        const res = await api.get(`/rpjmd-monitoring/indikator/${periode_id}`, {
          params: {
            ...(sasaranFilter ? { sasaranId: sasaranFilter } : {}),
            ...(refresh ? { refresh: 1 } : {}),
          },
        });
        setPayload(unwrap(res));
        setMeta(res?.data?.meta || null);
      } catch (e) {
        setErr(e?.response?.data?.message || e.message || "Gagal memuat data.");
        setPayload(null);
        setMeta(null);
      } finally {
        setLoading(false);
      }
    },
    [periode_id, sasaranFilter],
  );

  useEffect(() => {
    loadSasaran();
  }, [loadSasaran]);

  useEffect(() => {
    loadMonitoring(false);
  }, [loadMonitoring]);

  const downloadExport = async (format) => {
    if (!periode_id || !canExport) return;
    setExportBusy(format);
    try {
      const res = await api.get(`/rpjmd-monitoring/export/${periode_id}`, {
        params: {
          format: format === "pdf" ? "pdf" : "excel",
          ...(sasaranFilter ? { sasaranId: sasaranFilter } : {}),
        },
        responseType: "blob",
      });
      const ext = format === "pdf" ? "pdf" : "xlsx";
      const blob = new Blob([res.data], {
        type: ext === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `monitoring-indikator-rpjmd-${periode_id}.${ext}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Gagal mengunduh ekspor.");
    } finally {
      setExportBusy(null);
    }
  };

  const openDrill = async (row) => {
    if (!periode_id || !row?.indikatorId) return;
    setDrillTitle(row.nama || "Detail indikator");
    setDrillOpen(true);
    setDrillLoading(true);
    setDrillErr("");
    setDrillData(null);
    try {
      const res = await api.get(`/rpjmd-monitoring/indikator/${periode_id}/detail/${row.indikatorId}`);
      setDrillData(unwrap(res));
    } catch (e) {
      setDrillErr(e?.response?.data?.message || e.message || "Gagal memuat detail.");
    } finally {
      setDrillLoading(false);
    }
  };

  const flatRows = useMemo(() => {
    const out = [];
    const sasaran = payload?.sasaran || [];
    for (const s of sasaran) {
      for (const ind of s.indikator || []) {
        out.push({
          key: `${s.sasaran_id}-${ind.id}`,
          indikatorId: ind.id,
          sasaran: s.sasaran_nama,
          nama: ind.nama,
          kode: ind.kode,
          satuan: ind.satuan,
          target: ind.target,
          capaian: ind.capaian,
          deviasi: ind.deviasi,
          status: ind.status,
          statusKey: ind.status_key,
          progressPct: ind.progress_pct != null ? Number(ind.progress_pct) : null,
        });
      }
    }
    return out;
  }, [payload]);

  useEffect(() => {
    if (!flatRows.length) {
      setChartPick("");
      return;
    }
    if (!chartPick || !flatRows.some((r) => r.key === chartPick)) {
      setChartPick(flatRows[0].key);
    }
  }, [flatRows, chartPick]);

  const chartRow = flatRows.find((r) => r.key === chartPick) || flatRows[0];
  const chartData = chartRow
    ? [1, 2, 3, 4, 5].map((i) => ({
        name: `Th${i}`,
        target: chartRow.target[i - 1] ?? null,
        capaian: chartRow.capaian[i - 1] ?? null,
      }))
    : [];

  const summary = payload?.summary;
  const tidakTercapai = summary?.jumlah_tidak_tercapai ?? 0;

  return (
    <Container fluid className="py-4">
      <Breadcrumb className="mb-3">
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: "/dashboard-rpjmd" }}>
          Dashboard RPJMD
        </Breadcrumb.Item>
        <Breadcrumb.Item active>Monitoring Indikator RPJMD</Breadcrumb.Item>
      </Breadcrumb>

      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <h4 className="mb-0">Monitoring Indikator RPJMD</h4>
        <div className="d-flex flex-wrap align-items-center gap-2">
          {tidakTercapai > 0 ? (
            <Badge bg="danger" className="fs-6">
              {tidakTercapai} merah
            </Badge>
          ) : null}
          <Button
            variant="outline-success"
            size="sm"
            disabled={!periode_id || exportBusy || !canExport}
            title={!canExport ? "Upgrade ke PRO" : undefined}
            onClick={() => downloadExport("excel")}
          >
            {exportBusy === "excel" ? <Spinner animation="border" size="sm" className="me-1" /> : null}
            Excel
          </Button>
          <Button
            variant="outline-danger"
            size="sm"
            disabled={!periode_id || exportBusy || !canExport}
            title={!canExport ? "Upgrade ke PRO" : undefined}
            onClick={() => downloadExport("pdf")}
          >
            {exportBusy === "pdf" ? <Spinner animation="border" size="sm" className="me-1" /> : null}
            PDF
          </Button>
        </div>
      </div>

      {!canExport ? (
        <Alert variant="light" className="border py-2 small mb-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
          <span>
            <strong>Upgrade ke PRO</strong> — unduhan Excel/PDF tidak tersedia pada paket langganan Anda.
          </span>
          <Button as={Link} to={PRICING_PATH} variant="warning" size="sm" className="text-dark fw-semibold">
            Upgrade ke PRO
          </Button>
        </Alert>
      ) : null}

      {err ? <Alert variant="danger">{err}</Alert> : null}
      {!loading && tidakTercapai > 0 ? (
        <Alert variant="warning" className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <span>
            <strong>{tidakTercapai}</strong> indikator tidak tercapai (status merah — capaian &lt; 80% dari target
            pada tahun terburuk).
          </span>
        </Alert>
      ) : null}
      {meta?.cached ? (
        <Alert variant="light" className="small py-2 border mb-2">
          Data dari cache (TTL 5 menit).{" "}
          <Button variant="link" size="sm" className="p-0 align-baseline" onClick={() => loadMonitoring(true)}>
            Segarkan
          </Button>
        </Alert>
      ) : null}

      <Card className="mb-3 shadow-sm">
        <Card.Body>
          <Row className="g-2 align-items-end">
            <Col md={4}>
              <Form.Label className="small">Periode</Form.Label>
              <Form.Control readOnly disabled className="bg-light" value={periodeLabel} />
            </Col>
            <Col md={4}>
              <Form.Label className="small">Filter sasaran</Form.Label>
              <Form.Select
                value={sasaranFilter}
                onChange={(e) => setSasaranFilter(e.target.value)}
                disabled={loading}
              >
                <option value="">Semua sasaran</option>
                {sasaranOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {(s.nomor != null ? `${s.nomor} · ` : "") + (s.isi_sasaran || "").slice(0, 80)}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={4} className="text-md-end small text-muted">
              Klik baris indikator untuk drill-down program &amp; kegiatan.
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {loading ? (
        <div className="d-flex align-items-center gap-2 my-3">
          <Spinner animation="border" size="sm" />
          Memuat…
        </div>
      ) : null}

      {!loading && payload ? (
        <>
          <Row className="g-3 mb-3">
            <Col md={3}>
              <Card className="shadow-sm h-100">
                <Card.Body>
                  <div className="text-muted small">Total indikator sasaran</div>
                  <div className="fs-4 fw-semibold">{summary?.total_indikator ?? flatRows.length}</div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="shadow-sm h-100">
                <Card.Body>
                  <div className="text-muted small">Rata-rata capaian / target (%)</div>
                  <div className="fs-4 fw-semibold">
                    {summary?.rata_rata_capaian_pct != null ? `${summary.rata_rata_capaian_pct}%` : "—"}
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="shadow-sm h-100">
                <Card.Body>
                  <div className="text-muted small">Tercapai (hijau)</div>
                  <div className="fs-4 fw-semibold text-success">{summary?.jumlah_tercapai ?? 0}</div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="shadow-sm h-100 border-danger border-opacity-50">
                <Card.Body>
                  <div className="text-muted small">Tidak tercapai (merah)</div>
                  <div className="fs-4 fw-semibold text-danger">{tidakTercapai}</div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Card className="mb-3 shadow-sm">
            <Card.Header className="small fw-semibold">Grafik target vs capaian (Recharts)</Card.Header>
            <Card.Body style={{ minHeight: 280 }}>
              {flatRows.length ? (
                <>
                  <Form.Group className="mb-2">
                    <Form.Label className="small">Baris untuk grafik</Form.Label>
                    <Form.Select size="sm" value={chartPick} onChange={(e) => setChartPick(e.target.value)}>
                      {flatRows.map((r) => (
                        <option key={r.key} value={r.key}>
                          {r.sasaran?.slice(0, 40)} — {r.nama?.slice(0, 60)}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      <Line type="monotone" dataKey="target" name="Target" stroke="#0d6efd" dot />
                      <Line type="monotone" dataKey="capaian" name="Capaian" stroke="#198754" dot />
                    </LineChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <Alert variant="light" className="mb-0">
                  Belum ada data indikator sasaran untuk periode ini.
                </Alert>
              )}
            </Card.Body>
          </Card>

          <div className="table-responsive">
            <Table striped bordered hover size="sm" className="bg-white">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 120 }}>Capaian</th>
                  <th>Sasaran</th>
                  <th>Indikator</th>
                  <th>T1</th>
                  <th>T2</th>
                  <th>T3</th>
                  <th>T4</th>
                  <th>T5</th>
                  <th>C1</th>
                  <th>C2</th>
                  <th>C3</th>
                  <th>C4</th>
                  <th>C5</th>
                  <th>D1</th>
                  <th>D2</th>
                  <th>D3</th>
                  <th>D4</th>
                  <th>D5</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {!flatRows.length ? (
                  <tr>
                    <td colSpan={19} className="text-center text-muted py-3">
                    Tidak ada baris.
                    </td>
                  </tr>
                ) : (
                  flatRows.map((r) => (
                    <tr
                      key={r.key}
                      className={r.statusKey === "merah" ? "table-danger" : undefined}
                      role="button"
                      style={{ cursor: "pointer" }}
                      onClick={() => openDrill(r)}
                      title="Klik untuk detail program & kegiatan"
                    >
                      <td className="align-middle" style={{ minWidth: 100 }}>
                        {r.progressPct != null ? (
                          <ProgressBar
                            now={r.progressPct}
                            label={`${r.progressPct}%`}
                            visuallyHidden
                            variant={progressVariant(r.statusKey)}
                            style={{ height: 22 }}
                          />
                        ) : (
                          <span className="text-muted small">—</span>
                        )}
                      </td>
                      <td style={{ maxWidth: 200 }}>{r.sasaran}</td>
                      <td style={{ maxWidth: 220 }} className="fw-medium">
                        {r.nama}
                      </td>
                      {[0, 1, 2, 3, 4].map((i) => (
                        <td key={`t${i}`} className="text-nowrap small">
                          {r.target?.[i] ?? "—"}
                        </td>
                      ))}
                      {[0, 1, 2, 3, 4].map((i) => (
                        <td key={`c${i}`} className="text-nowrap small">
                          {r.capaian?.[i] ?? "—"}
                        </td>
                      ))}
                      {[0, 1, 2, 3, 4].map((i) => (
                        <td key={`d${i}`} className="text-nowrap small p-0">
                          <OverlayTrigger
                            placement="top"
                            overlay={
                              <Tooltip id={`dev-${r.key}-${i}`}>{fmtDevTip(i, r.target, r.capaian, r.deviasi)}</Tooltip>
                            }
                          >
                            <span className="d-block px-2 py-1">{r.deviasi?.[i] ?? "—"}</span>
                          </OverlayTrigger>
                        </td>
                      ))}
                      <td>
                        <Badge bg={statusVariant(r.status)}>{r.status}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </>
      ) : null}

      <Modal show={drillOpen} onHide={() => setDrillOpen(false)} size="lg" centered scrollable>
        <Modal.Header closeButton>
          <Modal.Title className="h6">Drill-down: {drillTitle}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {drillLoading ? (
            <div className="d-flex align-items-center gap-2">
              <Spinner size="sm" animation="border" />
              Memuat…
            </div>
          ) : null}
          {drillErr ? <Alert variant="danger">{drillErr}</Alert> : null}
          {drillData?.indikator_sasaran ? (
            <>
              <h6 className="small text-muted mb-2">Target vs capaian (indikator sasaran)</h6>
              <Table size="sm" bordered className="mb-3">
                <thead>
                  <tr>
                    <th />
                    <th>Th1</th>
                    <th>Th2</th>
                    <th>Th3</th>
                    <th>Th4</th>
                    <th>Th5</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Target</td>
                    {drillData.indikator_sasaran.target?.map((v, i) => <td key={i}>{v ?? "—"}</td>)}
                  </tr>
                  <tr>
                    <td>Capaian</td>
                    {drillData.indikator_sasaran.capaian?.map((v, i) => <td key={i}>{v ?? "—"}</td>)}
                  </tr>
                  <tr>
                    <td>Deviasi</td>
                    {drillData.indikator_sasaran.deviasi?.map((v, i) => <td key={i}>{v ?? "—"}</td>)}
                  </tr>
                </tbody>
              </Table>

              <h6 className="small text-muted mb-2">Program terkait (indikator program)</h6>
              <div className="table-responsive mb-3">
                <Table striped size="sm" bordered>
                  <thead>
                    <tr>
                      <th>Kode</th>
                      <th>Nama indikator</th>
                      <th>Program</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!(drillData.program || []).length ? (
                      <tr>
                        <td colSpan={3} className="text-muted">
                          Tidak ada program turunan.
                        </td>
                      </tr>
                    ) : (
                      drillData.program.map((p) => (
                        <tr key={p.id}>
                          <td>{p.kode_indikator}</td>
                          <td>{p.nama_indikator}</td>
                          <td>
                            {p.kode_program ? `${p.kode_program} — ` : ""}
                            {p.nama_program || "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>

              <h6 className="small text-muted mb-2">Kegiatan terkait (indikator kegiatan)</h6>
              <div className="table-responsive">
                <Table striped size="sm" bordered>
                  <thead>
                    <tr>
                      <th>Kode</th>
                      <th>Nama indikator</th>
                      <th>ID ind. program</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!(drillData.kegiatan || []).length ? (
                      <tr>
                        <td colSpan={3} className="text-muted">
                          Tidak ada kegiatan turunan.
                        </td>
                      </tr>
                    ) : (
                      drillData.kegiatan.map((k) => (
                        <tr key={k.id}>
                          <td>{k.kode_indikator}</td>
                          <td>{k.nama_indikator}</td>
                          <td>{k.indikator_program_id}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </>
          ) : null}
        </Modal.Body>
      </Modal>
    </Container>
  );
}
