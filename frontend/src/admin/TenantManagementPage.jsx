import React, { useCallback, useEffect, useState } from "react";
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
  Row,
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

function fmtDate(v) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString("id-ID");
  } catch {
    return String(v);
  }
}

export default function TenantManagementPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editRow, setEditRow] = useState(null);

  const [nama, setNama] = useState("");
  const [domain, setDomain] = useState("");
  const [tahunAwal, setTahunAwal] = useState(String(new Date().getFullYear()));
  const [tahunAkhir, setTahunAkhir] = useState(String(new Date().getFullYear() + 4));
  const [isActive, setIsActive] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await api.get("/tenants");
      const data = unwrap(res);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Gagal memuat tenant.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setNama("");
    setDomain("");
    setTahunAwal(String(new Date().getFullYear()));
    setTahunAkhir(String(new Date().getFullYear() + 4));
    setIsActive(true);
    setShowCreate(true);
  };

  const openEdit = (r) => {
    setEditRow(r);
    setNama(r.nama || "");
    setDomain(r.domain || "");
    setIsActive(r.is_active !== false);
    setShowEdit(true);
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErr("");
    try {
      await api.post("/tenants", {
        nama,
        domain,
        tahun_awal: parseInt(tahunAwal, 10),
        tahun_akhir: parseInt(tahunAkhir, 10),
        is_active: isActive,
      });
      setShowCreate(false);
      await load();
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Gagal membuat tenant.");
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editRow?.id) return;
    setSaving(true);
    setErr("");
    try {
      await api.put(`/tenants/${editRow.id}`, { nama, domain, is_active: isActive });
      setShowEdit(false);
      setEditRow(null);
      await load();
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Gagal memperbarui tenant.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container fluid className="py-3">
      <Breadcrumb>
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: "/" }}>
          Beranda
        </Breadcrumb.Item>
        <Breadcrumb.Item active>Tenant (SaaS)</Breadcrumb.Item>
      </Breadcrumb>

      <Row className="align-items-center mb-3">
        <Col>
          <h4 className="mb-0">Manajemen tenant</h4>
          <small className="text-muted">Hanya SUPER_ADMIN. Pembuatan tenant membuat periode RPJMD default.</small>
        </Col>
        <Col xs="auto" className="d-flex flex-wrap gap-2 justify-content-end">
          <Button variant="outline-secondary" size="sm" as={Link} to="/admin/subscriptions">
            Langganan tenant
          </Button>
          <Button variant="outline-secondary" size="sm" as={Link} to="/pricing">
            Paket & harga
          </Button>
          <Button variant="primary" size="sm" onClick={openCreate}>
            Tambah tenant
          </Button>
        </Col>
      </Row>

      {err ? <Alert variant="danger">{err}</Alert> : null}

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" />
            </div>
          ) : (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th>ID</th>
                  <th>Nama</th>
                  <th>Domain</th>
                  <th>Status</th>
                  <th>Dibuat</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Badge bg="secondary">{r.id}</Badge>
                    </td>
                    <td>{r.nama}</td>
                    <td>
                      <code>{r.domain}</code>
                    </td>
                    <td>
                      {r.is_active !== false ? (
                        <Badge bg="success">Aktif</Badge>
                      ) : (
                        <Badge bg="secondary">Nonaktif</Badge>
                      )}
                    </td>
                    <td className="small text-muted">{fmtDate(r.created_at)}</td>
                    <td className="text-end">
                      <Button variant="outline-secondary" size="sm" onClick={() => openEdit(r)}>
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <Modal show={showCreate} onHide={() => !saving && setShowCreate(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Tenant baru</Modal.Title>
        </Modal.Header>
        <Form onSubmit={submitCreate}>
          <Modal.Body>
            <Form.Group className="mb-2">
              <Form.Label>Nama</Form.Label>
              <Form.Control value={nama} onChange={(e) => setNama(e.target.value)} required />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Domain (unik)</Form.Label>
              <Form.Control
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="contoh: pemda-kab-x"
                required
              />
            </Form.Group>
            <Form.Check
              type="switch"
              id="create-active"
              className="mb-2"
              label="Tenant aktif"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <Row>
              <Col>
                <Form.Group className="mb-2">
                  <Form.Label>Tahun awal periode default</Form.Label>
                  <Form.Control
                    type="number"
                    value={tahunAwal}
                    onChange={(e) => setTahunAwal(e.target.value)}
                    required
                  />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group className="mb-2">
                  <Form.Label>Tahun akhir periode default</Form.Label>
                  <Form.Control
                    type="number"
                    value={tahunAkhir}
                    onChange={(e) => setTahunAkhir(e.target.value)}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" type="button" disabled={saving} onClick={() => setShowCreate(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Menyimpan…" : "Simpan"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={showEdit} onHide={() => !saving && setShowEdit(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit tenant #{editRow?.id}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={submitEdit}>
          <Modal.Body>
            <Form.Group className="mb-2">
              <Form.Label>Nama</Form.Label>
              <Form.Control value={nama} onChange={(e) => setNama(e.target.value)} required />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Domain</Form.Label>
              <Form.Control value={domain} onChange={(e) => setDomain(e.target.value)} required />
            </Form.Group>
            <Form.Check
              type="switch"
              id="edit-active"
              label="Tenant aktif"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" type="button" disabled={saving} onClick={() => setShowEdit(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Menyimpan…" : "Simpan"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}
