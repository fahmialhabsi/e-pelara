/**
 * LakipPkFormPage.jsx
 * Form Perjanjian Kinerja (PK) — Sasaran Teknis satu sumber dengan Renstra/BAB II,
 * Tata Kelola & Akuntabilitas (Serapan Anggaran/TL BPK live, IKM manual), Program & Anggaran.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Card,
  Form,
  Button,
  Row,
  Col,
  Alert,
  Spinner,
  Badge,
  Table,
  ProgressBar,
} from 'react-bootstrap';
import {
  FileEarmarkText,
  Save,
  Trash,
  PlusCircle,
  Eye,
  FileEarmarkPdf,
  FileEarmarkWord,
} from 'react-bootstrap-icons';
import api from '../../../services/api';
import {
  getPkDetail,
  savePk,
  saveIkm,
  getSasaranOptions,
  setIsIkuPk,
  getProgramAnggaranLive,
  getKegiatanOutputUntukSasaran,
} from '../services/lakipPkApi';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => String(CURRENT_YEAR - i));

const PASAL_FIELDS = [
  { key: 'pasal1_tujuan', label: 'Pasal 1 — Tujuan Perjanjian Kinerja' },
  { key: 'pasal3_evaluasi', label: 'Pasal 3 — Evaluasi Berkala' },
  { key: 'pasal4_konsekuensi', label: 'Pasal 4 — Konsekuensi Kinerja' },
  { key: 'pasal5_larangan', label: 'Pasal 5 — Larangan' },
  { key: 'pasal5_etika', label: 'Pasal 5 — Etika Kinerja' },
  { key: 'pasal6_penutup', label: 'Pasal 6 — Penutup' },
];

export default function LakipPkFormPage() {
  const [opdList, setOpdList] = useState([]);
  const [renstraId, setRenstraId] = useState('');
  const [tahun, setTahun] = useState(String(CURRENT_YEAR));

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [pk, setPk] = useState(null);
  const [sasaranOptions, setSasaranOptions] = useState([]);
  const [selectedMap, setSelectedMap] = useState({});
  const [programAnggaran, setProgramAnggaran] = useState([]);
  const [autoFillingProgram, setAutoFillingProgram] = useState(false);
  const [header, setHeader] = useState({
    pihak_pertama_nama: '',
    pihak_pertama_jabatan: '',
    tanggal_ttd: '',
    target_serapan_anggaran: '',
    target_tl_bpk: '',
    target_ikm: '',
  });
  const [pasal, setPasal] = useState({});
  const [ikm, setIkm] = useState({ skor: '', keterangan: '', sumber_survei: '' });
  const [kegiatanMap, setKegiatanMap] = useState({});

  const [downloading, setDownloading] = useState({ pdf: false, docx: false });

  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token') || '';

  const openPreviewDirect = () => {
    if (!renstraId || !tahun) return;
    const url = `/api/lakip-pk/export/preview?renstraId=${renstraId}&tahun=${tahun}&_token=${encodeURIComponent(getToken())}`;
    window.open(url, '_blank', 'noopener');
  };

  const downloadFile = async (type) => {
    setDownloading((d) => ({ ...d, [type]: true }));
    try {
      const res = await api.get(`/lakip-pk/export/${type}`, {
        params: { renstraId, tahun },
        responseType: 'blob',
        timeout: 60000,
      });
      const ext = type === 'pdf' ? 'pdf' : 'docx';
      const mime =
        type === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const blob = new Blob([res.data], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Perjanjian_Kinerja_${tahun}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(`Gagal download ${type.toUpperCase()}: ${e.message}`);
    } finally {
      setDownloading((d) => ({ ...d, [type]: false }));
    }
  };

  useEffect(() => {
    api
      .get('/renstra-opd')
      .then((res) => {
        const data = res.data?.data || res.data || [];
        const list = Array.isArray(data) ? data : [];
        setOpdList(list);
        if (list.length && !renstraId) setRenstraId(String(list[0].id));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAll = useCallback(() => {
    if (!renstraId || !tahun) return;
    setLoading(true);
    setError(null);
    Promise.all([getPkDetail(renstraId, tahun), getSasaranOptions(renstraId)])
      .then(([detail, options]) => {
        setPk(detail);
        setSasaranOptions(options);

        const map = {};
        options.forEach((opt) => {
          const existing = (detail.output_sasaran || []).find(
            (o) => String(o.indikator_renstra_id) === String(opt.indikator_renstra_id),
          );
          map[opt.indikator_renstra_id] = {
            checked: Boolean(opt.is_iku_pk),
            output: existing?.output || '',
            bukti_ukur: existing?.bukti_ukur || '',
          };
        });
        setSelectedMap(map);

        setProgramAnggaran(
          (detail.program_anggaran || []).map((p) => ({
            nama_program: p.nama_program,
            jumlah_anggaran: p.jumlah_anggaran,
          })),
        );

        setHeader({
          pihak_pertama_nama: detail.pihak_pertama_nama || 'Sherly Tjoanda Laos',
          pihak_pertama_jabatan: detail.pihak_pertama_jabatan || 'Gubernur Maluku Utara',
          tanggal_ttd: detail.tanggal_ttd || '',
          target_serapan_anggaran: detail.target_serapan_anggaran || '',
          target_tl_bpk: detail.target_tl_bpk || '',
          target_ikm: detail.target_ikm || '',
        });

        const pasalInit = {};
        PASAL_FIELDS.forEach((f) => {
          pasalInit[f.key] = detail[f.key] || '';
        });
        setPasal(pasalInit);

        setIkm({
          skor: detail.tata_kelola?.ikm?.skor ?? '',
          keterangan: detail.tata_kelola?.ikm?.keterangan || '',
          sumber_survei: detail.tata_kelola?.ikm?.sumber_survei || '',
        });
      })
      .catch((e) => setError(e.response?.data?.message || 'Gagal memuat data PK'))
      .finally(() => setLoading(false));
  }, [renstraId, tahun]);

  useEffect(() => {
    Promise.resolve().then(() => loadAll());
  }, [loadAll]);

  const toggleSasaran = (indikatorId, checked) => {
    setSelectedMap((prev) => ({
      ...prev,
      [indikatorId]: { ...prev[indikatorId], checked },
    }));
  };

  const updateSasaranText = (indikatorId, field, value) => {
    setSelectedMap((prev) => ({
      ...prev,
      [indikatorId]: { ...prev[indikatorId], [field]: value },
    }));
  };

  const loadKegiatanOptions = async (indikatorId, sasaranId) => {
    setKegiatanMap((prev) => ({
      ...prev,
      [indikatorId]: { ...(prev[indikatorId] || {}), loading: true },
    }));
    try {
      const items = await getKegiatanOutputUntukSasaran(renstraId, sasaranId, tahun);
      setKegiatanMap((prev) => ({ ...prev, [indikatorId]: { loading: false, items } }));
    } catch (e) {
      setKegiatanMap((prev) => ({ ...prev, [indikatorId]: { loading: false, items: [] } }));
      setError(e.response?.data?.message || 'Gagal mengambil data Kegiatan/Sub Kegiatan');
    }
  };

  const appendKegiatanToOutput = (indikatorId, kegiatanItem) => {
    setSelectedMap((prev) => {
      const current = prev[indikatorId]?.output || '';
      const line = kegiatanItem.nama_kegiatan;
      const already = current.split('\n').includes(line);
      const next = already
        ? current
        : current
          ? `${current}\n${line}`
          : line;
      return { ...prev, [indikatorId]: { ...prev[indikatorId], output: next } };
    });
  };

  const addProgramRow = () => {
    setProgramAnggaran((prev) => [...prev, { nama_program: '', jumlah_anggaran: '' }]);
  };

  const removeProgramRow = (idx) => {
    setProgramAnggaran((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateProgramRow = (idx, field, value) => {
    setProgramAnggaran((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)),
    );
  };

  const autoFillProgramAnggaran = async () => {
    setAutoFillingProgram(true);
    setError(null);
    try {
      const live = await getProgramAnggaranLive(renstraId, tahun);
      if (!live.length) {
        setError(`Belum ada data DPA aktif untuk tahun ${tahun}.`);
        return;
      }
      setProgramAnggaran(
        live.map((p) => ({
          nama_program: p.nama_program,
          jumlah_anggaran: p.pagu,
        })),
      );
      setSuccessMsg(
        `${live.length} program berhasil diambil dari DPA tahun ${tahun}. Silakan cek lalu klik Simpan.`,
      );
    } catch (e) {
      setError(e.response?.data?.message || 'Gagal mengambil data Program & Anggaran dari DPA');
    } finally {
      setAutoFillingProgram(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const toggleJobs = sasaranOptions
        .filter(
          (opt) =>
            Boolean(opt.is_iku_pk) !== Boolean(selectedMap[opt.indikator_renstra_id]?.checked),
        )
        .map((opt) =>
          setIsIkuPk(opt.indikator_renstra_id, selectedMap[opt.indikator_renstra_id]?.checked),
        );
      await Promise.all(toggleJobs);

      const outputSasaran = sasaranOptions
        .filter((opt) => selectedMap[opt.indikator_renstra_id]?.checked)
        .map((opt) => ({
          indikator_renstra_id: opt.indikator_renstra_id,
          output: selectedMap[opt.indikator_renstra_id]?.output || '',
          bukti_ukur: selectedMap[opt.indikator_renstra_id]?.bukti_ukur || '',
        }));

      await savePk(renstraId, tahun, {
        ...header,
        ...pasal,
        output_sasaran: outputSasaran,
        program_anggaran: programAnggaran.filter((p) => p.nama_program),
      });

      await saveIkm(renstraId, tahun, ikm);

      setSuccessMsg('Data Perjanjian Kinerja berhasil disimpan.');
      loadAll();
    } catch (e) {
      setError(e.response?.data?.message || 'Gagal menyimpan data PK');
    } finally {
      setSaving(false);
    }
  };

  const selectedSasaran = sasaranOptions.filter(
    (opt) => selectedMap[opt.indikator_renstra_id]?.checked,
  );

  return (
    <Container fluid className="py-4 px-3">
      <div className="d-flex align-items-center gap-2 mb-4">
        <FileEarmarkText size={28} className="text-primary" />
        <div>
          <h4 className="mb-0 fw-bold">Perjanjian Kinerja (PK)</h4>
          <p className="mb-0 small text-muted">
            Sasaran Teknis satu sumber dengan Renstra/BAB II LAKIP — Permenpan RB No. 53/2014
          </p>
        </div>
      </div>

      <Card className="shadow-sm border-0 mb-3">
        <Card.Body>
          <Row className="g-3 align-items-end">
            <Col md={4}>
              <Form.Label className="small fw-semibold">OPD (Renstra)</Form.Label>
              <Form.Select
                size="sm"
                value={renstraId}
                onChange={(e) => setRenstraId(e.target.value)}
              >
                {opdList.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nama_opd}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Label className="small fw-semibold">Tahun</Form.Label>
              <Form.Select size="sm" value={tahun} onChange={(e) => setTahun(e.target.value)}>
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md="auto">
              <Button variant="primary" size="sm" onClick={handleSave} disabled={saving || loading}>
                {saving ? (
                  <>
                    <Spinner size="sm" animation="border" className="me-1" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save size={14} className="me-1" />
                    Simpan
                  </>
                )}
              </Button>
            </Col>
            <Col md="auto">
              <Button variant="success" size="sm" onClick={openPreviewDirect}>
                <Eye size={14} className="me-1" />
                Preview
              </Button>
            </Col>
            <Col md="auto">
              <Button
                variant="danger"
                size="sm"
                onClick={() => downloadFile('pdf')}
                disabled={downloading.pdf}
              >
                {downloading.pdf ? (
                  <Spinner size="sm" animation="border" />
                ) : (
                  <>
                    <FileEarmarkPdf size={14} className="me-1" />
                    PDF
                  </>
                )}
              </Button>
            </Col>
            <Col md="auto">
              <Button
                variant="primary"
                size="sm"
                onClick={() => downloadFile('docx')}
                disabled={downloading.docx}
              >
                {downloading.docx ? (
                  <Spinner size="sm" animation="border" />
                ) : (
                  <>
                    <FileEarmarkWord size={14} className="me-1" />
                    Word
                  </>
                )}
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {error && (
        <Alert variant="danger" className="py-2 small">
          {error}
        </Alert>
      )}
      {successMsg && (
        <Alert variant="success" className="py-2 small">
          {successMsg}
        </Alert>
      )}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : (
        <>
          {/* Pihak Pertama & Tanggal */}
          <Card className="shadow-sm border-0 mb-3">
            <Card.Header className="bg-light fw-semibold py-2 small">Pihak & Tanggal</Card.Header>
            <Card.Body>
              <Row className="g-3">
                <Col md={4}>
                  <Form.Label className="small">Nama Pihak Pertama (Gubernur)</Form.Label>
                  <Form.Control
                    size="sm"
                    value={header.pihak_pertama_nama}
                    onChange={(e) =>
                      setHeader((h) => ({ ...h, pihak_pertama_nama: e.target.value }))
                    }
                  />
                </Col>
                <Col md={4}>
                  <Form.Label className="small">Jabatan Pihak Pertama</Form.Label>
                  <Form.Control
                    size="sm"
                    value={header.pihak_pertama_jabatan}
                    onChange={(e) =>
                      setHeader((h) => ({ ...h, pihak_pertama_jabatan: e.target.value }))
                    }
                  />
                </Col>
                <Col md={3}>
                  <Form.Label className="small">Tanggal Tanda Tangan</Form.Label>
                  <Form.Control
                    size="sm"
                    type="date"
                    value={header.tanggal_ttd || ''}
                    onChange={(e) => setHeader((h) => ({ ...h, tanggal_ttd: e.target.value }))}
                  />
                </Col>
              </Row>
              <div className="small text-muted mt-2">
                Pihak Kedua (Kepala Dinas) diambil otomatis dari menu Setting Pejabat Penandatangan
                tahun {tahun}.
              </div>
            </Card.Body>
          </Card>

          {/* Sasaran Teknis */}
          <Card className="shadow-sm border-0 mb-3">
            <Card.Header className="bg-light fw-semibold py-2 small d-flex justify-content-between align-items-center">
              <span>Sasaran Strategis Teknis (sumber: Renstra Sasaran)</span>
              <Badge bg="primary">{selectedSasaran.length} dipilih</Badge>
            </Card.Header>
            <Card.Body>
              {sasaranOptions.length === 0 && (
                <Alert variant="warning" className="py-2 small mb-0">
                  Belum ada indikator level Sasaran di Renstra OPD ini. Tambahkan dulu lewat menu
                  Renstra &gt; Sasaran.
                </Alert>
              )}
              {sasaranOptions.map((opt) => {
                const sel = selectedMap[opt.indikator_renstra_id] || {};
                return (
                  <div key={opt.indikator_renstra_id} className="border rounded p-2 mb-2">
                    <Form.Check
                      type="checkbox"
                      id={`chk-${opt.indikator_renstra_id}`}
                      checked={Boolean(sel.checked)}
                      onChange={(e) => toggleSasaran(opt.indikator_renstra_id, e.target.checked)}
                      label={
                        <span>
                          <strong>{opt.isi_sasaran}</strong> — {opt.nama_indikator} ({opt.satuan})
                        </span>
                      }
                    />
                    {sel.checked && (
                      <>
                        <Row className="g-2 mt-1 ps-4">
                          <Col md={6}>
                            <Form.Label className="small text-muted mb-0">Output</Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={2}
                              size="sm"
                              value={sel.output || ''}
                              onChange={(e) =>
                                updateSasaranText(
                                  opt.indikator_renstra_id,
                                  'output',
                                  e.target.value,
                                )
                              }
                            />
                          </Col>
                          <Col md={6}>
                            <Form.Label className="small text-muted mb-0">Bukti Ukur</Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={2}
                              size="sm"
                              value={sel.bukti_ukur || ''}
                              onChange={(e) =>
                                updateSasaranText(
                                  opt.indikator_renstra_id,
                                  'bukti_ukur',
                                  e.target.value,
                                )
                              }
                            />
                            {opt.sumber_data && (
                              <Button
                                variant="link"
                                size="sm"
                                className="p-0 small"
                                onClick={() =>
                                  updateSasaranText(
                                    opt.indikator_renstra_id,
                                    'bukti_ukur',
                                    sel.bukti_ukur
                                      ? `${sel.bukti_ukur}\n${opt.sumber_data}`
                                      : opt.sumber_data,
                                  )
                                }
                              >
                                Isi dari Sumber Data Indikator ({opt.sumber_data})
                              </Button>
                            )}
                          </Col>
                        </Row>
                        <div className="ps-4 mt-1">
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 small"
                            onClick={() =>
                              loadKegiatanOptions(opt.indikator_renstra_id, opt.sasaran_id)
                            }
                          >
                            {kegiatanMap[opt.indikator_renstra_id]?.loading
                              ? 'Memuat Kegiatan/Sub Kegiatan...'
                              : 'Lihat Kegiatan/Sub Kegiatan pendukung (Output) — sesuai Permenpan 53/2014'}
                          </Button>
                          {Array.isArray(kegiatanMap[opt.indikator_renstra_id]?.items) && (
                            <div className="mt-1">
                              {kegiatanMap[opt.indikator_renstra_id].items.length === 0 ? (
                                <Alert variant="light" className="py-1 small border mb-0">
                                  Belum ada Kegiatan/Sub Kegiatan yang terhubung ke Sasaran ini di
                                  Renstra.
                                </Alert>
                              ) : (
                                kegiatanMap[opt.indikator_renstra_id].items.map((k) => (
                                  <div
                                    key={k.indikator_kegiatan_id}
                                    className="d-flex justify-content-between align-items-center border rounded px-2 py-1 mb-1 small"
                                  >
                                    <span>
                                      <span className="text-muted">{k.nama_program} — </span>
                                      {k.nama_kegiatan}{' '}
                                      <Badge bg="secondary" className="ms-1">
                                        {k.target_tahun_ini ?? '-'} {k.satuan}
                                      </Badge>
                                    </span>
                                    <Button
                                      variant="outline-success"
                                      size="sm"
                                      onClick={() =>
                                        appendKegiatanToOutput(opt.indikator_renstra_id, k)
                                      }
                                    >
                                      + Tambah ke Output
                                    </Button>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </Card.Body>
          </Card>

          {/* Tata Kelola & Akuntabilitas */}
          <Card className="shadow-sm border-0 mb-3">
            <Card.Header className="bg-light fw-semibold py-2 small">
              Tata Kelola & Akuntabilitas (bukan sasaran teknis, dihitung otomatis)
            </Card.Header>
            <Card.Body>
              <Row className="g-3 mb-3">
                <Col md={6}>
                  <div className="small fw-semibold mb-1">
                    Serapan Anggaran (Realisasi live dari DPA/Penatausahaan)
                  </div>
                  {typeof pk?.tata_kelola?.serapan_anggaran?.persen === 'number' ? (
                    <ProgressBar
                      now={Math.min(pk.tata_kelola.serapan_anggaran.persen, 100)}
                      label={`${pk.tata_kelola.serapan_anggaran.persen}%`}
                      style={{ height: '20px' }}
                    />
                  ) : (
                    <Alert variant="light" className="py-1 small border mb-0">
                      Belum ada data DPA/realisasi untuk tahun {tahun}.
                    </Alert>
                  )}
                  <Form.Label className="small text-muted mt-2 mb-0">
                    Target {tahun} (komitmen, contoh: &ge; 95%)
                  </Form.Label>
                  <Form.Control
                    size="sm"
                    value={header.target_serapan_anggaran}
                    onChange={(e) =>
                      setHeader((h) => ({ ...h, target_serapan_anggaran: e.target.value }))
                    }
                  />
                </Col>
                <Col md={6}>
                  <div className="small fw-semibold mb-1">
                    Tindak Lanjut Temuan BPK (Realisasi live dari modul TLHP)
                  </div>
                  {typeof pk?.tata_kelola?.tl_bpk?.persen === 'number' ? (
                    <ProgressBar
                      now={Math.min(pk.tata_kelola.tl_bpk.persen, 100)}
                      label={`${pk.tata_kelola.tl_bpk.persen}%`}
                      variant="info"
                      style={{ height: '20px' }}
                    />
                  ) : (
                    <Alert variant="light" className="py-1 small border mb-0">
                      Belum ada Temuan BPK tahun {tahun} di modul TLHP.
                    </Alert>
                  )}
                  <Form.Label className="small text-muted mt-2 mb-0">
                    Target {tahun} (komitmen, contoh: 100%)
                  </Form.Label>
                  <Form.Control
                    size="sm"
                    value={header.target_tl_bpk}
                    onChange={(e) => setHeader((h) => ({ ...h, target_tl_bpk: e.target.value }))}
                  />
                </Col>
              </Row>

              <div className="small fw-semibold mb-1">
                Indeks Kepuasan Masyarakat (IKM) — Skor di bawah ini adalah Realisasi
              </div>
              <Row className="g-2">
                <Col md={2}>
                  <Form.Control
                    size="sm"
                    type="number"
                    step="0.01"
                    placeholder="Skor (Realisasi)"
                    value={ikm.skor}
                    onChange={(e) => setIkm((v) => ({ ...v, skor: e.target.value }))}
                  />
                </Col>
                <Col md={2}>
                  <Form.Control
                    size="sm"
                    placeholder={`Target ${tahun}`}
                    value={header.target_ikm}
                    onChange={(e) => setHeader((h) => ({ ...h, target_ikm: e.target.value }))}
                  />
                </Col>
                <Col md={4}>
                  <Form.Control
                    size="sm"
                    placeholder="Sumber survei"
                    value={ikm.sumber_survei}
                    onChange={(e) => setIkm((v) => ({ ...v, sumber_survei: e.target.value }))}
                  />
                </Col>
                <Col md={6}>
                  <Form.Control
                    size="sm"
                    placeholder="Keterangan"
                    value={ikm.keterangan}
                    onChange={(e) => setIkm((v) => ({ ...v, keterangan: e.target.value }))}
                  />
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Program & Anggaran */}
          <Card className="shadow-sm border-0 mb-3">
            <Card.Header className="bg-light fw-semibold py-2 small d-flex justify-content-between align-items-center">
              <span>Lampiran Program & Anggaran</span>
              <div className="d-flex gap-2">
                <Button
                  variant="outline-success"
                  size="sm"
                  onClick={autoFillProgramAnggaran}
                  disabled={autoFillingProgram}
                >
                  {autoFillingProgram ? (
                    <Spinner size="sm" animation="border" />
                  ) : (
                    'Auto-fill dari DPA'
                  )}
                </Button>
                <Button variant="outline-primary" size="sm" onClick={addProgramRow}>
                  <PlusCircle size={14} className="me-1" />
                  Tambah Baris
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              <Table size="sm" bordered responsive>
                <thead className="table-light">
                  <tr>
                    <th style={{ width: 40 }}>No</th>
                    <th>Program</th>
                    <th style={{ width: 220 }}>Jumlah Anggaran (Rp)</th>
                    <th style={{ width: 60 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {programAnggaran.map((row, idx) => (
                    <tr key={idx}>
                      <td className="text-center">{idx + 1}</td>
                      <td>
                        <Form.Control
                          size="sm"
                          value={row.nama_program}
                          onChange={(e) => updateProgramRow(idx, 'nama_program', e.target.value)}
                        />
                      </td>
                      <td>
                        <Form.Control
                          size="sm"
                          type="number"
                          value={row.jumlah_anggaran}
                          onChange={(e) => updateProgramRow(idx, 'jumlah_anggaran', e.target.value)}
                        />
                      </td>
                      <td className="text-center">
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => removeProgramRow(idx)}
                        >
                          <Trash size={12} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {programAnggaran.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center text-muted small">
                        Belum ada baris program.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>

          {/* Pasal-pasal */}
          <Card className="shadow-sm border-0 mb-3">
            <Card.Header className="bg-light fw-semibold py-2 small">
              Redaksi Pasal (default sudah terisi, bisa diedit)
            </Card.Header>
            <Card.Body>
              {PASAL_FIELDS.map((f) => (
                <Form.Group className="mb-3" key={f.key}>
                  <Form.Label className="small fw-semibold">{f.label}</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    size="sm"
                    value={pasal[f.key] || ''}
                    onChange={(e) => setPasal((p) => ({ ...p, [f.key]: e.target.value }))}
                  />
                </Form.Group>
              ))}
            </Card.Body>
          </Card>

          <div className="d-flex justify-content-end mb-4">
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Spinner size="sm" animation="border" className="me-1" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save size={14} className="me-1" />
                  Simpan Perjanjian Kinerja
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </Container>
  );
}
