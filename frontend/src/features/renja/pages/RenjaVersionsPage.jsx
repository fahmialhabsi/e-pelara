import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Alert, Badge, Button, Card, CardBody, Form, Spinner, Table } from "react-bootstrap";
import RenjaPlanningDashboardLayout from "./RenjaPlanningDashboardLayout";
import RenjaDokumenNavTabs from "../components/RenjaDokumenNavTabs";
import { fetchRenjaDokumenById } from "../services/planningRenjaApi";
import { createRenjaRevision, getRenjaVersions } from "../services/renjaGovernanceApi";

const RenjaVersionsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);
  const [versions, setVersions] = useState([]);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const [d, v] = await Promise.all([fetchRenjaDokumenById(id), getRenjaVersions(id)]);
      setDoc(d);
      setVersions(Array.isArray(v) ? v : []);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Gagal memuat versi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const createRevisionFlow = async () => {
    if (!reason.trim()) {
      setErr("Alasan perubahan wajib diisi.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const row = await createRenjaRevision(id, {
        revision_type: "perubahan",
        change_reason: reason.trim(),
        change_reason_text: reason.trim(),
      });
      navigate(`/dashboard-renja/v2/dokumen/${row.id}`);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Gagal membuat revision.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <RenjaPlanningDashboardLayout>
      <Link to="/dashboard-renja" className="small">← Dashboard RENJA</Link>
      <h4 className="fw-bold text-success mt-2 mb-2">Riwayat Versi</h4>
      <RenjaDokumenNavTabs id={id} />
      {loading ? (
        <Spinner animation="border" />
      ) : (
        <>
          {err && <Alert variant="warning">{err}</Alert>}
          <Card className="mb-3 shadow-sm">
            <CardBody>
              <div className="small mb-2">
                Dokumen #{doc?.id} · status <Badge bg="secondary">{doc?.workflow_status}</Badge> · jenis{" "}
                <Badge bg="light" text="dark">{doc?.document_kind}</Badge>
              </div>
              <Form.Control
                className="mb-2"
                placeholder="Alasan membuat RENJA perubahan"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <Button
                size="sm"
                variant="warning"
                disabled={busy || !["approved", "published"].includes(doc?.workflow_status)}
                onClick={createRevisionFlow}
              >
                {busy ? "Membuat..." : "Create Revision (RENJA Perubahan)"}
              </Button>
            </CardBody>
          </Card>
          <Card className="shadow-sm">
            <CardBody>
              <Table striped bordered size="sm" responsive>
                <thead>
                  <tr>
                    <th>Version</th>
                    <th>Label</th>
                    <th>Status</th>
                    <th>Type</th>
                    <th>Published</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {!versions.length ? (
                    <tr>
                      <td colSpan={6} className="text-muted">Belum ada versi.</td>
                    </tr>
                  ) : versions.map((v) => (
                    <tr key={v.id}>
                      <td>{v.version_number}</td>
                      <td>{v.version_label || `v${v.version_number}`}</td>
                      <td>{v.status}</td>
                      <td>{v.change_type}</td>
                      <td>{v.is_published ? "Ya" : "Tidak"}</td>
                      <td>{v.created_at || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </CardBody>
          </Card>
        </>
      )}
    </RenjaPlanningDashboardLayout>
  );
};

export default RenjaVersionsPage;
