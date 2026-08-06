/**
 * LakipGeneratorPanel.jsx
 * Panel generator LAKIP/LKj — filter tahun/periode → Preview HTML + Export PDF
 */
import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Button,
  Row,
  Col,
  Alert,
  Spinner,
  Badge,
  ProgressBar,
  ButtonGroup,
} from 'react-bootstrap';
import {
  FileEarmarkText,
  Eye,
  Download,
  FileEarmarkWord,
  FileEarmarkPdf,
  ArrowRepeat,
} from 'react-bootstrap-icons';
import api from '../../../services/api';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => String(CURRENT_YEAR - i));

export default function LakipGeneratorPanel() {
  const [tahun, setTahun] = useState(String(CURRENT_YEAR));
  const [periodeId, setPeriodeId] = useState('1');
  const [periodeList, setPeriodeList] = useState([]);
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  // Load daftar periode
  useEffect(() => {
    api
      .get('/periode-rpjmd')
      .then((r) => setPeriodeList(r.data || []))
      .catch(() => setPeriodeList([]));
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/lakip-generator/data', {
        params: { tahun, periode_id: periodeId },
      });
      setPreviewData(res.data?.data || res.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Gagal memuat data LAKIP');
    } finally {
      setLoading(false);
    }
  };

  const syncFromRenstra = async () => {
    setSyncing(true);
    setSyncResult(null);
    setError(null);
    try {
      const res = await api.post(`/lakip/sync-renstra/${tahun}`);
      setSyncResult(res.data);
      await loadData();
    } catch (e) {
      setError(e.response?.data?.error || 'Gagal sinkron dari Renstra');
    } finally {
      setSyncing(false);
    }
  };

  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token') || '';

  const openPreviewDirect = () => {
    const previewUrl = `/api/lakip-generator/preview?tahun=${tahun}&periode_id=${periodeId}&_token=${encodeURIComponent(getToken())}`;
    window.open(previewUrl, '_blank', 'noopener');
  };

  const [downloading, setDownloading] = useState({ pdf: false, docx: false, 'pdf-final': false });

  // Fase 19: 'pdf-final' = pipeline nomor halaman Daftar Isi (jauh lebih
  // lambat, ~12 render Puppeteer vs 2 — timeout dilonggarkan khusus utk ini).
  const EXPORT_ENDPOINT = { pdf: 'pdf', docx: 'docx', 'pdf-final': 'pdf-final' };
  const EXPORT_TIMEOUT_MS = { pdf: 60000, docx: 60000, 'pdf-final': 180000 };

  const downloadFile = async (type) => {
    setDownloading((d) => ({ ...d, [type]: true }));
    try {
      const endpoint = `/lakip-generator/export/${EXPORT_ENDPOINT[type]}`;
      const res = await api.get(endpoint, {
        params: { tahun, periode_id: periodeId },
        responseType: 'blob',
        timeout: EXPORT_TIMEOUT_MS[type] || 60000,
      });
      const ext = type === 'docx' ? 'docx' : 'pdf';
      const mime =
        ext === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      // Fase 19: ambil nama file ASLI dari Content-Disposition backend (yang
      // sudah dinamis mengikuti nama OPD sejak Fase 17), bukan hardcode nama
      // OPD di sini lagi — hardcode client-side sebelumnya diam-diam
      // MENIMPA fix backend Fase 17 karena `a.download` selalu menang atas
      // header server saat file diunduh lewat blob URL.
      const disposition = res.headers?.['content-disposition'] || '';
      const match = disposition.match(/filename="?([^";]+)"?/i);
      const filename = match ? match[1] : `LAKIP_${tahun}.${ext}`;
      const blob = new Blob([res.data], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
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

  // Status capaian color (progress bar tetap 3 warna bawaan Bootstrap, cukup
  // utk indikasi cepat; badge Status pakai 5 warna kustom di bawah karena
  // Bootstrap cuma py 2 varian "buruk" — warning & danger — sedangkan status
  // 5 tingkat butuh 3 gradasi di sisi bawah (Sedang/Kurang/Tidak Tercapai).
  const pctVariant = (pct) => (pct >= 100 ? 'success' : pct >= 75 ? 'warning' : 'danger');

  // Warna badge 5 tingkat status LAKIP — teks putih, jadi latar dipakai versi
  // solid/lebih pekat (bukan pastel) supaya kontras tetap terbaca.
  const STATUS5_COLOR = {
    'Tercapai': { background: '#16a34a', color: '#ffffff' },
    'Hampir Tercapai': { background: '#2563eb', color: '#ffffff' },
    'Sedang Tercapai': { background: '#ca8a04', color: '#ffffff' },
    'Kurang Tercapai': { background: '#ea580c', color: '#ffffff' },
    'Tidak Tercapai': { background: '#dc2626', color: '#ffffff' },
  };
  const status5Style = (status) => STATUS5_COLOR[status] || { background: '#6b7280', color: '#ffffff' };

  // Tabel mini indikator — dipakai berulang di tiap level (Sasaran/Program/Kegiatan)
  const renderIndikatorMiniTable = (items) => (
    <div className="table-responsive mb-2">
      <table className="table table-sm table-bordered table-hover small mb-0">
        <thead className="table-light">
          <tr>
            <th>Indikator Kinerja</th>
            <th className="text-center" style={{ width: 90 }}>
              Target
            </th>
            <th className="text-center" style={{ width: 90 }}>
              Realisasi
            </th>
            <th className="text-center" style={{ width: 110 }}>
              Capaian
            </th>
            <th className="text-center" style={{ width: 120 }}>
              Status
            </th>
            <th style={{ minWidth: 260 }}>Analisa</th>
          </tr>
        </thead>
        <tbody>
          {items.map((ind) => (
            <tr key={ind.id}>
              <td>{ind.nama_indikator}</td>
              <td className="text-center">
                {ind.target || '—'} {ind.satuan || ''}
              </td>
              <td className="text-center">
                {ind.realisasi || '—'} {ind.satuan || ''}
              </td>
              <td className="text-center">
                <ProgressBar
                  now={Math.min(ind.pct_capaian || 0, 100)}
                  variant={pctVariant(ind.pct_capaian)}
                  label={`${ind.pct_capaian}%`}
                  style={{ height: '14px', minWidth: '80px' }}
                />
              </td>
              <td className="text-center">
                <Badge as="span" style={status5Style(ind.status_capaian_5)} className="small">
                  {ind.status_capaian_5 || ind.status_capaian}
                </Badge>
              </td>
              <td className="text-muted" style={{ fontSize: '0.8rem', lineHeight: 1.35 }}>
                {ind.analisa || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

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
            <Form.Select size="sm" value={tahun} onChange={(e) => setTahun(e.target.value)}>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Form.Select>
          </Col>

          <Col md={4}>
            <Form.Label className="small fw-semibold">Periode RPJMD</Form.Label>
            <Form.Select size="sm" value={periodeId} onChange={(e) => setPeriodeId(e.target.value)}>
              {periodeList.length > 0 ? (
                periodeList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama} ({p.tahun_awal}–{p.tahun_akhir})
                  </option>
                ))
              ) : (
                <option value="1">Periode Default</option>
              )}
            </Form.Select>
          </Col>

          <Col md="auto">
            <Button variant="primary" size="sm" onClick={loadData} disabled={loading}>
              {loading ? (
                <>
                  <Spinner size="sm" animation="border" className="me-1" />
                  Memuat...
                </>
              ) : (
                <>
                  <ArrowRepeat size={14} className="me-1" />
                  Load Data
                </>
              )}
            </Button>
          </Col>

          <Col md="auto">
            <Button
              variant="outline-primary"
              size="sm"
              onClick={syncFromRenstra}
              disabled={syncing}
            >
              {syncing ? (
                <>
                  <Spinner size="sm" animation="border" className="me-1" />
                  Sinkron...
                </>
              ) : (
                <>
                  <ArrowRepeat size={14} className="me-1" />
                  Sinkron BAB II dari Renstra
                </>
              )}
            </Button>
          </Col>

          <Col md="auto">
            <Button variant="success" size="sm" onClick={openPreviewDirect}>
              <Eye size={14} className="me-1" />
              Preview LAKIP
            </Button>
          </Col>
        </Row>

        {error && (
          <Alert variant="danger" className="py-2 small">
            {error}
          </Alert>
        )}

        {syncResult && (
          <Alert variant="success" className="py-2 small">
            Sinkron selesai: {syncResult.generate?.updated ?? 0} baris Program/Kegiatan/Indikator
            diperbarui dari Renstra ({syncResult.generate?.skipped ?? 0} dilewati), anggaran{' '}
            {syncResult.anggaran?.updated ?? 0} baris tersinkron.
          </Alert>
        )}

        {/* ── Data Summary ── */}
        {previewData && (
          <div className="mt-2">
            {/* KPI Row */}
            <Row className="g-2 mb-3">
              <Col md={3}>
                <div className="text-center p-3 border rounded bg-primary bg-opacity-10">
                  <div className="fs-4 fw-bold text-primary">
                    {previewData.indikator?.length ?? 0}
                  </div>
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
                    {previewData.indikator?.filter(
                      (i) => i.pct_capaian >= 75 && i.pct_capaian < 100,
                    ).length ?? 0}
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
                  style={{ height: '18px' }}
                />
                <div className="d-flex justify-content-between mt-1 small text-muted">
                  <span>
                    Pagu: Rp {Number(previewData.anggaran.total_pagu).toLocaleString('id-ID')}
                  </span>
                  <span>
                    Realisasi: Rp{' '}
                    {Number(previewData.anggaran.total_realisasi).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            )}

            {/* Indikator Kinerja Utama (IKU) & Indikator Kinerja Kunci (IKK) — indikator
                level OPD standalone, tidak masuk hierarki Tujuan->Sasaran->Program->Kegiatan */}
            {previewData.iku?.length > 0 && (
              <div className="mb-3 pb-2 border-bottom">
                <div className="fw-bold" style={{ color: '#1e3a8a' }}>
                  Indikator Kinerja Utama (IKU)
                </div>
                {renderIndikatorMiniTable(previewData.iku)}
              </div>
            )}
            {previewData.ikk?.length > 0 && (
              <div className="mb-3 pb-2 border-bottom">
                <div className="fw-bold" style={{ color: '#1e3a8a' }}>
                  Indikator Kinerja Kunci (IKK)
                </div>
                {renderIndikatorMiniTable(previewData.ikk)}
              </div>
            )}

            {/* Hierarki Indikator: Tujuan -> Sasaran -> Program -> Kegiatan */}
            {previewData.indikatorTree?.length > 0 && (
              <div className="mb-2">
                {previewData.indikatorTree.map((t) => (
                  <div key={t.id} className="mb-3 pb-2 border-bottom">
                    <div className="fw-bold" style={{ color: '#1e3a8a' }}>
                      Tujuan {t.no_tujuan}: {t.isi_tujuan}
                    </div>
                    {t.sasaran.map((s) => (
                      <div key={s.id} className="ms-3 mt-2">
                        <div className="fw-semibold" style={{ color: '#1d4ed8' }}>
                          Sasaran {s.nomor}: {s.isi_sasaran}
                        </div>
                        {s.indikator.length > 0 && renderIndikatorMiniTable(s.indikator)}
                        {s.program.map((p) => (
                          <div key={p.id} className="ms-3 mt-2">
                            <div className="fw-semibold small" style={{ color: '#2563eb' }}>
                              Program: {p.nama_program}
                            </div>
                            {p.indikator.length > 0 && renderIndikatorMiniTable(p.indikator)}
                            {p.kegiatan.map((k) => (
                              <div key={k.id} className="ms-3 mt-2">
                                <div className="fw-semibold small" style={{ color: '#2563eb' }}>
                                  Kegiatan: {k.nama_kegiatan}
                                </div>
                                {k.indikator.length > 0 && renderIndikatorMiniTable(k.indikator)}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {previewData.indikatorOrphan?.length > 0 && (
              <div className="mb-2">
                <div className="fw-bold text-danger">
                  Indikator Belum Terhubung ke Hierarki Renstra
                </div>
                {renderIndikatorMiniTable(previewData.indikatorOrphan)}
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
                <Eye size={14} className="me-1" />
                Preview (Print-Ready)
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => downloadFile('pdf')}
                disabled={downloading.pdf}
              >
                {downloading.pdf ? (
                  <>
                    <Spinner size="sm" animation="border" className="me-1" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <FileEarmarkPdf size={14} className="me-1" />
                    Download PDF
                  </>
                )}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => downloadFile('docx')}
                disabled={downloading.docx}
              >
                {downloading.docx ? (
                  <>
                    <Spinner size="sm" animation="border" className="me-1" />
                    Generating DOCX...
                  </>
                ) : (
                  <>
                    <FileEarmarkWord size={14} className="me-1" />
                    Download Word
                  </>
                )}
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => downloadFile('pdf-final')}
                disabled={downloading['pdf-final']}
                title="Nomor halaman Daftar Isi terisi otomatis — lebih lambat, pakai saat dokumen mau diterbitkan resmi"
              >
                {downloading['pdf-final'] ? (
                  <>
                    <Spinner size="sm" animation="border" className="me-1" />
                    Generating (~1-2 menit)...
                  </>
                ) : (
                  <>
                    <FileEarmarkPdf size={14} className="me-1" />
                    Export Final (dengan Nomor Halaman)
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {!previewData && !loading && (
          <div>
            <Alert variant="light" className="text-center py-3 small border mb-3">
              Klik <strong>Load Data</strong> untuk melihat ringkasan kinerja, atau langsung gunakan
              tombol di bawah untuk menghasilkan dokumen.
            </Alert>
            <div className="d-flex flex-wrap gap-2 justify-content-center">
              <Button variant="success" size="sm" onClick={openPreviewDirect}>
                <Eye size={14} className="me-1" />
                Preview HTML
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => downloadFile('pdf')}
                disabled={downloading.pdf}
              >
                {downloading.pdf ? (
                  <>
                    <Spinner size="sm" animation="border" className="me-1" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileEarmarkPdf size={14} className="me-1" />
                    Download PDF
                  </>
                )}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => downloadFile('docx')}
                disabled={downloading.docx}
              >
                {downloading.docx ? (
                  <>
                    <Spinner size="sm" animation="border" className="me-1" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileEarmarkWord size={14} className="me-1" />
                    Download Word (.docx)
                  </>
                )}
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => downloadFile('pdf-final')}
                disabled={downloading['pdf-final']}
                title="Nomor halaman Daftar Isi terisi otomatis — lebih lambat, pakai saat dokumen mau diterbitkan resmi"
              >
                {downloading['pdf-final'] ? (
                  <>
                    <Spinner size="sm" animation="border" className="me-1" />
                    Generating (~1-2 menit)...
                  </>
                ) : (
                  <>
                    <FileEarmarkPdf size={14} className="me-1" />
                    Export Final (dengan Nomor Halaman)
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
