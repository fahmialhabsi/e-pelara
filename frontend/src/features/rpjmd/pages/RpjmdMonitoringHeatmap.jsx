import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Breadcrumb, Card, Container, Spinner, Table } from "react-bootstrap";
import { Link } from "react-router-dom";
import api from "../../../services/api";
import { usePeriodeAktif } from "../hooks/usePeriodeAktif";
import { useAuth } from "../../../hooks/useAuth";
import { hasPlanFeature, PLAN_FEATURE_KEYS } from "../../../utils/planFeatures";
import UpgradeProHint from "../../../shared/components/UpgradeProHint";

function unwrap(res) {
  const p = res?.data;
  if (p && p.success === true) return p.data;
  return p;
}

function cellStyle(key) {
  if (key === "hijau") return { background: "#d1e7dd", color: "#0f5132" };
  if (key === "kuning") return { background: "#fff3cd", color: "#664d03" };
  if (key === "merah") return { background: "#f8d7da", color: "#842029" };
  return { background: "#e9ecef", color: "#6c757d" };
}

function cellLabel(key) {
  if (key === "hijau") return "H";
  if (key === "kuning") return "K";
  if (key === "merah") return "M";
  return "—";
}

export default function RpjmdMonitoringHeatmap() {
  const { user } = useAuth();
  const canHeatmap = hasPlanFeature(user, PLAN_FEATURE_KEYS.heatmap);
  const { periode_id, periodeList } = usePeriodeAktif();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [payload, setPayload] = useState(null);

  const periodeLabel = useMemo(() => {
    const p = (periodeList || []).find((x) => String(x.id) === String(periode_id));
    if (p?.tahun_awal != null && p?.tahun_akhir != null) return `${p.tahun_awal} – ${p.tahun_akhir}`;
    return periode_id ? `#${periode_id}` : "—";
  }, [periodeList, periode_id]);

  const load = useCallback(async () => {
    if (!canHeatmap) {
      setErr("");
      setLoading(false);
      setPayload(null);
      return;
    }
    if (!periode_id) {
      setErr("Periode RPJMD belum dipilih.");
      setLoading(false);
      setPayload(null);
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const res = await api.get(`/rpjmd-monitoring/heatmap/${periode_id}`);
      setPayload(unwrap(res));
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Gagal memuat heatmap.");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [periode_id, canHeatmap]);

  useEffect(() => {
    load();
  }, [load]);

  const cols = payload?.columns || [];

  return (
    <Container fluid className="py-3">
      <Breadcrumb>
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: "/dashboard-rpjmd" }}>
          Dashboard RPJMD
        </Breadcrumb.Item>
        <Breadcrumb.Item active>Heatmap indikator</Breadcrumb.Item>
      </Breadcrumb>

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h4 className="mb-0">Heatmap capaian per tahun</h4>
          <small className="text-muted">
            Periode {periodeLabel} — sel per tahun: hijau ≥100%, kuning 80–99%, merah di bawah 80%, abu tanpa data valid
          </small>
        </div>
        <Link className="btn btn-outline-secondary btn-sm" to="/dashboard-rpjmd/monitoring-opd">
          Dashboard OPD &amp; alert
        </Link>
      </div>

      {!canHeatmap ? <UpgradeProHint /> : null}

      {canHeatmap ? (
        <Alert variant="light" className="border small py-2 mb-3">
          <strong>Keterangan:</strong> H = hijau, K = kuning, M = merah, — = N/A. Angka dalam sel adalah rasio cap/target
          (%).
        </Alert>
      ) : null}

      {!canHeatmap ? null : loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : err ? (
        <Alert variant="danger">{err}</Alert>
      ) : (
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-0 table-responsive">
            <Table bordered size="sm" className="mb-0 text-center align-middle" style={{ minWidth: 720 }}>
              <thead className="table-light">
                <tr>
                  <th className="text-start bg-light" style={{ minWidth: 200 }}>
                    Kode
                  </th>
                  <th className="text-start" style={{ minWidth: 240 }}>
                    Indikator
                  </th>
                  {cols.map((c) => (
                    <th key={c.tahun}>{c.label}</th>
                  ))}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {(payload?.rows || []).map((row) => (
                  <tr key={row.id}>
                    <td className="text-start text-nowrap small fw-medium">{row.kode}</td>
                    <td className="text-start small">{row.nama}</td>
                    {(row.tahun || []).map((cell) => (
                      <td key={cell.tahun} style={cellStyle(cell.status_key)} title={`Th ${cell.tahun}: ${cell.ratio_pct ?? "N/A"}%`}>
                        <span className="fw-semibold">{cellLabel(cell.status_key)}</span>
                        {cell.ratio_pct != null ? (
                          <div className="small" style={{ opacity: 0.9 }}>
                            {cell.ratio_pct}%
                          </div>
                        ) : null}
                      </td>
                    ))}
                    <td className="small">
                      <span className="badge bg-secondary text-uppercase">{row.status_key}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
}
