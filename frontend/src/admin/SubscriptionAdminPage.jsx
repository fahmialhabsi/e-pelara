import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Breadcrumb,
  Button,
  Card,
  Container,
  Form,
  Spinner,
  Table,
} from "react-bootstrap";
import { Link } from "react-router-dom";
import api from "../services/api";

function unwrap(res) {
  const p = res?.data;
  if (p && p.success === true) return p.data;
  return p;
}

const PLAN_OPTIONS = [
  { value: "free", label: "FREE" },
  { value: "pro", label: "PRO" },
  { value: "enterprise", label: "ENTERPRISE" },
];

export default function SubscriptionAdminPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [draft, setDraft] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await api.get("/tenants/subscriptions-overview");
      const data = unwrap(res);
      const list = Array.isArray(data) ? data : [];
      setRows(list);
      const d = {};
      for (const r of list) {
        const c = r.active_subscription?.plan?.code;
        d[r.id] = c ? String(c).toLowerCase() : "free";
      }
      setDraft(d);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Gagal memuat data.");
      setRows([]);
      setDraft({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setPlanDraft = (tenantId, code) => {
    setDraft((prev) => ({ ...prev, [tenantId]: code }));
  };

  const apply = async (tenantId) => {
    const plan_code = draft[tenantId];
    if (!plan_code) return;
    setSavingId(tenantId);
    setErr("");
    try {
      await api.put(`/tenants/${tenantId}/subscription`, { plan_code });
      await load();
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Gagal menyimpan.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Container fluid className="py-4">
      <Breadcrumb className="mb-3">
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: "/" }}>
          Beranda
        </Breadcrumb.Item>
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: "/admin/tenants" }}>
          Tenant
        </Breadcrumb.Item>
        <Breadcrumb.Item active>Langganan</Breadcrumb.Item>
      </Breadcrumb>

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h4 className="mb-0">Manajemen langganan</h4>
          <small className="text-muted">SUPER_ADMIN — ubah paket aktif per tenant.</small>
        </div>
        <Button variant="outline-primary" size="sm" as={Link} to="/pricing">
          Lihat katalog paket
        </Button>
      </div>

      {err ? <Alert variant="danger">{err}</Alert> : null}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : (
        <Card className="shadow-sm border-0">
          <Card.Body className="p-0">
            <Table responsive hover className="mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th>ID</th>
                  <th>Tenant</th>
                  <th>Domain</th>
                  <th>Paket aktif</th>
                  <th>Ubah ke</th>
                  <th style={{ width: 120 }} />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const current = r.active_subscription?.plan?.code || "—";
                  const sel = draft[r.id] ?? String(current).toLowerCase();
                  const changed =
                    String(sel).toLowerCase() !== String(current).toLowerCase();
                  return (
                    <tr key={r.id}>
                      <td>{r.id}</td>
                      <td className="fw-medium">{r.nama}</td>
                      <td>
                        <code className="small">{r.domain}</code>
                      </td>
                      <td>
                        <span className="text-uppercase">{current}</span>
                      </td>
                      <td style={{ minWidth: 160 }}>
                        <Form.Select
                          size="sm"
                          value={sel}
                          onChange={(e) => setPlanDraft(r.id, e.target.value)}
                        >
                          {PLAN_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </Form.Select>
                      </td>
                      <td>
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={!changed || savingId === r.id}
                          onClick={() => apply(r.id)}
                        >
                          {savingId === r.id ? <Spinner animation="border" size="sm" /> : "Simpan"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
}
