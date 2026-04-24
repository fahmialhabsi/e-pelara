import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Alert, Badge, Button, Card, CardBody, Form, Spinner } from "react-bootstrap";
import RenjaPlanningDashboardLayout from "./RenjaPlanningDashboardLayout";
import RenjaDokumenNavTabs from "../components/RenjaDokumenNavTabs";
import {
  getDropdownKegiatan,
  getDropdownPrograms,
  getDropdownSubKegiatan,
  getDropdownSasaran,
} from "../services/renjaGovernanceApi";
import { fetchRenjaDokumenById } from "../services/planningRenjaApi";

const RenjaSinkronisasiPage = () => {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [kegiatan, setKegiatan] = useState([]);
  const [subkegiatan, setSubkegiatan] = useState([]);
  const [sasaran, setSasaran] = useState([]);
  const [programId, setProgramId] = useState("");
  const [kegiatanId, setKegiatanId] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let ok = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const d = await fetchRenjaDokumenById(id);
        if (!ok) return;
        setDoc(d);
        const [sRows, pRows] = await Promise.all([
          getDropdownSasaran({ renstra_pd_dokumen_id: d.renstra_pd_dokumen_id }),
          getDropdownPrograms({ renstra_pd_dokumen_id: d.renstra_pd_dokumen_id }),
        ]);
        if (!ok) return;
        setSasaran(Array.isArray(sRows) ? sRows : []);
        setPrograms(Array.isArray(pRows) ? pRows : []);
      } catch (e) {
        if (ok) setErr(e?.response?.data?.message || e.message || "Gagal memuat sinkronisasi.");
      } finally {
        if (ok) setLoading(false);
      }
    })();
    return () => {
      ok = false;
    };
  }, [id]);

  useEffect(() => {
    if (!programId) return;
    (async () => {
      const rows = await getDropdownKegiatan({ program_id: programId });
      setKegiatan(Array.isArray(rows) ? rows : []);
      setKegiatanId("");
      setSubkegiatan([]);
    })();
  }, [programId]);

  useEffect(() => {
    if (!kegiatanId) return;
    (async () => {
      const rows = await getDropdownSubKegiatan({ kegiatan_id: kegiatanId });
      setSubkegiatan(Array.isArray(rows) ? rows : []);
    })();
  }, [kegiatanId]);

  return (
    <RenjaPlanningDashboardLayout>
      <Link to="/dashboard-renja" className="small">← Dashboard RENJA</Link>
      <h4 className="fw-bold text-success mt-2 mb-2">Sinkronisasi RENSTRA/RKPD</h4>
      <RenjaDokumenNavTabs id={id} />
      {loading ? (
        <Spinner animation="border" />
      ) : (
        <Card className="shadow-sm">
          <CardBody>
            {err && <Alert variant="warning">{err}</Alert>}
            <div className="small text-muted mb-2">
              Dokumen #{doc?.id} · Tahun {doc?.tahun} · OPD {doc?.perangkat_daerah_id}
            </div>
            <div className="row g-2">
              <div className="col-md-6">
                <Form.Label>Sasaran RENSTRA</Form.Label>
                <Form.Select>
                  <option value="">Pilih sasaran...</option>
                  {sasaran.map((x) => (
                    <option key={x.id} value={x.id}>{x.kode_sasaran} - {x.nama_sasaran}</option>
                  ))}
                </Form.Select>
              </div>
              <div className="col-md-6">
                <Form.Label>Program RENSTRA</Form.Label>
                <Form.Select value={programId} onChange={(e) => setProgramId(e.target.value)}>
                  <option value="">Pilih program...</option>
                  {programs.map((x) => (
                    <option key={x.id} value={x.id}>{x.kode_program} - {x.nama_program}</option>
                  ))}
                </Form.Select>
              </div>
              <div className="col-md-6">
                <Form.Label>Kegiatan</Form.Label>
                <Form.Select value={kegiatanId} onChange={(e) => setKegiatanId(e.target.value)}>
                  <option value="">Pilih kegiatan...</option>
                  {kegiatan.map((x) => (
                    <option key={x.id} value={x.id}>{x.kode_kegiatan} - {x.nama_kegiatan}</option>
                  ))}
                </Form.Select>
              </div>
              <div className="col-md-6">
                <Form.Label>Sub Kegiatan</Form.Label>
                <Form.Select>
                  <option value="">Pilih sub kegiatan...</option>
                  {subkegiatan.map((x) => (
                    <option key={x.id} value={x.id}>{x.kode_sub_kegiatan} - {x.nama_sub_kegiatan}</option>
                  ))}
                </Form.Select>
              </div>
            </div>
            <div className="mt-3 d-flex flex-wrap gap-2">
              <Badge bg="light" text="dark">Sumber: RENSTRA</Badge>
              <Badge bg="light" text="dark">Sumber: RKPD</Badge>
              <Badge bg="warning" text="dark">IRISAN</Badge>
              <Badge bg="secondary">MANUAL</Badge>
            </div>
            <div className="mt-3 d-flex gap-2">
              <Button variant="success" size="sm" as={Link} to={`/dashboard-renja/v2/dokumen/${id}/rencana-kerja`}>
                Lanjut Kelola Item
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </RenjaPlanningDashboardLayout>
  );
};

export default RenjaSinkronisasiPage;
