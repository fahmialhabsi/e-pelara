import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Alert, Badge, Button, Card, CardBody, Form, Spinner, Table } from "react-bootstrap";
import RenjaPlanningDashboardLayout from "./RenjaPlanningDashboardLayout";
import RenjaDokumenNavTabs from "../components/RenjaDokumenNavTabs";
import { compareRenjaVersions, getRenjaVersions } from "../services/renjaGovernanceApi";

const RenjaComparePage = () => {
  const { id } = useParams();
  const [versions, setVersions] = useState([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let ok = true;
    (async () => {
      setLoading(true);
      try {
        const rows = await getRenjaVersions(id);
        if (!ok) return;
        const list = Array.isArray(rows) ? rows : [];
        setVersions(list);
        if (list.length >= 2) {
          setFrom(String(list[1].version_number));
          setTo(String(list[0].version_number));
        }
      } catch (e) {
        if (ok) setErr(e?.response?.data?.message || e.message || "Gagal memuat versi.");
      } finally {
        if (ok) setLoading(false);
      }
    })();
    return () => {
      ok = false;
    };
  }, [id]);

  const runCompare = async () => {
    setBusy(true);
    setErr("");
    try {
      const data = await compareRenjaVersions(id, Number(from), Number(to));
      setResult(data);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Gagal compare.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <RenjaPlanningDashboardLayout>
      <Link to="/dashboard-renja" className="small">← Dashboard RENJA</Link>
      <h4 className="fw-bold text-success mt-2 mb-2">Compare Sebelum vs Sesudah</h4>
      <RenjaDokumenNavTabs id={id} />
      {loading ? (
        <Spinner animation="border" />
      ) : (
        <>
          {err && <Alert variant="warning">{err}</Alert>}
          <Card className="mb-3 shadow-sm">
            <CardBody>
              <div className="d-flex flex-wrap gap-2 align-items-center">
                <Form.Select size="sm" value={from} onChange={(e) => setFrom(e.target.value)} style={{ width: 220 }}>
                  <option value="">Dari versi...</option>
                  {versions.map((v) => (
                    <option key={`f-${v.id}`} value={v.version_number}>v{v.version_number}</option>
                  ))}
                </Form.Select>
                <Form.Select size="sm" value={to} onChange={(e) => setTo(e.target.value)} style={{ width: 220 }}>
                  <option value="">Ke versi...</option>
                  {versions.map((v) => (
                    <option key={`t-${v.id}`} value={v.version_number}>v{v.version_number}</option>
                  ))}
                </Form.Select>
                <Button size="sm" variant="success" disabled={busy || !from || !to} onClick={runCompare}>
                  {busy ? "Membandingkan..." : "Bandingkan Versi"}
                </Button>
              </div>
            </CardBody>
          </Card>

          {result && (
            <Card className="shadow-sm">
              <CardBody>
                <div className="small mb-2">
                  Summary: added <Badge bg="success">{result.summary?.added || 0}</Badge> · updated{" "}
                  <Badge bg="warning" text="dark">{result.summary?.updated || 0}</Badge> · removed{" "}
                  <Badge bg="danger">{result.summary?.removed || 0}</Badge> · unchanged{" "}
                  <Badge bg="secondary">{result.summary?.unchanged || 0}</Badge>
                </div>
                <Table striped bordered size="sm" responsive>
                  <thead>
                    <tr>
                      <th>Flag</th>
                      <th>Program</th>
                      <th>Kegiatan</th>
                      <th>Sub Kegiatan</th>
                      <th>Field berubah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(result.diffs || []).map((d, idx) => (
                      <tr key={idx}>
                        <td><Badge bg={d.change_flag === "updated" ? "warning" : d.change_flag === "added" ? "success" : d.change_flag === "removed" ? "danger" : "secondary"}>{d.change_flag}</Badge></td>
                        <td>{d.after?.program || d.before?.program || "-"}</td>
                        <td>{d.after?.kegiatan || d.before?.kegiatan || "-"}</td>
                        <td>{d.after?.sub_kegiatan || d.before?.sub_kegiatan || "-"}</td>
                        <td>{(d.fields || []).map((f) => f.field).join(", ") || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </CardBody>
            </Card>
          )}
        </>
      )}
    </RenjaPlanningDashboardLayout>
  );
};

export default RenjaComparePage;
