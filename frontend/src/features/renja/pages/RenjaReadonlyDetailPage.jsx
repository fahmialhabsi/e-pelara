import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Badge, Card, CardBody, Spinner, Table } from "react-bootstrap";
import RenjaPlanningDashboardLayout from "./RenjaPlanningDashboardLayout";
import RenjaDokumenNavTabs from "../components/RenjaDokumenNavTabs";
import { fetchRenjaDokumenById } from "../services/planningRenjaApi";
import { getRenjaSections, getRenjaItemsByDokumen } from "../services/renjaGovernanceApi";

const RenjaReadonlyDetailPage = () => {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [sections, setSections] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ok = true;
    (async () => {
      setLoading(true);
      const [d, s, i] = await Promise.all([
        fetchRenjaDokumenById(id),
        getRenjaSections(id),
        getRenjaItemsByDokumen(id),
      ]);
      if (!ok) return;
      setDoc(d);
      setSections(Array.isArray(s) ? s : []);
      setItems(Array.isArray(i) ? i : []);
      setLoading(false);
    })();
    return () => {
      ok = false;
    };
  }, [id]);

  return (
    <RenjaPlanningDashboardLayout>
      <Link to="/dashboard-renja" className="small">← Dashboard RENJA</Link>
      <h4 className="fw-bold text-success mt-2 mb-2">Detail Dokumen Final (Readonly)</h4>
      <RenjaDokumenNavTabs id={id} />
      {loading ? (
        <Spinner animation="border" />
      ) : (
        <>
          <Card className="mb-3 shadow-sm">
            <CardBody>
              <div className="small">
                Dokumen #{doc?.id} · {doc?.judul} ·{" "}
                <Badge bg={doc?.workflow_status === "published" ? "success" : "secondary"}>
                  {doc?.workflow_status}
                </Badge>
              </div>
            </CardBody>
          </Card>
          <Card className="mb-3 shadow-sm">
            <CardBody>
              <h6 className="fw-bold">BAB I-V</h6>
              {(sections || []).map((s) => (
                <div key={s.id} className="mb-3">
                  <div className="fw-semibold">{s.section_title}</div>
                  <div className="small text-muted border rounded p-2 bg-light">
                    {s.content || "(kosong)"}
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
          <Card className="shadow-sm">
            <CardBody>
              <h6 className="fw-bold">Lampiran Tabel Program/Kegiatan/Sub Kegiatan</h6>
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
                  </tr>
                </thead>
                <tbody>
                  {!items.length ? (
                    <tr>
                      <td colSpan={7} className="text-muted">Belum ada item.</td>
                    </tr>
                  ) : items.map((r, i) => (
                    <tr key={r.id}>
                      <td>{i + 1}</td>
                      <td>{r.program}</td>
                      <td>{r.kegiatan}</td>
                      <td>{r.sub_kegiatan}</td>
                      <td>{r.indikator}</td>
                      <td>{r.target_numerik ?? r.target_teks ?? r.target}</td>
                      <td>{r.pagu_indikatif ?? r.pagu}</td>
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

export default RenjaReadonlyDetailPage;
