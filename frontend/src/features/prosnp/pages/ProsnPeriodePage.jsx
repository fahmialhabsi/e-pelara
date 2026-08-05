import React, { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, Col, Form, Modal, Row, Spinner, Table } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useAuth } from '../../../hooks/useAuth';
import { activateProsnPeriode, createProsnPeriode, exportProsnExcel, getProsnKonteks, getProsnPeriode, initializeProsnIndikator } from '../services/prosnpApi';

const STATUS = { draft: 'secondary', aktif: 'success', terkunci: 'warning', diarsipkan: 'dark' };
const canManage = (role) => ['SUPER_ADMIN', 'ADMINISTRATOR'].includes(String(role || '').toUpperCase());

export default function ProsnPeriodePage() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [konteks, setKonteks] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ tahun: String(new Date().getFullYear()), semester: 'tahunan', nama: 'Kertas Kerja ProSN', perangkat_daerah_id: '', tanggal_mulai: '', tanggal_tenggat: '' });
  const editable = canManage(user?.role);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await getProsnPeriode()); }
    catch (error) { toast.error(error?.response?.data?.message || 'Periode ProSN belum dapat dimuat.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { getProsnKonteks().then((data) => { setKonteks(data); setForm((current) => ({ ...current, perangkat_daerah_id: String(data.perangkat_daerah_id) })); }).catch(() => setKonteks(null)); }, []);

  const create = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await createProsnPeriode({ ...form, perangkat_daerah_id: Number(form.perangkat_daerah_id) });
      toast.success('Periode draft berhasil dibuat.'); setShowModal(false); await load();
    } catch (error) { toast.error(error?.response?.data?.message || 'Periode gagal dibuat.'); }
    finally { setSaving(false); }
  };
  const activate = async (row) => {
    if (!window.confirm(`Aktifkan periode “${row.nama}”? Pengisian kosong akan dibuat untuk seluruh indikator aktif.`)) return;
    try { await activateProsnPeriode(row.id); toast.success('Periode berhasil diaktifkan.'); await load(); }
    catch (error) { toast.error(error?.response?.data?.message || 'Periode belum dapat diaktifkan.'); }
  };
  const initialize = async (row) => {
    try { await initializeProsnIndikator(row.id); toast.success('Indikator B.1.1-B.1.4 berhasil diinisialisasi.'); await load(); }
    catch (error) { toast.error(error?.response?.data?.message || 'Indikator belum dapat diinisialisasi.'); }
  };
  const downloadExcel = async (row) => {
    try {
      const response = await exportProsnExcel(row.id);
      const url = URL.createObjectURL(new Blob([response.data]));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = `ProSN-${row.tahun}-${row.semester}.xlsx`; anchor.click(); URL.revokeObjectURL(url);
    } catch (error) { toast.error(error?.response?.data?.message || 'Ekspor Excel gagal.'); }
  };

  return <div className="container-fluid py-3">
    <div className="d-flex flex-wrap gap-3 align-items-center justify-content-between mb-4">
      <div><h2 className="mb-1 fw-bold" style={{ color: '#276749' }}>ProSN e-Pelara</h2><p className="text-muted mb-0">Kertas kerja internal, pemeriksaan, dan kesiapan input ProSN.</p></div>
      {editable && <Button style={{ backgroundColor: '#276749', borderColor: '#276749' }} onClick={() => setShowModal(true)}>+ Buat Periode</Button>}
    </div>
    <Row className="mb-4"><Col md={4}><Card className="shadow-sm border-0"><Card.Body><div className="text-muted small">Total Periode</div><div className="fs-2 fw-bold" style={{ color: '#276749' }}>{rows.length}</div></Card.Body></Card></Col><Col md={4}><Card className="shadow-sm border-0"><Card.Body><div className="text-muted small">Periode Aktif</div><div className="fs-2 fw-bold text-success">{rows.filter((item) => item.status === 'aktif').length}</div></Card.Body></Card></Col></Row>
    <Card className="shadow-sm border-0"><Card.Body>{loading ? <div className="text-center py-5"><Spinner /></div> : <Table responsive hover className="align-middle mb-0"><thead><tr><th>Periode</th><th>Tahun</th><th>OPD</th><th>Indikator</th><th>Status</th><th className="text-end">Aksi</th></tr></thead><tbody>{rows.length ? rows.map((row) => <tr key={row.id}><td><strong>{row.nama}</strong><div className="small text-muted">Semester {row.semester}</div></td><td>{row.tahun}</td><td>{row.perangkatDaerah?.nama || row.perangkat_daerah_id}</td><td>{row.indikators?.length || 0}</td><td><Badge bg={STATUS[row.status] || 'secondary'}>{row.status}</Badge></td><td className="text-end">{row.status === 'draft' && editable && (row.indikators?.length ? <Button size="sm" variant="outline-success" className="me-2" onClick={() => activate(row)}>Aktifkan</Button> : <Button size="sm" variant="outline-warning" className="me-2" onClick={() => initialize(row)}>Siapkan Indikator</Button>)}<Button size="sm" variant="outline-secondary" onClick={() => downloadExcel(row)}>Excel</Button></td></tr>) : <tr><td colSpan="6" className="text-center text-muted py-4">Belum ada periode ProSN.</td></tr>}</tbody></Table>}</Card.Body></Card>
    <Modal show={showModal} onHide={() => setShowModal(false)}><Form onSubmit={create}><Modal.Header closeButton><Modal.Title>Buat Periode ProSN</Modal.Title></Modal.Header><Modal.Body><Row><Col md={6}><Form.Group className="mb-3"><Form.Label>Tahun</Form.Label><Form.Control required value={form.tahun} onChange={(e) => setForm({ ...form, tahun: e.target.value })} /></Form.Group></Col><Col md={6}><Form.Group className="mb-3"><Form.Label>Semester</Form.Label><Form.Select value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })}><option value="tahunan">Tahunan</option><option value="1">1</option><option value="2">2</option></Form.Select></Form.Group></Col></Row><Form.Group className="mb-3"><Form.Label>Nama periode</Form.Label><Form.Control required value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} /></Form.Group><Form.Group className="mb-3"><Form.Label>Perangkat Daerah</Form.Label><Form.Control readOnly value={konteks ? `${konteks.perangkat_daerah_nama} (ID: ${konteks.perangkat_daerah_id})` : 'Memuat pemetaan OPD…'} isInvalid={!konteks} /><Form.Text className="text-muted">Diisi otomatis dari profil pengguna dan tidak dapat diubah pada form ini.</Form.Text></Form.Group><Row><Col><Form.Group><Form.Label>Tanggal mulai</Form.Label><Form.Control required type="date" value={form.tanggal_mulai} onChange={(e) => setForm({ ...form, tanggal_mulai: e.target.value })} /></Form.Group></Col><Col><Form.Group><Form.Label>Tenggat</Form.Label><Form.Control required type="date" value={form.tanggal_tenggat} onChange={(e) => setForm({ ...form, tanggal_tenggat: e.target.value })} /></Form.Group></Col></Row></Modal.Body><Modal.Footer><Button variant="light" onClick={() => setShowModal(false)}>Batal</Button><Button type="submit" disabled={saving || !konteks} style={{ backgroundColor: '#276749', borderColor: '#276749' }}>{saving ? 'Menyimpan…' : 'Simpan Draft'}</Button></Modal.Footer></Form></Modal>
  </div>;
}
