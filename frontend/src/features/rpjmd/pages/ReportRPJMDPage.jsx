// src/components/ReportRPJMDPage.js
import React, { useState, useEffect, useMemo } from "react";
import {
  Form,
  Button,
  Spinner,
  Accordion,
  Card,
  Table,
  Container,
  Row,
  Col,
  Alert,
} from "react-bootstrap";
import api from "../../../services/api";
import { extractSingleData, normalizeListItems } from "@/utils/apiResponse";

const ReportRPJMDPage = () => {
  const [opds, setOpds] = useState([]);
  const [opdId, setOpdId] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  // Fetch OPD list once
  useEffect(() => {
    const fetchOpds = async () => {
      try {
        const res = await api.get("/opd-penanggung-jawab");
        setOpds(normalizeListItems(res.data));
      } catch (err) {
        console.error(err);
        setError("Gagal memuat daftar OPD. Coba muat ulang.");
      }
    };
    fetchOpds();
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError(null);
    setReport(null);
    setLoading(true);
    try {
      const res = await api.get(`/laporan/rpjmd?opdId=${opdId}&tahun=${year}`);
      const payload = extractSingleData(res.data);
      if (!payload || !payload.programs) {
        setError("Data laporan tidak tersedia untuk OPD/tahun yang dipilih.");
      } else {
        setReport(payload);
      }
    } catch (err) {
      console.error(err);
      setError("Gagal menghasilkan laporan. Silakan coba lagi.");
    }
    setLoading(false);
  };

  // Download helpers
  const downloadFile = (endpoint, filename) => async () => {
    try {
      const response = await api.get(endpoint, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      setError(`Gagal men-download ${filename}.`);
    }
  };

  const downloadJSON = downloadFile(
    `/laporan/rpjmd?opdId=${opdId}&tahun=${year}`,
    `laporan_rpjmd_${opdId}_${year}.json`
  );
  const downloadPDF = downloadFile(
    `/laporan/rpjmd/pdf?opdId=${opdId}&tahun=${year}`,
    `laporan_rpjmd_${opdId}_${year}.pdf`
  );
  const downloadExcel = downloadFile(
    `/laporan/rpjmd/excel?opdId=${opdId}&tahun=${year}`,
    `laporan_rpjmd_${opdId}_${year}.xlsx`
  );

  // Memoize rendering of report
  const reportView = useMemo(() => {
    if (!report) return null;
    return (
      <>
        <h4>VISI</h4>
        <p>{report.visi}</p>

        <h4>MISI</h4>
        <Accordion flush>
          {report.misi.map((m, idx) => (
            <Card key={m.id}>
              <Accordion.Toggle as={Card.Header} eventKey={`${idx}`}>
                {m.isi_misi}
              </Accordion.Toggle>
              <Accordion.Collapse eventKey={`${idx}`}>
                <Card.Body>
                  {m.tujuan.map((t) => (
                    <div key={t.id} className="mb-2">
                      <strong>Tujuan:</strong> {t.isi_tujuan}
                      <ul>
                        {t.sasaran.map((s) => (
                          <li key={s.id}>{s.isi_sasaran}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </Card.Body>
              </Accordion.Collapse>
            </Card>
          ))}
        </Accordion>

        <h4 className="mt-4">PROGRAMS</h4>
        <Accordion defaultActiveKey="0">
          {report.programs.map((prg, pidx) => (
            <Card key={prg.id}>
              <Accordion.Toggle as={Card.Header} eventKey={`prg${pidx}`}>
                {prg.kode_program} - {prg.nama_program}
              </Accordion.Toggle>
              <Accordion.Collapse eventKey={`prg${pidx}`}>
                <Card.Body>
                  {prg.kegiatan.map((keg) => (
                    <div key={keg.id} className="mb-4">
                      <h5>
                        {keg.kode_kegiatan} - {keg.nama_kegiatan}
                      </h5>
                      {keg.sub_kegiatan.map((sub) => (
                        <div key={sub.id} className="mb-3">
                          <h6>
                            {sub.kode_sub} - {sub.nama_sub_kegiatan}
                          </h6>
                          <div className="table-responsive">
                            <Table striped bordered size="sm">
                              <thead>
                                <tr>
                                  <th>Indikator</th>
                                  <th>Baseline</th>
                                  <th>Target</th>
                                  <th>Realisasi Terbaru</th>
                                  <th>% Pencapaian</th>
                                  <th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sub.indikator.map((ind) => (
                                  <tr key={ind.id}>
                                    <td>{ind.nama_indikator}</td>
                                    <td>{ind.baseline}</td>
                                    <td>{ind.target}</td>
                                    <td>{ind.realisasi_terbaru}</td>
                                    <td>{ind.pencapaian}%</td>
                                    <td>{ind.evaluasi?.status || "-"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </Table>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </Card.Body>
              </Accordion.Collapse>
            </Card>
          ))}
        </Accordion>
      </>
    );
  }, [report]);

  return (
    <Container className="mt-4">
      <h2>Laporan RPJMD</h2>
      {error && <Alert variant="danger">{error}</Alert>}
      <Form onSubmit={handleGenerate} className="mb-4">
        <Row>
          <Col md={5}>
            <Form.Group controlId="formOpd">
              <Form.Label>OPD</Form.Label>
              <Form.Control
                as="select"
                value={opdId}
                onChange={(e) => setOpdId(e.target.value)}
                isInvalid={!!error}
                required
              >
                <option value="">-- Pilih OPD --</option>
                {opds.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nama_opd || o.nama || "-"}
                  </option>
                ))}
              </Form.Control>
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group controlId="formYear">
              <Form.Label>Tahun</Form.Label>
              <Form.Control
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                required
              />
            </Form.Group>
          </Col>
          <Col md={4} className="d-flex align-items-end">
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? <Spinner animation="border" size="sm" /> : "Generate"}
            </Button>
            <Button
              variant="info"
              className="ml-2"
              onClick={downloadJSON}
              disabled={!report}
            >
              JSON
            </Button>
            <Button
              variant="secondary"
              className="ml-2"
              onClick={downloadPDF}
              disabled={!report}
            >
              PDF
            </Button>
            <Button
              variant="success"
              className="ml-2"
              onClick={downloadExcel}
              disabled={!report}
            >
              Excel
            </Button>
          </Col>
        </Row>
      </Form>

      {loading && (
        <div className="text-center">
          <Spinner animation="border" /> Loading data...
        </div>
      )}

      {!loading && report && reportView}

      {!loading && !report && !error && (
        <Alert variant="info">Pilih OPD dan tahun, lalu klik "Generate".</Alert>
      )}
    </Container>
  );
};

export default ReportRPJMDPage;
