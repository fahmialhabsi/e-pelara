import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { Alert, Badge, Button, Card, CardBody, Form, Spinner, Table } from "react-bootstrap";
import RenjaPlanningDashboardLayout from "./RenjaPlanningDashboardLayout";
import RenjaDokumenNavTabs from "../components/RenjaDokumenNavTabs";
import { fetchRenjaDokumenById } from "../services/planningRenjaApi";
import {
  createRenjaItemByDokumen,
  getRenjaItemsByDokumen,
  getRenjaMismatchValidation,
  syncRenjaFromRenstra,
  syncRenjaFromRkpd,
  validateRenjaItemDraft,
} from "../services/renjaGovernanceApi";
import { focusRenjaItemRow, parseTargetItemIdFromSearch } from "../utils/rowFocusUtils";

const empty = {
  program: "",
  kegiatan: "",
  sub_kegiatan: "",
  indikator: "",
  target_numerik: "",
  target_teks: "",
  satuan: "",
  pagu_indikatif: "",
  lokasi: "",
  kelompok_sasaran: "",
};

function groupMismatchByItem(rows = []) {
  const map = new Map();
  for (const row of rows) {
    const itemId = Number(row.related_item_id || row.renja_item_id || 0);
    if (!itemId) continue;
    if (!map.has(itemId)) map.set(itemId, []);
    map.get(itemId).push(row);
  }
  return map;
}

function getItemAlignment(issues = []) {
  if (!issues.length) return { label: "aligned", variant: "success" };
  if (issues.some((x) => x.is_blocking)) return { label: "blocking", variant: "danger" };
  if (issues.some((x) => x.severity === "warning")) return { label: "warning", variant: "warning", textDark: true };
  return { label: "info", variant: "secondary" };
}

const RenjaRencanaKerjaPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const [doc, setDoc] = useState(null);
  const [rows, setRows] = useState([]);
  const [mismatchRows, setMismatchRows] = useState([]);
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [itemValidation, setItemValidation] = useState([]);
  const [activeRowId, setActiveRowId] = useState(null);

  const mismatchByItem = useMemo(() => groupMismatchByItem(mismatchRows), [mismatchRows]);

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const [d, r, mm] = await Promise.all([
        fetchRenjaDokumenById(id),
        getRenjaItemsByDokumen(id),
        getRenjaMismatchValidation(id).catch(() => ({ results: [] })),
      ]);
      setDoc(d);
      setRows(Array.isArray(r) ? r : []);
      setMismatchRows(Array.isArray(mm?.results) ? mm.results : []);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Gagal memuat item.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    const targetId = parseTargetItemIdFromSearch(location.search);
    if (!targetId) return;
    setActiveRowId(targetId);
    setTimeout(() => {
      focusRenjaItemRow(targetId);
    }, 150);
  }, [location.search, rows.length]);

  const readOnly = doc?.workflow_status === "published";

  const doSync = async (source) => {
    setBusy(true);
    setErr("");
    try {
      if (source === "RENSTRA") await syncRenjaFromRenstra(id, { change_reason_text: "Sync RENSTRA" });
      if (source === "RKPD") await syncRenjaFromRkpd(id, { change_reason_text: "Sync RKPD" });
      await load();
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Gagal sinkronisasi.");
    } finally {
      setBusy(false);
    }
  };

  const addItem = async () => {
    setBusy(true);
    setErr("");
    try {
      const validation = await validateRenjaItemDraft(id, {
        ...form,
        target_numerik: form.target_numerik === "" ? null : Number(form.target_numerik),
        pagu_indikatif: form.pagu_indikatif === "" ? null : Number(form.pagu_indikatif),
        source_mode: "MANUAL",
      });
      const blocking = (validation?.results || []).filter((x) => x.is_blocking);
      setItemValidation(validation?.results || []);
      if (blocking.length) {
        setErr("Item tidak valid. Periksa error inline.");
        setBusy(false);
        return;
      }
      await createRenjaItemByDokumen(id, {
        ...form,
        target_numerik: form.target_numerik === "" ? null : Number(form.target_numerik),
        pagu_indikatif: form.pagu_indikatif === "" ? null : Number(form.pagu_indikatif),
        source_mode: "MANUAL",
        change_reason_text: "Input manual rencana kerja",
      });
      setForm(empty);
      await load();
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Gagal menambah item.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <RenjaPlanningDashboardLayout>
      <Link to="/dashboard-renja" className="small">← Dashboard RENJA</Link>
      <h4 className="fw-bold text-success mt-2 mb-2">BAB IV Rencana Kerja dan Pendanaan</h4>
      <RenjaDokumenNavTabs id={id} />
      {loading ? (
        <Spinner animation="border" />
      ) : (
        <>
          {err && <Alert variant="warning">{err}</Alert>}
          <Card className="mb-3 shadow-sm">
            <CardBody>
              <div className="d-flex flex-wrap gap-2">
                <Button size="sm" variant="outline-success" disabled={busy || readOnly} onClick={() => doSync("RENSTRA")}>
                  Sinkronisasi dari RENSTRA
                </Button>
                <Button size="sm" variant="outline-primary" disabled={busy || readOnly} onClick={() => doSync("RKPD")}>
                  Sinkronisasi dari RKPD
                </Button>
                <Button size="sm" variant="secondary" as={Link} to={`/dashboard-renja/v2/dokumen/${id}/validasi`}>
                  Validasi Mismatch
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card className="mb-3 shadow-sm">
            <CardBody>
              <h6 className="fw-bold">Tambah Item Manual</h6>
              <div className="row g-2">
                {Object.keys(empty).map((k) => (
                  <div className="col-md-4" key={k}>
                    <Form.Control
                      placeholder={k}
                      disabled={readOnly}
                      value={form[k]}
                      onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              {!!itemValidation.length && (
                <div className="mt-2 small">
                  {itemValidation.map((v, idx) => (
                    <div key={idx} className={v.is_blocking ? "text-danger" : "text-warning"}>
                      {v.mismatch_code}: {v.message}
                    </div>
                  ))}
                </div>
              )}
              <Button className="mt-2" size="sm" disabled={busy || readOnly} onClick={addItem}>
                Simpan Draft
              </Button>
            </CardBody>
          </Card>

          <Card className="shadow-sm">
            <CardBody>
              <h6 className="fw-bold mb-2">Daftar Program/Kegiatan/Sub Kegiatan</h6>
              <Table striped bordered size="sm" responsive>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Program</th>
                    <th>Kegiatan</th>
                    <th>Sub Kegiatan</th>
                    <th>Indikator</th>
                    <th>Target</th>
                    <th>Pagu</th>
                    <th>Sumber</th>
                    <th>Strategi Sumber</th>
                    <th>Arah Kebijakan</th>
                    <th>Status Alignment</th>
                  </tr>
                </thead>
                <tbody>
                  {!rows.length ? (
                    <tr>
                      <td colSpan={11} className="text-muted">Belum ada item.</td>
                    </tr>
                  ) : rows.map((r, i) => {
                    const issues = mismatchByItem.get(Number(r.id)) || [];
                    const firstTrace = issues.find((x) => x.expected_source_trace)?.expected_source_trace || {};
                    const alignment = getItemAlignment(issues);
                    return (
                      <tr
                        key={r.id}
                        id={`item-${r.id}`}
                        className={Number(activeRowId) === Number(r.id) ? "table-warning" : ""}
                      >
                        <td>{i + 1}</td>
                        <td>{r.program}</td>
                        <td>{r.kegiatan}</td>
                        <td>{r.sub_kegiatan}</td>
                        <td>{r.indikator}</td>
                        <td>{r.target_numerik ?? r.target_teks ?? r.target}</td>
                        <td>{r.pagu_indikatif ?? r.pagu}</td>
                        <td><Badge bg="light" text="dark">{r.source_mode || "MANUAL"}</Badge></td>
                        <td className="small">{firstTrace.strategi || "-"}</td>
                        <td className="small">{firstTrace.arah_kebijakan || "-"}</td>
                        <td>
                          <Badge bg={alignment.variant} text={alignment.textDark ? "dark" : "light"}>
                            {alignment.label}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </CardBody>
          </Card>
        </>
      )}
    </RenjaPlanningDashboardLayout>
  );
};

export default RenjaRencanaKerjaPage;

