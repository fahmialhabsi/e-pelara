import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Alert, Button, Card, CardBody, Form, Spinner } from "react-bootstrap";
import RenjaPlanningDashboardLayout from "./RenjaPlanningDashboardLayout";
import RenjaDokumenNavTabs from "../components/RenjaDokumenNavTabs";
import { fetchRenjaDokumenById } from "../services/planningRenjaApi";
import { getRenjaSections, updateRenjaSection } from "../services/renjaGovernanceApi";

const keyByRoute = {
  pendahuluan: "pendahuluan",
  evaluasi: "evaluasi",
  "tujuan-sasaran": "tujuan_sasaran",
  "rencana-kerja": "rencana_kerja",
  penutup: "penutup",
};

const RenjaSectionEditorPage = () => {
  const { id, section } = useParams();
  const [doc, setDoc] = useState(null);
  const [rows, setRows] = useState([]);
  const [content, setContent] = useState("");
  const [completionPct, setCompletionPct] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const sectionKey = keyByRoute[section] || "pendahuluan";
  const activeRow = useMemo(
    () => rows.find((x) => x.section_key === sectionKey),
    [rows, sectionKey],
  );

  useEffect(() => {
    let ok = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const [d, s] = await Promise.all([fetchRenjaDokumenById(id), getRenjaSections(id)]);
        if (!ok) return;
        setDoc(d);
        setRows(Array.isArray(s) ? s : []);
      } catch (e) {
        if (ok) setErr(e?.response?.data?.message || e.message || "Gagal memuat halaman.");
      } finally {
        if (ok) setLoading(false);
      }
    })();
    return () => {
      ok = false;
    };
  }, [id]);

  useEffect(() => {
    if (!activeRow) return;
    setContent(activeRow.content || "");
    setCompletionPct(Number(activeRow.completion_pct || 0));
  }, [activeRow]);

  const readOnly = doc?.workflow_status === "published";

  const save = async () => {
    setSaving(true);
    setErr("");
    try {
      await updateRenjaSection(id, sectionKey, {
        content,
        completion_pct: Number(completionPct) || 0,
        change_reason_text: `Update bagian ${sectionKey}`,
      });
      const refreshed = await getRenjaSections(id);
      setRows(Array.isArray(refreshed) ? refreshed : []);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <RenjaPlanningDashboardLayout>
      <Link to="/dashboard-renja" className="small">← Dashboard RENJA</Link>
      <h4 className="fw-bold text-success mt-2 mb-2">Input Narasi BAB</h4>
      <RenjaDokumenNavTabs id={id} />
      {loading ? (
        <Spinner animation="border" />
      ) : (
        <Card className="shadow-sm">
          <CardBody>
            <div className="small text-muted mb-2">
              Dokumen #{doc?.id} · {doc?.judul} · status: <b>{doc?.workflow_status}</b>
            </div>
            {err && <Alert variant="warning">{err}</Alert>}
            <Form.Group className="mb-2">
              <Form.Label>Bagian</Form.Label>
              <Form.Control disabled value={activeRow?.section_title || sectionKey} />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Isi narasi</Form.Label>
              <Form.Control
                as="textarea"
                rows={12}
                disabled={readOnly}
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Progress kelengkapan (%)</Form.Label>
              <Form.Control
                type="number"
                min={0}
                max={100}
                disabled={readOnly}
                value={completionPct}
                onChange={(e) => setCompletionPct(e.target.value)}
              />
            </Form.Group>
            <div className="d-flex gap-2">
              <Button variant="secondary" as={Link} to={`/dashboard-renja/v2/dokumen/${id}`}>
                Kembali
              </Button>
              <Button variant="success" disabled={readOnly || saving} onClick={save}>
                {saving ? "Menyimpan..." : "Simpan Draft"}
              </Button>
              <Button
                variant="outline-success"
                as={Link}
                to={`/dashboard-renja/v2/dokumen/${id}/rencana-kerja`}
              >
                Simpan & Lanjut
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </RenjaPlanningDashboardLayout>
  );
};

export default RenjaSectionEditorPage;
