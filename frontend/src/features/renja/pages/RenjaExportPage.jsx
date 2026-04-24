import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardBody, Spinner, Table } from "react-bootstrap";
import RenjaPlanningDashboardLayout from "./RenjaPlanningDashboardLayout";
import RenjaDokumenNavTabs from "../components/RenjaDokumenNavTabs";
import { getRenjaExportViewModel } from "../services/renjaGovernanceApi";

const RenjaExportPage = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ok = true;
    (async () => {
      setLoading(true);
      try {
        const row = await getRenjaExportViewModel(id);
        if (ok) setData(row);
      } finally {
        if (ok) setLoading(false);
      }
    })();
    return () => {
      ok = false;
    };
  }, [id]);

  return (
    <RenjaPlanningDashboardLayout>
      <Link to="/dashboard-renja" className="small">← Dashboard RENJA</Link>
      <h4 className="fw-bold text-success mt-2 mb-2">Export / Print Preview Structure</h4>
      <RenjaDokumenNavTabs id={id} />
      {loading ? (
        <Spinner animation="border" />
      ) : (
        <Card className="shadow-sm">
          <CardBody>
            <h6 className="fw-bold">Cover / Identitas</h6>
            <pre className="bg-light p-2 border rounded small">{JSON.stringify(data?.cover || {}, null, 2)}</pre>
            <h6 className="fw-bold mt-3">Daftar BAB</h6>
            <Table striped bordered size="sm" responsive>
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Judul</th>
                  <th>Kelengkapan</th>
                </tr>
              </thead>
              <tbody>
                {(data?.chapters || []).map((s) => (
                  <tr key={s.id}>
                    <td>{s.section_key}</td>
                    <td>{s.section_title}</td>
                    <td>{s.completion_pct}%</td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <h6 className="fw-bold mt-3">Lampiran Item</h6>
            <div className="small text-muted">Total item: {(data?.lampiran_items || []).length}</div>
          </CardBody>
        </Card>
      )}
    </RenjaPlanningDashboardLayout>
  );
};

export default RenjaExportPage;
