/**
 * LakipGeneratorPanel.jsx
 * Panel generator LAKIP/LKj — filter tahun/periode → Preview HTML + Export PDF
 */
import React, { useState, useEffect } from "react";
import { Card, Form, Button, Row, Col, Alert, Spinner, Badge, ProgressBar, ButtonGroup } from "react-bootstrap";
import { FileEarmarkText, Eye, Download, FileEarmarkWord, FileEarmarkPdf, ArrowRepeat } from "react-bootstrap-icons";
import api from "../../../services/api";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => String(CURRENT_YEAR - i));

export default function LakipGeneratorPanel() {
  const [tahun, setTahun]           = useState(String(CURRENT_YEAR));
  const [periodeId, setPeriodeId]   = useState("1");
  const [periodeList, setPeriodeList] = useState([]);
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading]        = useState(false);
  const [error, setError]            = useState(null);

  // Load daftar periode
  useEffect(() => {
    api.get("/periode-rpjmd")
      .then((r) => setPeriodeList(r.data || []))
      .catch(() => setPeriodeList([]));
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/lakip-generator/data", {
        params: { tahun, periode_id: periodeId },
      });
      setPreviewData(res.data?.data || res.data);
    } catch (e) {
      setError(e.response?.data?.message || "Gagal memuat data LAKIP");
    } finally {
      setLoading(false);
    }
  };

  const openPreview = () => {
    const url = `${api.defaults.baseURL}/lakip-generator/preview?tahun=${tahun}&periode_id=${periodeId}`;
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    // Buka di tab baru dengan token di header — pakai form POST trick
    const form = document.createElement("form");
    form.method  = "GET";
    form.action  = url;
    form.target  = "_blank";
    document.body.appendChild(form);
    // Tambahkan token via query jika backend mendukung (fallback)
    const input = document.createElement("input");
    input.type  = "hidden";
    input.name  = "token";
    input.value = token || "";
    form.appendChild(input);
    form.submit();
    document.body.removeChild(form);
  };

  const getToken = () =>
    localStorage.getItem("token") || sessionStorage.getItem("token") || "";

  const openPreviewDirect = () => {
    const previewUrl = `/api/lakip-generator/preview?tahun=${tahun}&periode_id=${periodeId}&_token=${encodeURIComponent(getToken())}`;
    window.open(previewUrl, "_blank", "noopener");
  };

  const [downloading, setDownloading] = useState({ pdf: false, docx: false });

  const downloadFile = async (type) => {
    setDownloading((d) => ({ ...d, [type]: true }));
    try {
      const endpoint = `/lakip-generator/export/${type}`;
      const res = await api.get(endpoint, {
        params: { tahun, periode_id: periodeId },
        responseType: "blob",
        timeout: 60000,
      });
      const ext  = type === "pdf" ? "pdf" : "docx";
      const mime = type === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      const blob = new Blob([res.data], { type: mime });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `LAKIP_${tahun}_DinasKetahananPangan.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(`Gagal download ${type.toUpperCase()}: ${e.message}`);
    } finally {
      setDownloading((d) => ({ ...d, [type]: false }));
    }
  };

  // Status capaian color
  const pctVariant = (pct) =>
    pct >= 100 ? "success" : pct >= 75 ? "warning" : "danger";

  return (
    <Card className="shadow-sm border-0">
      <Card.Header className="bg-primary text-white d-flex align-items-center gap-2 py-3">
        <FileEarmarkText size={20} />
        <span className="fw-bold">Generator LAKIP / LKj</span>
        <Badge bg="light" text="primary" className="ms-auto">
          Laporan Akuntabilitas Kinerja
        </Badge>
      </Card.Header>

      <Card.Body>
        {/* ── Filter ── */}
        <Row className="g-3 mb-3 align-items-end">
          <Col md={3}>
            <Form.Label className="small fw-semibold">Tahun Laporan</Form.Label>
            <Form.Select
              size="sm"
              value={tahun}
              onChange={(e) => setTahun(e.target.value)}
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </Form.Select>
          </Col>

          <Col md={4}>
            <Form.Label className="small fw-semibold">Periode RPJMD</Form.Label>
            <Form.Select
              size="sm"
              value={periodeId}
              onChange={(e) => setPeriodeId(e.target.value)}
            >
              {periodeList.length > 0
                ? periodeList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama} ({p.tahun_awal}–{p.tahun_akhir})
                    </option>
                  ))
                : <option value="1">Periode Default</option>
              }
            </Form.Select>
          </Col>

          <Col md="auto">
            <Button
              variant="primary"
              size="sm"
              onClick={loadData}
              disabled={loading}
            >
              {loading ? (
                <><Spinner size="sm" animation="border" className="me-1" />Memuat...</>
              ) : (
                <><ArrowRepeat size={14} className="me-1" />Load Data</>
              )}
            </Button>
          </Col>

          <Col md="auto">
            <Button
              variant="success"
              size="sm"
              onClick={openPreviewDirect}
            >
              <Eye size={14} className="me-1" />Preview LAKIP
            </Button>
          </Col>
        </Row>

        {error && (
          <Alert variant="danger" className="py-2 small">{error}</Alert>
        )}

        {/* ── Data Summary ── */}
        {previewData && (
          <div className="mt-2">
            {/* KPI Row */}
            <Row className="g-2 mb-3">
              <Col md={3}>
                <div className="text-center p-3 border rounded bg-primary bg-opacity-10">
                  <div className="fs-4 fw-bold text-primary">{previewData.indikator?.length ?? 0}</div>
                  <div className="small text-muted">Indikator</div>
                </div>
              </Col>
              <Col md={3}>
                <div className="text-center p-3 border rounded bg-success bg-opacity-10">
                  <div className="fs-4 fw-bold text-success">
                    {previewData.indikator?.filter((i) => i.pct_capaian >= 100).length ?? 0}
                  </div>
                  <div className="small text-muted">Tercapai</div>
                </div>
              </Col>
              <Col md={3}>
                <div className="text-center p-3 border rounded bg-warning bg-opacity-10">
                  <div className="fs-4 fw-bold text-warning">
                    {previewData.indikator?.filter((i) => i.pct_capaian >= 75 && i.pct_capaian < 100).length ?? 0}
                  </div>
                  <div className="small text-muted">Hampir Tercapai</div>
                </div>
              </Col>
              <Col md={3}>
                <div className="text-center p-3 border rounded bg-danger bg-opacity-10">
                  <div className="fs-4 fw-bold text-danger">
                    {previewData.indikator?.filter((i) => i.pct_capaian < 75).length ?? 0}
                  </div>
                  <div className="small text-muted">Perlu Perhatian</div>
                </div>
              </Col>
            </Row>

            {/* Anggaran */}
            {previewData.anggaran?.total_pagu > 0 && (
              <div className="mb-3 p-3 border rounded bg-light">
                <div className="small fw-semibold mb-1">
                  Realisasi Anggaran: {previewData.anggaran.pct}%
                </div>
                <ProgressBar
                  now={Math.min(previewData.anggaran.pct, 100)}
                  variant={pctVariant(previewData.anggaran.pct)}
                  label={`${previewData.anggaran.pct}%`}
                  style={{ height: "18px" }}
                />
                <div className="d-flex justify-content-between mt-1 small text-muted">
                  <span>Pagu: Rp {Number(previewData.anggaran.total_pagu).toLocaleString("id-ID")}</span>
                  <span>Realisasi: Rp {Number(previewData.anggaran.total_realisasi).toLocaleString("id-ID")}</span>
                </div>
              </div>
            )}

            {/* Tabel Indikator mini */}
            {previewData.indikator?.length > 0 && (
              <div className="table-responsive">
                <table className="table table-sm table-bordered table-hover small">
                  <thead className="table-primary">
                    <tr>
                      <th>Indikator Kinerja</th>
                      <th className="text-center">Target</th>
                      <th className="text-center">Realisasi</th>
                      <th className="text-center">Capaian</th>
                      <th className="text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.indikator.map((ind) => (
                      <tr key={ind.id}>
                        <td>{ind.nama_indikator}</td>
                        <td className="text-center">{ind.target || "—"} {ind.satuan || ""}</td>
                        <td className="text-center">{ind.realisasi || "—"} {ind.satuan || ""}</td>
                        <td className="text-center">
                          <ProgressBar
                            now={Math.min(ind.pct_capaian || 0, 100)}
                            variant={pctVariant(ind.pct_capaian)}
                            label={`${ind.pct_capaian}%`}
                            style={{ height: "14px", minWidth: "80px" }}
                          />
                        </td>
                        <td className="text-center">
                          <Badge bg={pctVariant(ind.pct_capaian)} className="small">
                            {ind.status_capaian}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {previewData.indikator?.length === 0 && previewData.lakipEntries?.length === 0 && (
              <Alert variant="info" className="py-2 small">
                Belum ada data indikator atau entri LAKIP untuk tahun <strong>{tahun}</strong>.
                Silakan tambahkan data melalui menu LAKIP terlebih dahulu.
              </Alert>
            )}

            {/* Action buttons */}
            <div className="d-flex flex-wrap gap-2 mt-3">
              <Button variant="success" size="sm" onClick={openPreviewDirect}>
                <Eye size={14} className="me-1" />Preview (Print-Ready)
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => downloadFile("pdf")}
                disabled={downloading.pdf}
              >
                {downloading.pdf
                  ? <><Spinner size="sm" animation="border" className="me-1" />Generating PDF...</>
                  : <><FileEarmarkPdf size={14} className="me-1" />Download PDF</>}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => downloadFile("docx")}
                disabled={downloading.docx}
              >
                {downloading.docx
                  ? <><Spinner size="sm" animation="border" className="me-1" />Generating DOCX...</>
                  : <><FileEarmarkWord size={14} className="me-1" />Download Word</>}
              </Button>
            </div>
          </div>
        )}

        {!previewData && !loading && (
          <div>
            <Alert variant="light" className="text-center py-3 small border mb-3">
              Klik <strong>Load Data</strong> untuk melihat ringkasan kinerja, atau langsung
              gunakan tombol di bawah untuk menghasilkan dokumen.
            </Alert>
            <div className="d-flex flex-wrap gap-2 justify-content-center">
              <Button variant="success" size="sm" onClick={openPreviewDirect}>
                <Eye size={14} className="me-1" />Preview HTML
              </Button>
              <Button variant="danger" size="sm" onClick={() => downloadFile("pdf")} disabled={downloading.pdf}>
                {downloading.pdf
                  ? <><Spinner size="sm" animation="border" className="me-1" />Generating...</>
                  : <><FileEarmarkPdf size={14} className="me-1" />Download PDF</>}
              </Button>
              <Button variant="primary" size="sm" onClick={() => downloadFile("docx")} disabled={downloading.docx}>
                {downloading.docx
                  ? <><Spinner size="sm" animation="border" className="me-1" />Generating...</>
                  : <><FileEarmarkWord size={14} className="me-1" />Download Word (.docx)</>}
              </Button>
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
