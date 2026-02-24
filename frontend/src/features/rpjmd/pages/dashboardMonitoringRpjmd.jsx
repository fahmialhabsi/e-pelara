import React, { useEffect, useState } from "react";
import api from "../../../services/api";
import { Tabs, Tab, Spinner, Alert } from "react-bootstrap";
import { useAuth } from "../../../hooks/useAuth";

const DashboardMonitoringRpjmd = () => {
  const { user } = useAuth();
  const [data, setData] = useState({
    perencanaan: { items: [], loading: false, error: null },
    pelaksanaan: { items: [], loading: false, error: null },
    evaluasi: { items: [], loading: false, error: null },
  });

  // util untuk fetch tiap endpoint
  const fetchSection = async (section) => {
    setData((d) => ({
      ...d,
      [section]: { ...d[section], loading: true, error: null },
    }));

    try {
      const res = await api.get(`/dashboard-rpjmd/${section}`);
      // cek struktur data
      if (res.data && Array.isArray(res.data.data)) {
        setData((d) => ({
          ...d,
          [section]: { items: res.data.data, loading: false, error: null },
        }));
      } else {
        throw new Error("Format response tidak seperti yang diharapkan");
      }
    } catch (err) {
      console.error(
        `Gagal ambil ${section}:`,
        err.response?.data || err.message
      );
      setData((d) => ({
        ...d,
        [section]: {
          ...d[section],
          loading: false,
          error: err.response?.data?.message || err.message,
        },
      }));
    }
  };

  useEffect(() => {
    ["perencanaan", "pelaksanaan", "evaluasi"].forEach(fetchSection);
  }, []);

  const renderPerencanaan = () => {
    const { items, loading, error } = data.perencanaan;
    if (loading) return <Spinner animation="border" />;
    if (error) return <Alert variant="danger">Error: {error}</Alert>;
    return items.map((misi, i) => (
      <div key={i} className="mb-4">
        <h5>Misi: {misi.nama}</h5>
        {misi.Tujuans?.map((tujuan, j) => (
          <div key={j}>
            <strong>Tujuan:</strong> {tujuan.nama}
            {tujuan.Sasarans?.map((sasaran, k) => (
              <div key={k} className="ms-3">
                <strong>Sasaran:</strong> {sasaran.nama}
                {sasaran.Programs?.map((program, l) => (
                  <div key={l} className="ms-4">
                    <strong>Program:</strong> {program.nama}
                    {program.Kegiatans?.map((kegiatan, m) => (
                      <div key={m} className="ms-5">
                        – {kegiatan.nama}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    ));
  };

  const renderPelaksanaan = () => {
    const { items, loading, error } = data.pelaksanaan;
    if (loading) return <Spinner animation="border" />;
    if (error) return <Alert variant="danger">Error: {error}</Alert>;
    return items.map((kegiatan, i) => (
      <div key={i}>
        <h5>Kegiatan: {kegiatan.nama}</h5>
        {kegiatan.Realisasis?.map((r, j) => (
          <div key={j}>
            Realisasi: {r.nilai} – {r.tahun}
          </div>
        ))}
      </div>
    ));
  };

  const renderEvaluasi = () => {
    const { items, loading, error } = data.evaluasi;
    if (loading) return <Spinner animation="border" />;
    if (error) return <Alert variant="danger">Error: {error}</Alert>;
    return items.map((kegiatan, i) => (
      <div key={i}>
        <h5>Kegiatan: {kegiatan.nama}</h5>
        {kegiatan.Realisasis?.map((r, j) => (
          <div key={j}>
            Realisasi: {r.nilai} – {r.tahun}
          </div>
        ))}
      </div>
    ));
  };

  const allowedRoles = ["SUPER_ADMIN", "ADMINISTRATOR"];

  if (!allowedRoles.includes(user?.role)) {
    return (
      <Container className="p-5 d-flex justify-content-center align-items-center">
        <Alert variant="danger" className="text-center w-100 fw-bold fs-5">
          ❌ Anda tidak memiliki akses ke Monitoring RPJMD.
        </Alert>
      </Container>
    );
  }

  return (
    <div className="container mt-4 text-white">
      <h2>Dashboard Monitoring RPJMD</h2>
      <Tabs defaultActiveKey="perencanaan" className="mb-3">
        <Tab eventKey="perencanaan" title="Perencanaan">
          {renderPerencanaan()}
        </Tab>
        <Tab eventKey="pelaksanaan" title="Pelaksanaan">
          {renderPelaksanaan()}
        </Tab>
        <Tab eventKey="evaluasi" title="Evaluasi">
          {renderEvaluasi()}
        </Tab>
      </Tabs>
    </div>
  );
};

export default DashboardMonitoringRpjmd;
