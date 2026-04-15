/**
 * LkdDashboardPanel.jsx
 * Dashboard LKD — filter + chart + tabel + export CSV/Excel
 * Data real dari /api/lkd/*
 */
import React, { useState, useEffect, useCallback } from "react";
import {
  Card, Row, Col, Form, Button, Alert, Spinner,
  Table, Badge, ProgressBar,
} from "react-bootstrap";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import {
  FileEarmarkSpreadsheet, Download, ArrowRepeat,
  GraphUp, CurrencyDollar, ListCheck, Award,
} from "react-bootstrap-icons";
import api from "../../../services/api";

// ── Color helpers ──────────────────────────────────────────────────────────────
const pctVariant  = (p) => p >= 100 ? "success" : p >= 75 ? "warning" : "danger";
const pctColor    = (p) => p >= 100 ? "#16a34a" : p >= 75 ? "#d97706" : "#dc2626";
const BAR_COLORS  = ["#1e40af","#2563eb","#3b82f6","#60a5fa","#93c5fd","#bfdbfe","#1e3a8a","#1d4ed8"];

const CURRENT_YEAR = String(new Date().getFullYear());

// ── Rupiah formatter ───────────────────────────────────────────────────────────
function fmtRp(n) {
  if (!n || isNaN(n)) return "Rp 0";
  const num = parseFloat(n);
  if (num >= 1e9)  return `Rp ${(num/1e9).toFixed(1)} M`;
  if (num >= 1e6)  return `Rp ${(num/1e6).toFixed(1)} Jt`;
  if (num >= 1e3)  return `Rp ${(num/1e3).toFixed(0)} Rb`;
  return `Rp ${num.toLocaleString("id-ID")}`;
}

// ── Custom Tooltip untuk chart ─────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border rounded shadow-sm p-2 small">
      <p className="fw-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="mb-0">
          {p.name}: {fmtRp(p.value)}
        </p>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function LkdDashboardPanel() {
  const [filter, setFilter]           = useState({ tahun: CURRENT_YEAR, program: "", periode_id: "" });
  const [tahunList, setTahunList]     = useState([CURRENT_YEAR]);
  const [programList, setProgramList] = useState([]);

  const [summary,          setSummary]          = useState(null);
  const [perProgram,       setPerProgram]        = useState([]);
  const [topKegiatan,      setTopKegiatan]       = useState([]);
  const [indProgress,      setIndProgress]       = useState({ data: [], summary: {} });

  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [downloading, setDownloading] = useState({ csv: false, excel: false });

  // Load tahun + program lists on mount
  useEffect(() => {
    api.get("/lkd/tahun-list").then((r) => setTahunList(r.data?.data || [CURRENT_YEAR])).catch(() => {});
    api.get("/lkd/program-list").then((r) => setProgramList(r.data?.data || [])).catch(() => {});
  }, []);

  const buildParams = useCallback(() => {
    const p = {};
    if (filter.tahun)     p.tahun      = filter.tahun;
    if (filter.program)   p.program    = filter.program;
    if (filter.periode_id) p.periode_id = filter.periode_id;
    return p;
  }, [filter]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = buildParams();
    try {
      const [s, pp, tk, ip] = await Promise.all([
        api.get("/lkd/summary",            { params }),
        api.get("/lkd/per-program",        { params }),
        api.get("/lkd/top-kegiatan",       { params: { ...params, limit: 10 } }),
        api.get("/lkd/indikator-progress", { params }),
      ]);
      setSummary(s.data?.data    || null);
      setPerProgram(pp.data?.data  || []);
      setTopKegiatan(tk.data?.data || []);
      setIndProgress({ data: ip.data?.data || [], summary: ip.data?.summary || {} });
    } catch (e) {
      setError(e.response?.data?.message || "Gagal memuat data dashboard");
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  // Auto-load saat mount
  useEffect(() => { loadAll(); }, []);

  // Download handler
  const download = async (type) => {
    setDownloading((d) => ({ ...d, [type]: true }));
    const ext  = type;
    const mime = type === "csv"
      ? "text/csv"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    try {
      const res = await api.get(`/lkd/export/${type}`, {
        params: buildParams(),
        responseType: "blob",
        timeout: 30000,
      });
      const blob = new Blob([res.data], { type: mime });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `dashboard_lkd_ringkasan_${filter.tahun || CURRENT_YEAR}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(`Gagal download ${type.toUpperCase()}: ${e.message}`);
    } finally {
      setDownloading((d) => ({ ...d, [type]: false }));
    }
  };

  // Chart data
  const chartData = perProgram.slice(0, 8).map((r) => ({
    name: (r.program || r.nama_program || "—").substring(0, 28),
    Anggaran:  parseFloat(r.total_anggaran)  || 0,
    Realisasi: parseFloat(r.total_realisasi) || 0,
  }));

  const hasData = summary?.has_data || perProgram.length > 0;

  return (
    <Card className="shadow-sm border-0">
      <Card.Header className="bg-primary text-white py-3 d-flex align-items-center gap-2">
        <GraphUp size={20} />
        <span className="fw-bold">Dashboard LKD — Laporan Keuangan Dinas</span>
        {summary && (
          <Badge bg="light" text="primary" className="ms-auto small">
            Sumber: {summary.sumber_data}
          </Badge>
        )}
      </Card.Header>

      <Card.Body>
        {/* ── FILTER ROW ── */}
        <Row className="g-2 mb-3 align-items-end">
          <Col md={2}>
            <Form.Label className="small fw-semibold mb-1">Tahun</Form.Label>
            <Form.Select
              size="sm"
              value={filter.tahun}
              onChange={(e) => setFilter((f) => ({ ...f, tahun: e.target.value }))}
            >
              <option value="">Semua Tahun</option>
              {tahunList.map((y) => <option key={y} value={y}>{y}</option>)}
            </Form.Select>
          </Col>

          <Col md={4}>
            <Form.Label className="small fw-semibold mb-1">Program</Form.Label>
            <Form.Select
              size="sm"
              value={filter.program}
              onChange={(e) => setFilter((f) => ({ ...f, program: e.target.value }))}
            >
              <option value="">Semua Program</option>
              {programList.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Form.Select>
          </Col>

          <Col md="auto">
            <Button
              variant="primary"
              size="sm"
              onClick={loadAll}
              disabled={loading}
            >
              {loading
                ? <><Spinner size="sm" animation="border" className="me-1" />Memuat...</>
                : <><ArrowRepeat size={14} className="me-1" />Terapkan Filter</>}
            </Button>
          </Col>

          <Col md="auto" className="ms-auto d-flex gap-2">
            <Button
              variant="outline-success"
              size="sm"
              onClick={() => download("csv")}
              disabled={downloading.csv}
            >
              {downloading.csv
                ? <Spinner size="sm" animation="border" />
                : <><FileEarmarkSpreadsheet size={13} className="me-1" />CSV</>}
            </Button>
            <Button
              variant="success"
              size="sm"
              onClick={() => download("excel")}
              disabled={downloading.excel}
            >
              {downloading.excel
                ? <Spinner size="sm" animation="border" />
                : <><Download size={13} className="me-1" />Excel</>}
            </Button>
          </Col>
        </Row>

        {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}

        {!hasData && !loading && (
          <Alert variant="info" className="py-3 small">
            <strong>Belum ada data LKD untuk tahun {filter.tahun || "yang dipilih"}.</strong>
            <br />Data akan muncul setelah entri LK Dispang atau DPA diisi. Filter sudah diterapkan ke seluruh dashboard.
          </Alert>
        )}

        {/* ── KPI CARDS ── */}
        {summary && (
          <Row className="g-3 mb-4">
            {[
              { icon: <ListCheck className="text-primary" size={22}/>, val: summary.cnt_program, lbl: "Program", color: "primary" },
              { icon: <Award className="text-success" size={22}/>,     val: summary.cnt_kegiatan, lbl: "Kegiatan", color: "success" },
              { icon: <CurrencyDollar className="text-info" size={22}/>, val: fmtRp(summary.total_anggaran), lbl: "Total Pagu", color: "info" },
              {
                icon: <GraphUp className="text-warning" size={22}/>,
                val: `${summary.persen_realisasi}%`,
                lbl: "Realisasi",
                color: pctVariant(summary.persen_realisasi),
              },
            ].map((kpi, i) => (
              <Col md={3} sm={6} key={i}>
                <div className={`p-3 rounded border text-center bg-${kpi.color} bg-opacity-10 h-100`}>
                  <div className="mb-1">{kpi.icon}</div>
                  <div className={`fw-bold fs-5 text-${kpi.color}`}>{kpi.val}</div>
                  <div className="small text-muted">{kpi.lbl}</div>
                </div>
              </Col>
            ))}
          </Row>
        )}

        {/* Anggaran bar */}
        {summary && summary.total_anggaran > 0 && (
          <div className="mb-4 p-3 border rounded bg-light">
            <div className="d-flex justify-content-between mb-1 small">
              <span className="fw-semibold">Realisasi Anggaran Total</span>
              <span className="text-muted">
                {fmtRp(summary.total_realisasi)} / {fmtRp(summary.total_anggaran)}
              </span>
            </div>
            <ProgressBar
              now={Math.min(summary.persen_realisasi || 0, 100)}
              variant={pctVariant(summary.persen_realisasi)}
              label={`${summary.persen_realisasi}%`}
              style={{ height: "20px" }}
            />
          </div>
        )}

        {/* ── CHART Anggaran vs Realisasi per Program ── */}
        {chartData.length > 0 && (
          <Card className="border-0 shadow-sm mb-4">
            <Card.Header className="bg-light fw-semibold small py-2">
              📊 Anggaran vs Realisasi per Program
            </Card.Header>
            <Card.Body style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 9 }}
                    angle={-30}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tickFormatter={(v) => fmtRp(v)} tick={{ fontSize: 9 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Anggaran"  fill="#1e40af" radius={[3,3,0,0]} />
                  <Bar dataKey="Realisasi" fill="#22c55e" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        )}

        {chartData.length === 0 && !loading && (
          <Card className="border-0 shadow-sm mb-4 text-center py-5 text-muted">
            <Card.Body>
              <GraphUp size={36} className="mb-2 text-muted" />
              <p className="small mb-0">
                Chart Anggaran vs Realisasi akan tampil setelah data program tersedia
              </p>
            </Card.Body>
          </Card>
        )}

        {/* ── TOP 10 KEGIATAN ── */}
        <Card className="border-0 shadow-sm mb-4">
          <Card.Header className="bg-light fw-semibold small py-2 d-flex justify-content-between">
            <span>🏆 Top 10 Kegiatan berdasarkan Anggaran</span>
            <span className="text-muted fw-normal">{topKegiatan.length} kegiatan</span>
          </Card.Header>
          <Card.Body className="p-0">
            {topKegiatan.length > 0 ? (
              <div className="table-responsive">
                <Table hover size="sm" className="mb-0 small">
                  <thead className="table-primary">
                    <tr>
                      <th>#</th>
                      <th>Kegiatan</th>
                      <th>Program</th>
                      <th className="text-end">Anggaran</th>
                      <th className="text-end">Realisasi</th>
                      <th className="text-center">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topKegiatan.map((k, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{k.kegiatan || k.nama_kegiatan || "—"}</td>
                        <td className="text-muted">{k.program || k.nama_program || "—"}</td>
                        <td className="text-end">{fmtRp(k.total_anggaran)}</td>
                        <td className="text-end">{fmtRp(k.total_realisasi)}</td>
                        <td className="text-center">
                          <Badge bg={pctVariant(k.persen_realisasi)} className="small">
                            {parseFloat(k.persen_realisasi || 0).toFixed(1)}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-muted small py-3 mb-0">
                Belum ada data kegiatan
              </p>
            )}
          </Card.Body>
        </Card>

        {/* ── INDIKATOR PROGRESS ── */}
        <Card className="border-0 shadow-sm">
          <Card.Header className="bg-light fw-semibold small py-2 d-flex gap-3 align-items-center">
            <span>📈 Progres Indikator Kinerja</span>
            {indProgress.summary?.total > 0 && (
              <span className="ms-auto d-flex gap-2 small fw-normal">
                <Badge bg="success">{indProgress.summary.tercapai} Tercapai</Badge>
                <Badge bg="warning" text="dark">{indProgress.summary.hampir} Hampir</Badge>
                <Badge bg="danger">{indProgress.summary.belum} Belum</Badge>
              </span>
            )}
          </Card.Header>
          <Card.Body className="p-0">
            {indProgress.data.length > 0 ? (
              <div className="table-responsive">
                <Table hover size="sm" className="mb-0 small">
                  <thead className="table-light">
                    <tr>
                      <th>Indikator</th>
                      <th>Satuan</th>
                      <th className="text-center">Target</th>
                      <th className="text-center">Realisasi</th>
                      <th style={{ minWidth: "120px" }}>Capaian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {indProgress.data.map((ind) => {
                      const pct = parseFloat(ind.pct_capaian) || 0;
                      return (
                        <tr key={ind.id}>
                          <td>{ind.nama_indikator}</td>
                          <td>{ind.satuan || "—"}</td>
                          <td className="text-center">{parseFloat(ind.target) || "—"}</td>
                          <td className="text-center">{parseFloat(ind.realisasi) || "—"}</td>
                          <td>
                            <ProgressBar
                              now={Math.min(pct, 100)}
                              variant={pctVariant(pct)}
                              label={`${pct}%`}
                              style={{ height: "14px" }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-muted small py-3 mb-0">
                Belum ada data indikator kinerja
              </p>
            )}
          </Card.Body>
        </Card>
      </Card.Body>
    </Card>
  );
}
