import React, { useCallback, useEffect, useState } from 'react';
import { Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../../hooks/useAuth';
import { getProsnAntrianPemeriksaan, periksaProsnPengisian } from '../services/prosnpApi';

const REVIEW_ROLES = ['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS'];
const isReviewer = (role) => REVIEW_ROLES.includes(String(role || '').toUpperCase());

function buildDraft() {
  return { status_data: 'lengkap', status_bukti: 'lengkap', catatan_kekurangan: '' };
}

export default function ProsnPemeriksaanPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await getProsnAntrianPemeriksaan());
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Antrian pemeriksaan tidak dapat dimuat.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  if (!isReviewer(user?.role)) {
    return (
      <div className="container-fluid py-5 text-center text-muted">
        Halaman ini hanya untuk role Pemeriksa (PENGAWAS) atau Administrator.
      </div>
    );
  }

  const openRow = (row) => {
    setOpenId(row.id);
    setDrafts((prev) => ({ ...prev, [row.id]: prev[row.id] || buildDraft() }));
  };
  const setDraftField = (rowId, key, value) => {
    setDrafts((prev) => ({ ...prev, [rowId]: { ...prev[rowId], [key]: value } }));
  };

  const submit = async (row, hasil) => {
    const draft = drafts[row.id] || buildDraft();
    if (hasil === 'perlu_perbaikan' && !draft.catatan_kekurangan) {
      toast.error('Catatan kekurangan wajib diisi saat menolak/meminta perbaikan.');
      return;
    }
    setSavingId(row.id);
    try {
      await periksaProsnPengisian(row.id, {
        lock_version: row.lock_version,
        hasil,
        status_data: draft.status_data,
        status_bukti: draft.status_bukti,
        catatan_kekurangan: draft.catatan_kekurangan || null,
      });
      toast.success(
        hasil === 'lengkap' ? 'Pengisian disetujui (dicatat sebagai Lengkap).' : 'Pengisian dikembalikan untuk perbaikan.',
      );
      setOpenId(null);
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Pemeriksaan gagal disimpan.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="container-fluid py-3">
      <div className="mb-4">
        <Button variant="link" className="p-0 mb-1" onClick={() => navigate('/prosnp/periode')}>
          &larr; Kembali ke Daftar Periode
        </Button>
        <h2 className="mb-1 fw-bold" style={{ color: '#276749' }}>
          Antrian Pemeriksaan ProSN
        </h2>
        <p className="text-muted mb-0">
          Daftar pengisian berstatus Lengkap yang menunggu diperiksa. Menyetujui mencatat hasil pemeriksaan
          &ldquo;Lengkap&rdquo; (status pengisian tetap Lengkap); langkah &ldquo;Siap Diinput ProSN&rdquo; dilakukan
          terpisah oleh Petugas Input setelah pemeriksaan ini disetujui.
        </p>
      </div>

      <Card className="shadow-sm border-0">
        <Card.Body>
          {loading ? (
            <div className="text-center py-5">
              <Spinner />
            </div>
          ) : rows.length ? (
            <Table responsive hover className="align-middle mb-0">
              <thead>
                <tr>
                  <th>Periode</th>
                  <th>OPD</th>
                  <th>Indikator</th>
                  <th>Diisi</th>
                  <th className="text-end">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const periode = row.indikator?.periode;
                  const draft = drafts[row.id] || buildDraft();
                  const saving = savingId === row.id;
                  return (
                    <React.Fragment key={row.id}>
                      <tr>
                        <td>
                          <strong>{periode?.nama}</strong>
                          <div className="small text-muted">
                            Tahun {periode?.tahun} &middot; Semester {periode?.semester}
                          </div>
                        </td>
                        <td>{periode?.perangkatDaerah?.nama || '-'}</td>
                        <td>
                          <strong>{row.indikator?.kode}</strong> &mdash; {row.indikator?.nama}
                        </td>
                        <td className="small text-muted">
                          {row.diisi_at ? new Date(row.diisi_at).toLocaleDateString('id-ID') : '-'}
                        </td>
                        <td className="text-end">
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            className="me-2"
                            onClick={() => navigate(`/prosnp/periode/${periode?.id}`)}
                          >
                            Lihat Detail
                          </Button>
                          <Button size="sm" variant="primary" onClick={() => openRow(row)}>
                            Periksa
                          </Button>
                        </td>
                      </tr>
                      {openId === row.id && (
                        <tr>
                          <td colSpan="5" className="bg-light">
                            <Row className="g-2 align-items-end">
                              <Col md={3}>
                                <Form.Group>
                                  <Form.Label className="small mb-1">Status Data</Form.Label>
                                  <Form.Select
                                    size="sm"
                                    value={draft.status_data}
                                    onChange={(e) => setDraftField(row.id, 'status_data', e.target.value)}
                                  >
                                    <option value="lengkap">Lengkap</option>
                                    <option value="tidak_lengkap">Tidak Lengkap</option>
                                    <option value="tidak_valid">Tidak Valid</option>
                                  </Form.Select>
                                </Form.Group>
                              </Col>
                              <Col md={3}>
                                <Form.Group>
                                  <Form.Label className="small mb-1">Status Bukti</Form.Label>
                                  <Form.Select
                                    size="sm"
                                    value={draft.status_bukti}
                                    onChange={(e) => setDraftField(row.id, 'status_bukti', e.target.value)}
                                  >
                                    <option value="lengkap">Lengkap</option>
                                    <option value="tidak_lengkap">Tidak Lengkap</option>
                                    <option value="tidak_valid">Tidak Valid</option>
                                  </Form.Select>
                                </Form.Group>
                              </Col>
                              <Col md={4}>
                                <Form.Group>
                                  <Form.Label className="small mb-1">Catatan Kekurangan (wajib jika ditolak)</Form.Label>
                                  <Form.Control
                                    size="sm"
                                    value={draft.catatan_kekurangan}
                                    onChange={(e) => setDraftField(row.id, 'catatan_kekurangan', e.target.value)}
                                  />
                                </Form.Group>
                              </Col>
                              <Col md={2} className="d-flex gap-2">
                                <Button
                                  size="sm"
                                  variant="success"
                                  disabled={saving}
                                  onClick={() => submit(row, 'lengkap')}
                                >
                                  Setujui
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  disabled={saving}
                                  onClick={() => submit(row, 'perlu_perbaikan')}
                                >
                                  Tolak
                                </Button>
                              </Col>
                            </Row>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </Table>
          ) : (
            <div className="text-center text-muted py-4">
              Tidak ada pengisian yang menunggu diperiksa saat ini.
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
