import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Alert, Badge, Button, Card, CardBody, Form, Spinner, Table } from "react-bootstrap";
import RenjaPlanningDashboardLayout from "./RenjaPlanningDashboardLayout";
import RenjaDokumenNavTabs from "../components/RenjaDokumenNavTabs";
import { fetchRenjaDokumenById } from "../services/planningRenjaApi";
import {
  createRenjaItemByDokumen,
  getRenjaItemsByDokumen,
  syncRenjaFromRenstra,
  syncRenjaFromRkpd,
} from "../services/renjaGovernanceApi";

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

const RenjaRencanaKerjaPage = () => {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const [d, r] = await Promise.all([fetchRenjaDokumenById(id), getRenjaItemsByDokumen(id)]);
      setDoc(d);
      setRows(Array.isArray(r) ? r : []);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Gagal memuat item.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

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
                    <th>Mismatch</th>
                  </tr>
                </thead>
                <tbody>
                  {!rows.length ? (
                    <tr>
                      <td colSpan={9} className="text-muted">Belum ada item.</td>
                    </tr>
                  ) : rows.map((r, i) => (
                    <tr key={r.id}>
                      <td>{i + 1}</td>
                      <td>{r.program}</td>
                      <td>{r.kegiatan}</td>
                      <td>{r.sub_kegiatan}</td>
                      <td>{r.indikator}</td>
                      <td>{r.target_numerik ?? r.target_teks ?? r.target}</td>
                      <td>{r.pagu_indikatif ?? r.pagu}</td>
                      <td><Badge bg="light" text="dark">{r.source_mode || "MANUAL"}</Badge></td>
                      <td>
                        <Badge bg={r.mismatch_status && r.mismatch_status !== "matched" ? "warning" : "success"}>
                          {r.mismatch_status || "matched"}
                        </Badge>
                      </td>
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

export default RenjaRencanaKerjaPage;
