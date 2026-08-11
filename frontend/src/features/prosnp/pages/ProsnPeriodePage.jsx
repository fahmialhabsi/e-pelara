import React, { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, Col, Form, Modal, Row, Spinner, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../../hooks/useAuth';
import {
  activateProsnPeriode,
  createProsnPeriode,
  exportProsnB13TemplateNasional,
  exportProsnExcel,
  getProsnKonteks,
  getProsnPeriode,
  initializeProsnIndikator,
  siapkanEksporProsnPeriode,
  updateProsnPeriode,
} from '../services/prosnpApi';

/**
 * Corrective "B.1.3 Period Cutoff Wiring" — turunan default tanggal_cutoff per
 * semester (30 Juni/31 Desember), SAMA PERSIS dgn `resolveDefaultCutoff` di
 * backend (`prosnpB13RuleEngine.js`) — murni utk mengisi default form,
 * backend tetap satu-satunya sumber kebenaran saat menyimpan.
 */
function defaultCutoffUntukSemester(tahun, semester) {
  if (!tahun) return '';
  if (String(semester) === '1') return `${tahun}-06-30`;
  if (String(semester) === '2') return `${tahun}-12-31`;
  return '';
}

const STATUS = { draft: 'secondary', aktif: 'success', terkunci: 'warning', siap_diekspor: 'success', diarsipkan: 'dark' };
const canManage = (role) =>
  ['SUPER_ADMIN', 'ADMINISTRATOR'].includes(String(role || '').toUpperCase());
const canReview = (role) =>
  ['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS'].includes(String(role || '').toUpperCase());

function ringkasanSkor(row) {
  const indikatorAktif = (row.indikators || []).filter((i) => i.aktif);
  const totalBobot = indikatorAktif.reduce((sum, i) => sum + (Number(i.bobot_maksimal) || 0), 0);
  const totalSkor = indikatorAktif.reduce((sum, i) => sum + (Number(i.pengisian?.skor_indikatif_internal) || 0), 0);
  const jumlahDiperiksa = indikatorAktif.filter((i) => i.pengisian?.status === 'diperiksa').length;
  const jumlahBermasalah = indikatorAktif.filter((i) => i.pengisian?.skor_indikatif_internal !== null && Number(i.pengisian?.skor_indikatif_internal) === 0).length;
  return { totalBobot, totalSkor, jumlahDiperiksa, jumlahBermasalah, totalIndikator: indikatorAktif.length };
}

export default function ProsnPeriodePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [konteks, setKonteks] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    tahun: String(new Date().getFullYear()),
    semester: 'tahunan',
    nama: 'Kertas Kerja ProSN',
    perangkat_daerah_id: '',
    tanggal_mulai: '',
    tanggal_tenggat: '',
    tanggal_cutoff: '',
  });
  const [editCutoffRow, setEditCutoffRow] = useState(null);
  const [editCutoffForm, setEditCutoffForm] = useState({ tanggal_tenggat: '', tanggal_cutoff: '' });
  const [savingCutoff, setSavingCutoff] = useState(false);
  const editable = canManage(user?.role);

  const setSemester = (semester) => {
    setForm((current) => ({ ...current, semester, tanggal_cutoff: defaultCutoffUntukSemester(current.tahun, semester) }));
  };
  const setTahun = (tahun) => {
    setForm((current) => ({ ...current, tahun, tanggal_cutoff: defaultCutoffUntukSemester(tahun, current.semester) }));
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await getProsnPeriode());
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Periode ProSN belum dapat dimuat.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    getProsnKonteks()
      .then((data) => {
        setKonteks(data);
        setForm((current) => ({
          ...current,
          perangkat_daerah_id: String(data.perangkat_daerah_id),
        }));
      })
      .catch(() => setKonteks(null));
  }, []);

  const create = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await createProsnPeriode({ ...form, perangkat_daerah_id: Number(form.perangkat_daerah_id) });
      toast.success('Periode draft berhasil dibuat.');
      setShowModal(false);
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Periode gagal dibuat.');
    } finally {
      setSaving(false);
    }
  };
  const activate = async (row) => {
    if (
      !window.confirm(
        `Aktifkan periode “${row.nama}”? Pengisian kosong akan dibuat untuk seluruh indikator aktif.`,
      )
    )
      return;
    try {
      await activateProsnPeriode(row.id);
      toast.success('Periode berhasil diaktifkan.');
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Periode belum dapat diaktifkan.');
    }
  };
  const initialize = async (row) => {
    try {
      await initializeProsnIndikator(row.id);
      toast.success('Indikator B.1.1-B.1.4 berhasil diinisialisasi.');
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Indikator belum dapat diinisialisasi.');
    }
  };
  const openEditCutoff = (row) => {
    setEditCutoffRow(row);
    setEditCutoffForm({ tanggal_tenggat: row.tanggal_tenggat || '', tanggal_cutoff: row.tanggal_cutoff || '' });
  };
  const saveEditCutoff = async (event) => {
    event.preventDefault();
    setSavingCutoff(true);
    try {
      await updateProsnPeriode(editCutoffRow.id, editCutoffForm);
      toast.success('Tanggal cutoff/tenggat periode berhasil disimpan.');
      setEditCutoffRow(null);
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Tanggal cutoff/tenggat gagal disimpan.');
    } finally {
      setSavingCutoff(false);
    }
  };
  const siapkanEkspor = async (row) => {
    if (!window.confirm(`Tandai periode "${row.nama}" siap ekspor? Seluruh indikator aktif harus sudah berstatus Diperiksa.`)) return;
    try {
      await siapkanEksporProsnPeriode(row.id);
      toast.success('Periode ditandai siap ekspor.');
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Periode belum dapat ditandai siap ekspor.');
    }
  };
  const downloadExcel = async (row) => {
    try {
      const response = await exportProsnExcel(row.id);
      const url = URL.createObjectURL(new Blob([response.data]));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `ProSN-${row.tahun}-${row.semester}.xlsx`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Ekspor Excel gagal.');
    }
  };
  const downloadB13Template = async (row) => {
    try {
      const response = await exportProsnB13TemplateNasional(row.id);
      const url = URL.createObjectURL(new Blob([response.data]));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Tabel_B.1.3_${row.tahun}-${row.semester}.xlsx`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Ekspor template nasional B.1.3 gagal — pastikan skor B.1.3 sudah dihitung ulang dan target sudah diisi.');
    }
  };

  return (
    <div className="container-fluid py-3">
      <div className="d-flex flex-wrap gap-3 align-items-center justify-content-between mb-4">
        <div>
          <h2 className="mb-1 fw-bold" style={{ color: '#276749' }}>
            ProSN e-Pelara
          </h2>
          <p className="text-muted mb-0">
            Kertas kerja internal, pemeriksaan, dan kesiapan input ProSN.
          </p>
        </div>
        <div className="d-flex gap-2">
          {canReview(user?.role) && (
            <Button variant="outline-primary" onClick={() => navigate('/prosnp/pemeriksaan')}>
              Antrian Pemeriksaan
            </Button>
          )}
          {editable && (
            <Button
              style={{ backgroundColor: '#276749', borderColor: '#276749' }}
              onClick={() => setShowModal(true)}
            >
              + Buat Periode
            </Button>
          )}
        </div>
      </div>
      <Row className="mb-4">
        <Col md={4}>
          <Card className="shadow-sm border-0">
            <Card.Body>
              <div className="text-muted small">Total Periode</div>
              <div className="fs-2 fw-bold" style={{ color: '#276749' }}>
                {rows.length}
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="shadow-sm border-0">
            <Card.Body>
              <div className="text-muted small">Periode Aktif</div>
              <div className="fs-2 fw-bold text-success">
                {rows.filter((item) => item.status === 'aktif').length}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <Card className="shadow-sm border-0">
        <Card.Body>
          {loading ? (
            <div className="text-center py-5">
              <Spinner />
            </div>
          ) : (
            <Table responsive hover className="align-middle mb-0">
              <thead>
                <tr>
                  <th>Periode</th>
                  <th>Tahun</th>
                  <th>OPD</th>
                  <th>Indikator</th>
                  <th>Skor Indikatif</th>
                  <th>Status</th>
                  <th className="text-end">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.length ? (
                  rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <Button
                          variant="link"
                          className="p-0 text-start fw-bold"
                          style={{ color: '#276749' }}
                          onClick={() => navigate(`/prosnp/periode/${row.id}`)}
                        >
                          {row.nama}
                        </Button>
                        <div className="small text-muted">Semester {row.semester}</div>
                      </td>
                      <td>{row.tahun}</td>
                      <td>{row.perangkatDaerah?.nama || row.perangkat_daerah_id}</td>
                      <td>{row.indikators?.length || 0}</td>
                      <td>
                        {(() => {
                          const r = ringkasanSkor(row);
                          return (
                            <div>
                              <strong>{r.totalSkor.toFixed(2)}</strong> / {r.totalBobot.toFixed(2)}
                              <div className="small text-muted">
                                {r.jumlahDiperiksa}/{r.totalIndikator} diperiksa
                                {r.jumlahBermasalah > 0 && <span className="text-danger"> · {r.jumlahBermasalah} skor 0</span>}
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      <td>
                        <Badge bg={STATUS[row.status] || 'secondary'}>{row.status}</Badge>
                      </td>
                      <td className="text-end">
                        {editable && (
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            className="me-2"
                            onClick={() => openEditCutoff(row)}
                            title="Ubah tanggal cutoff data / tenggat pengisian"
                          >
                            Cutoff
                          </Button>
                        )}
                        {row.status === 'aktif' && canManage(user?.role) && (
                          <Button
                            size="sm"
                            variant="outline-success"
                            className="me-2"
                            onClick={() => siapkanEkspor(row)}
                          >
                            Tandai Siap Ekspor
                          </Button>
                        )}
                        {row.status === 'aktif' && (
                          <Button
                            size="sm"
                            variant="success"
                            className="me-2"
                            onClick={() => navigate(`/prosnp/periode/${row.id}`)}
                          >
                            Isi Data
                          </Button>
                        )}
                        {row.status === 'draft' &&
                          editable &&
                          (row.indikators?.length ? (
                            <Button
                              size="sm"
                              variant="outline-success"
                              className="me-2"
                              onClick={() => activate(row)}
                            >
                              Aktifkan
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline-warning"
                              className="me-2"
                              onClick={() => initialize(row)}
                            >
                              Siapkan Indikator
                            </Button>
                          ))}
                        <Button
                          size="sm"
                          variant="outline-secondary"
                          className="me-2"
                          onClick={() => downloadExcel(row)}
                        >
                          Excel
                        </Button>
                        <Button
                          size="sm"
                          variant="outline-success"
                          onClick={() => downloadB13Template(row)}
                          title="Ekspor Template Nasional B.1.3 (Tabel Cadangan Pangan Beras, format resmi)"
                        >
                          Template B.1.3
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center text-muted py-4">
                      Belum ada periode ProSN.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Form onSubmit={create}>
          <Modal.Header closeButton>
            <Modal.Title>Buat Periode ProSN</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Tahun</Form.Label>
                  <Form.Control
                    required
                    value={form.tahun}
                    onChange={(e) => setTahun(e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Semester</Form.Label>
                  <Form.Select
                    value={form.semester}
                    onChange={(e) => setSemester(e.target.value)}
                  >
                    <option value="tahunan">Tahunan</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Nama periode</Form.Label>
              <Form.Control
                required
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Perangkat Daerah</Form.Label>
              <Form.Control
                readOnly
                value={
                  konteks
                    ? `${konteks.perangkat_daerah_nama} (ID: ${konteks.perangkat_daerah_id})`
                    : 'Memuat pemetaan OPD…'
                }
                isInvalid={!konteks}
              />
              <Form.Text className="text-muted">
                Diisi otomatis dari profil pengguna dan tidak dapat diubah pada form ini.
              </Form.Text>
            </Form.Group>
            <Row>
              <Col>
                <Form.Group>
                  <Form.Label>Tanggal mulai</Form.Label>
                  <Form.Control
                    required
                    type="date"
                    value={form.tanggal_mulai}
                    onChange={(e) => setForm({ ...form, tanggal_mulai: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>Tenggat</Form.Label>
                  <Form.Control
                    required
                    type="date"
                    value={form.tanggal_tenggat}
                    onChange={(e) => setForm({ ...form, tanggal_tenggat: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mt-3">
              <Form.Label>Tanggal Cutoff Data</Form.Label>
              <Form.Control
                type="date"
                value={form.tanggal_cutoff}
                onChange={(e) => setForm({ ...form, tanggal_cutoff: e.target.value })}
              />
              <Form.Text className="text-muted">
                Batas tanggal data yang diperhitungkan dalam periode penilaian. Berbeda dari tenggat internal pengisian.
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" onClick={() => setShowModal(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              disabled={saving || !konteks}
              style={{ backgroundColor: '#276749', borderColor: '#276749' }}
            >
              {saving ? 'Menyimpan…' : 'Simpan Draft'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
      <Modal show={!!editCutoffRow} onHide={() => setEditCutoffRow(null)}>
        <Form onSubmit={saveEditCutoff}>
          <Modal.Header closeButton>
            <Modal.Title>Cutoff &amp; Tenggat — {editCutoffRow?.nama}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Tenggat (administratif)</Form.Label>
              <Form.Control
                required
                type="date"
                value={editCutoffForm.tanggal_tenggat}
                onChange={(e) => setEditCutoffForm({ ...editCutoffForm, tanggal_tenggat: e.target.value })}
              />
              <Form.Text className="text-muted">Batas waktu OPD menyelesaikan pengisian data.</Form.Text>
            </Form.Group>
            <Form.Group>
              <Form.Label>Tanggal Cutoff Data</Form.Label>
              <Form.Control
                type="date"
                value={editCutoffForm.tanggal_cutoff}
                onChange={(e) => setEditCutoffForm({ ...editCutoffForm, tanggal_cutoff: e.target.value })}
              />
              <Form.Text className="text-muted">
                Batas tanggal data yang diperhitungkan dalam periode penilaian. Berbeda dari tenggat internal pengisian.
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" onClick={() => setEditCutoffRow(null)}>
              Batal
            </Button>
            <Button type="submit" disabled={savingCutoff} style={{ backgroundColor: '#276749', borderColor: '#276749' }}>
              {savingCutoff ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}
