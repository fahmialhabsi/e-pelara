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
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";

function unwrap(res) {
  const p = res?.data;
  if (p && p.success === true) return p.data;
  return p;
}

const PLAN_ORDER = ["free", "pro", "enterprise"];

const FEATURE_ROWS = [
  { key: "heatmap", label: "Heatmap monitoring RPJMD" },
  { key: "early_warning", label: "Peringatan dini (alert)" },
  { key: "export", label: "Ekspor Excel / PDF monitoring" },
  { key: "monitoring_opd", label: "Monitoring capaian per OPD" },
  { key: "dedicated_support", label: "Dukungan prioritas", enterpriseOnly: true },
  { key: "custom_sla", label: "SLA kustom", enterpriseOnly: true },
];

function cellForPlan(feat, row) {
  if (row.enterpriseOnly && feat?.code !== "enterprise") return "—";
  const v = feat?.[row.key];
  if (v === true) return "✓";
  if (v === false) return "—";
  return v != null ? String(v) : "—";
}

export default function PricingPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const currentCode = String(user?.plan_code || "").toLowerCase() || null;

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await api.get("/plans/catalog");
      const data = unwrap(res);
      const list = Array.isArray(data) ? data : [];
      list.sort(
        (a, b) =>
          PLAN_ORDER.indexOf(String(a.code || "").toLowerCase()) -
            PLAN_ORDER.indexOf(String(b.code || "").toLowerCase()) || a.id - b.id,
      );
      setPlans(list);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Gagal memuat paket.");
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visibleRows = useMemo(() => {
    const codes = new Set(plans.map((p) => String(p.code || "").toLowerCase()));
    const hasEnt = codes.has("enterprise");
    return FEATURE_ROWS.filter((r) => !r.enterpriseOnly || hasEnt);
  }, [plans]);

  return (
    <Container fluid className="py-4">
      <Breadcrumb className="mb-3">
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: "/" }}>
          Beranda
        </Breadcrumb.Item>
        <Breadcrumb.Item active>Paket &amp; harga</Breadcrumb.Item>
      </Breadcrumb>

      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h3 className="mb-1">Paket langganan</h3>
          <p className="text-muted mb-0">
            Pilih paket sesuai kebutuhan monitoring dan pelaporan. Hubungi admin untuk aktivasi paket
            berbayar.
          </p>
        </div>
        {currentCode ? (
          <div className="text-md-end">
            <span className="text-muted small d-block">Paket tenant Anda saat ini</span>
            <Badge bg="primary" className="fs-6 text-uppercase">
              {currentCode}
            </Badge>
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : err ? (
        <Alert variant="danger">{err}</Alert>
      ) : (
        <>
          <Row className="g-3 mb-4">
            {plans.map((p) => {
              const code = String(p.code || "").toLowerCase();
              const isCurrent = currentCode && code === currentCode;
              return (
                <Col md={4} key={p.id || code}>
                  <Card className={`h-100 shadow-sm border ${isCurrent ? "border-primary border-2" : ""}`}>
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <Card.Title className="h5 mb-0 text-capitalize">{p.nama || code}</Card.Title>
                        {isCurrent ? <Badge bg="success">Paket aktif</Badge> : null}
                      </div>
                      <p className="text-muted small">{p.deskripsi || "—"}</p>
                      <code className="small text-secondary">{code}</code>
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
          </Row>

          <Card className="shadow-sm">
            <Card.Header className="bg-white fw-semibold">Perbandingan fitur</Card.Header>
            <Card.Body className="p-0">
              <Table responsive hover className="mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Fitur</th>
                    {plans.map((p) => (
                      <th key={p.id} className="text-center text-capitalize">
                        {p.nama || p.code}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <tr key={row.key}>
                      <td>{row.label}</td>
                      {plans.map((p) => {
                        const f = p.features && typeof p.features === "object" ? p.features : {};
                        return (
                          <td key={p.id} className="text-center">
                            {cellForPlan({ ...f, code: p.code }, row)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>

          <Alert variant="light" className="border mt-3 mb-0">
            Untuk mengubah paket tenant, hubungi <strong>SUPER_ADMIN</strong> atau buka{" "}
            <Button variant="link" className="p-0 align-baseline" as={Link} to="/admin/subscriptions">
              manajemen langganan
            </Button>
            .
          </Alert>
        </>
      )}
    </Container>
  );
}
