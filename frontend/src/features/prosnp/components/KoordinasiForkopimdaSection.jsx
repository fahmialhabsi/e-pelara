import React, { useEffect, useState } from 'react';
import { Badge, Button, Col, Form, Modal, Row, Table } from 'react-bootstrap';
import { toast } from 'react-toastify';
import {
  createProsnRapatForkopimda,
  deleteProsnRapatForkopimda,
  getProsnRapatForkopimda,
  updateProsnRapatForkopimda,
} from '../services/prosnpApi';
import ProsnSkorIndikatifCard from './ProsnSkorIndikatifCard';
import EntityBuktiManager from './EntityBuktiManager';
import ProsnAutofillModal from './ProsnAutofillModal';

const STATUS_TL_LABEL = { belum_ditindaklanjuti: 'Belum Ditindaklanjuti', sedang_diproses: 'Sedang Diproses', selesai: 'Selesai' };
const UNSUR_FORKOPIMDA = ['Gubernur/Wakil Gubernur', 'Kapolda', 'Danrem/Dandim', 'Kajati/Kajari', 'Ketua Pengadilan', 'Ketua DPRD'];

function emptyForm() {
  return {
    tanggal_rapat: '', nama_forum: '', jenis_forum: '', is_forkopimda: true, pimpinan_rapat: '', lokasi: '',
    unsur_forkopimda_hadir: [], instansi_lain_hadir: '', topik_pengadaan: false, topik_pengelolaan: false, topik_penyaluran: false,
    agenda: '', masalah: '', keputusan: '', tindak_lanjut: '', penanggung_jawab_tindak_lanjut: '', batas_waktu_tindak_lanjut: '',
    status_tindak_lanjut: 'belum_ditindaklanjuti', sub_kegiatan_pendukung: '', materi: '',
  };
}

export default function KoordinasiForkopimdaSection({ indikator, pengisian, editable, canReview, onChanged }) {
  const [rapatList, setRapatList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setRapatList(await getProsnRapatForkopimda(pengisian.id)); }
    catch { toast.error('Gagal memuat register rapat Forkopimda.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [pengisian.id]);

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setShowModal(true); };
  const openEdit = (rapat) => {
    setEditing(rapat);
    setForm({ ...emptyForm(), ...rapat, unsur_forkopimda_hadir: rapat.unsur_forkopimda_hadir || [], lock_version: rapat.lock_version });
    setShowModal(true);
  };
  const toggleUnsur = (nama) => setForm((prev) => ({
    ...prev,
    unsur_forkopimda_hadir: prev.unsur_forkopimda_hadir.includes(nama)
      ? prev.unsur_forkopimda_hadir.filter((u) => u !== nama)
      : [...prev.unsur_forkopimda_hadir, nama],
  }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) await updateProsnRapatForkopimda(editing.id, form);
      else await createProsnRapatForkopimda(pengisian.id, form);
      toast.success('Rapat Forkopimda tersimpan.');
      setShowModal(false);
      await load();
      await onChanged();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Gagal menyimpan rapat.');
    } finally {
      setSaving(false);
    }
  };
  const remove = async (rapat) => {
    if (!window.confirm(`Hapus rapat "${rapat.nama_forum}"?`)) return;
    try { await deleteProsnRapatForkopimda(rapat.id); toast.success('Rapat dihapus.'); await load(); await onChanged(); }
    catch (error) { toast.error(error?.response?.data?.message || 'Gagal menghapus.'); }
  };

  return (
    <div>
      <ProsnSkorIndikatifCard
        pengisianId={pengisian.id} bobotMaksimal={indikator.bobot_maksimal}
        skor={pengisian.skor_indikatif_internal} alasan={pengisian.skor_alasan} dihitungAt={pengisian.skor_dihitung_at}
        onChanged={async () => { await load(); await onChanged(); }}
      />
      <div className="d-flex justify-content-between align-items-center mb-2">
        <strong>Register Rapat Koordinasi Forkopimda</strong>
        {editable && (
          <div className="d-flex gap-2">
            <ProsnAutofillModal pengisianId={pengisian.id} entityType="RAPAT_FORKOPIMDA" onApplied={async () => { await load(); await onChanged(); }} />
            <Button size="sm" onClick={openCreate}>+ Tambah Rapat</Button>
          </div>
        )}
      </div>
      {loading ? <div className="text-muted small">Memuat…</div> : rapatList.length ? (
        <Table size="sm" responsive className="align-middle">
          <thead><tr><th>Forum</th><th>Tanggal</th><th>Forkopimda</th><th>Topik</th><th>Bukti</th>{editable && <th />}</tr></thead>
          <tbody>
            {rapatList.map((rapat) => (
              <tr key={rapat.id}>
                <td>{rapat.nama_forum}<div className="small text-muted">{rapat.pimpinan_rapat}</div></td>
                <td>{new Date(rapat.tanggal_rapat).toLocaleDateString('id-ID')}</td>
                <td>{rapat.is_forkopimda ? <Badge bg="success">Ya</Badge> : <Badge bg="secondary">Bukan</Badge>}</td>
                <td>
                  {rapat.topik_pengadaan && <Badge bg="info" className="me-1">Pengadaan</Badge>}
                  {rapat.topik_pengelolaan && <Badge bg="info" className="me-1">Pengelolaan</Badge>}
                  {rapat.topik_penyaluran && <Badge bg="info">Penyaluran</Badge>}
                </td>
                <td>
                  <EntityBuktiManager
                    pengisianId={pengisian.id} entityType="RAPAT_FORKOPIMDA" entityId={rapat.id}
                    kategoriPilihan={['undangan', 'daftar_hadir', 'notulen', 'dokumentasi', 'berita_acara']}
                    canUpload={editable} canReview={canReview}
                  />
                </td>
                {editable && (
                  <td className="text-nowrap">
                    <Button size="sm" variant="outline-secondary" className="me-1" onClick={() => openEdit(rapat)}>Edit</Button>
                    <Button size="sm" variant="outline-danger" onClick={() => remove(rapat)}>Hapus</Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </Table>
      ) : <div className="text-muted small mb-2">Belum ada rapat Forkopimda dicatat.</div>}

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" scrollable>
        <Form onSubmit={submit}>
          <Modal.Header closeButton><Modal.Title>{editing ? 'Ubah' : 'Tambah'} Rapat Forkopimda</Modal.Title></Modal.Header>
          <Modal.Body>
            <Row>
              <Col md={6}><Form.Group className="mb-2"><Form.Label>Tanggal Rapat *</Form.Label><Form.Control required type="date" value={form.tanggal_rapat} onChange={(e) => setForm({ ...form, tanggal_rapat: e.target.value })} /></Form.Group></Col>
              <Col md={6}><Form.Group className="mb-2"><Form.Label>Nama Forum *</Form.Label><Form.Control required value={form.nama_forum} onChange={(e) => setForm({ ...form, nama_forum: e.target.value })} /></Form.Group></Col>
              <Col md={6}><Form.Group className="mb-2"><Form.Label>Jenis Forum</Form.Label><Form.Control value={form.jenis_forum} onChange={(e) => setForm({ ...form, jenis_forum: e.target.value })} /></Form.Group></Col>
              <Col md={6}><Form.Group className="mb-2"><Form.Label>Pimpinan Rapat</Form.Label><Form.Control value={form.pimpinan_rapat} onChange={(e) => setForm({ ...form, pimpinan_rapat: e.target.value })} /></Form.Group></Col>
              <Col md={6}><Form.Group className="mb-2"><Form.Label>Lokasi</Form.Label><Form.Control value={form.lokasi} onChange={(e) => setForm({ ...form, lokasi: e.target.value })} /></Form.Group></Col>
              <Col md={6} className="d-flex align-items-end mb-2">
                <Form.Check label="Ini adalah rapat Forkopimda" checked={form.is_forkopimda} onChange={(e) => setForm({ ...form, is_forkopimda: e.target.checked })} />
              </Col>
            </Row>
            <Form.Group className="mb-2">
              <Form.Label>Unsur Forkopimda yang Hadir</Form.Label>
              <div className="d-flex flex-wrap gap-3">
                {UNSUR_FORKOPIMDA.map((u) => (
                  <Form.Check key={u} label={u} checked={form.unsur_forkopimda_hadir.includes(u)} onChange={() => toggleUnsur(u)} />
                ))}
              </div>
            </Form.Group>
            <Form.Group className="mb-2"><Form.Label>Instansi Lain yang Hadir</Form.Label><Form.Control value={form.instansi_lain_hadir} onChange={(e) => setForm({ ...form, instansi_lain_hadir: e.target.value })} /></Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Topik ProSN * (pilih minimal satu)</Form.Label>
              <div className="d-flex gap-3">
                <Form.Check label="Pengadaan" checked={form.topik_pengadaan} onChange={(e) => setForm({ ...form, topik_pengadaan: e.target.checked })} />
                <Form.Check label="Pengelolaan" checked={form.topik_pengelolaan} onChange={(e) => setForm({ ...form, topik_pengelolaan: e.target.checked })} />
                <Form.Check label="Penyaluran" checked={form.topik_penyaluran} onChange={(e) => setForm({ ...form, topik_penyaluran: e.target.checked })} />
              </div>
            </Form.Group>
            <Row>
              <Col md={6}><Form.Group className="mb-2"><Form.Label>Agenda</Form.Label><Form.Control as="textarea" rows={2} value={form.agenda} onChange={(e) => setForm({ ...form, agenda: e.target.value })} /></Form.Group></Col>
              <Col md={6}><Form.Group className="mb-2"><Form.Label>Masalah</Form.Label><Form.Control as="textarea" rows={2} value={form.masalah} onChange={(e) => setForm({ ...form, masalah: e.target.value })} /></Form.Group></Col>
              <Col md={6}><Form.Group className="mb-2"><Form.Label>Keputusan</Form.Label><Form.Control as="textarea" rows={2} value={form.keputusan} onChange={(e) => setForm({ ...form, keputusan: e.target.value })} /></Form.Group></Col>
              <Col md={6}><Form.Group className="mb-2"><Form.Label>Tindak Lanjut</Form.Label><Form.Control as="textarea" rows={2} value={form.tindak_lanjut} onChange={(e) => setForm({ ...form, tindak_lanjut: e.target.value })} /></Form.Group></Col>
              <Col md={6}><Form.Group className="mb-2"><Form.Label>Penanggung Jawab Tindak Lanjut</Form.Label><Form.Control value={form.penanggung_jawab_tindak_lanjut} onChange={(e) => setForm({ ...form, penanggung_jawab_tindak_lanjut: e.target.value })} /></Form.Group></Col>
              <Col md={6}><Form.Group className="mb-2"><Form.Label>Batas Waktu Tindak Lanjut</Form.Label><Form.Control type="date" value={form.batas_waktu_tindak_lanjut} onChange={(e) => setForm({ ...form, batas_waktu_tindak_lanjut: e.target.value })} /></Form.Group></Col>
              <Col md={6}>
                <Form.Group className="mb-2">
                  <Form.Label>Status Tindak Lanjut</Form.Label>
                  <Form.Select value={form.status_tindak_lanjut} onChange={(e) => setForm({ ...form, status_tindak_lanjut: e.target.value })}>
                    {Object.entries(STATUS_TL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}><Form.Group className="mb-2"><Form.Label>Sub Kegiatan Pendukung</Form.Label><Form.Control value={form.sub_kegiatan_pendukung} onChange={(e) => setForm({ ...form, sub_kegiatan_pendukung: e.target.value })} /></Form.Group></Col>
            </Row>
            <Form.Group className="mb-2"><Form.Label>Materi</Form.Label><Form.Control as="textarea" rows={2} value={form.materi} onChange={(e) => setForm({ ...form, materi: e.target.value })} /></Form.Group>
            <div className="small text-muted">Undangan, daftar hadir, dan notulen diunggah lewat bagian Bukti Dukung di bawah (kategori: Undangan/Daftar Hadir/Notulen) — rapat baru dihitung sah bila bukti tersebut tersedia dan valid.</div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" onClick={() => setShowModal(false)}>Batal</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}
